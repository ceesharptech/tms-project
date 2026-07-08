const express = require("express");
const db = require("../utils/db");
const { isLocal } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
// const { sendOffenceNotification } = require("../services/emailService");

const router = express.Router();
router.use(authenticateToken);

function logError(endpoint, ctx, err) {
  console.error(`[${endpoint}]`, ctx, err.message || err);
}

// ── POST /api/offences/calculate-penalty ─────────────────────────────────────
// Preview penalty calculation without creating an offence record.
router.post(
  "/calculate-penalty",
  requireRole(["officer", "admin"]),
  async (req, res) => {
    try {
      const { driver_id, offence_type_id } = req.body;

      if (!driver_id || !offence_type_id) {
        return res.status(400).json({
          error: true,
          message: "driver_id and offence_type_id are required",
          code: "VALIDATION_ERROR",
        });
      }

      // Fetch driver
      let driver, driverErr;

      if (isLocal) {
        const result = await db.query(
          `SELECT id, strike_count, status FROM drivers WHERE id = $1`,
          [driver_id]
        );
        driver = result.rows[0] || null;
        if (!driver) driverErr = { message: "not found" };
      } else {
        const res2 = await db
          .from("drivers")
          .select("id, strike_count, status")
          .eq("id", driver_id)
          .single();
        driver = res2.data;
        driverErr = res2.error;
      }

      if (driverErr || !driver) {
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "DRIVER_NOT_FOUND",
        });
      }

      // Fetch offence type
      let offenceType, otErr;

      if (isLocal) {
        const result = await db.query(
          `SELECT id, name, base_fine, strike_weight, severity, is_active
           FROM offence_types WHERE id = $1`,
          [offence_type_id]
        );
        offenceType = result.rows[0] || null;
        if (!offenceType) otErr = { message: "not found" };
      } else {
        const res2 = await db
          .from("offence_types")
          .select("id, name, base_fine, strike_weight, severity, is_active")
          .eq("id", offence_type_id)
          .single();
        offenceType = res2.data;
        otErr = res2.error;
      }

      if (otErr || !offenceType) {
        return res.status(404).json({
          error: true,
          message: "Offence type not found",
          code: "OFFENCE_TYPE_NOT_FOUND",
        });
      }

      if (!offenceType.is_active) {
        return res.status(400).json({
          error: true,
          message: `Offence type "${offenceType.name}" is no longer active`,
          code: "OFFENCE_TYPE_INACTIVE",
        });
      }

      const newStrikeCount = driver.strike_count + offenceType.strike_weight;

      // Find matching penalty rule
      let rules, ruleErr;

      if (isLocal) {
        const result = await db.query(
          `SELECT min_strikes, max_strikes, fine_multiplier, status_flag
           FROM penalty_rules
           WHERE $1 BETWEEN min_strikes AND max_strikes
           LIMIT 1`,
          [newStrikeCount]
        );
        rules = result.rows;
      } else {
        const res2 = await db
          .from("penalty_rules")
          .select("min_strikes, max_strikes, fine_multiplier, status_flag")
          .lte("min_strikes", newStrikeCount)
          .gte("max_strikes", newStrikeCount)
          .limit(1);
        rules = res2.data;
        ruleErr = res2.error;
      }

      if (ruleErr || !rules || rules.length === 0) {
        return res.status(422).json({
          error: true,
          message: `No penalty rule configured for ${newStrikeCount} strikes. Contact administrator.`,
          code: "NO_PENALTY_RULE",
        });
      }

      const rule = rules[0];
      const multiplier = parseFloat(rule.fine_multiplier);
      const finalFine = parseFloat(
        (parseFloat(offenceType.base_fine) * multiplier).toFixed(2),
      );

      return res.json({
        success: true,
        data: {
          base_fine: parseFloat(offenceType.base_fine),
          multiplier,
          final_fine: finalFine,
          offence_type_name: offenceType.name,
          severity: offenceType.severity,
          current_strikes: driver.strike_count,
          strike_delta: offenceType.strike_weight,
          new_strikes: newStrikeCount,
          current_status: driver.status,
          new_status: rule.status_flag,
          tier_changed: driver.status !== rule.status_flag,
        },
      });
    } catch (err) {
      logError("POST /api/offences/calculate-penalty", {}, err);
      return res.status(500).json({
        error: true,
        message: "Failed to calculate penalty",
        code: "SERVER_ERROR",
      });
    }
  },
);

// ── POST /api/offences/issue ──────────────────────────────────────────────────
// Issue an offence using the atomic RPC transaction.
// officer_id is taken from the authenticated JWT — not from the request body.
router.post("/issue", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const { driver_id, contact, offence_name, offence_type_id, notes } =
      req.body;
    const officer_id = req.user.id; // from JWT — never trust client

    // Input validation
    if (!driver_id || !offence_type_id) {
      return res.status(400).json({
        error: true,
        message: "driver_id and offence_type_id are required",
        code: "VALIDATION_ERROR",
      });
    }

    // UUID format validation (basic)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(driver_id) || !uuidPattern.test(offence_type_id)) {
      return res.status(400).json({
        error: true,
        message: "Invalid driver_id or offence_type_id format",
        code: "VALIDATION_ERROR",
      });
    }

    // Validate notes length if provided
    if (notes && typeof notes === "string" && notes.length > 500) {
      return res.status(400).json({
        error: true,
        message: "Notes must be 500 characters or fewer",
        code: "VALIDATION_ERROR",
      });
    }

    let rpcResult, rpcError;

    if (isLocal) {
      // Call the stored function directly via pg
      try {
        const result = await db.query(
          `SELECT * FROM issue_offence_transaction($1, $2, $3, $4)`,
          [driver_id, officer_id, offence_type_id, notes || null]
        );
        rpcResult = result.rows[0];
        console.log(rpcResult);
      } catch (err) {
        rpcError = err;
      }
    } else {
      // Call the atomic RPC function via Supabase client
      const res2 = await db.rpc("issue_offence_transaction", {
        p_driver_id: driver_id,
        p_officer_id: officer_id,
        p_offence_type_id: offence_type_id,
        p_notes: notes || null,
      });
      rpcResult = res2.data;
      rpcError = res2.error;
    }

    if (rpcError) {
      const msg = rpcError.message || "";

      if (msg.includes("DRIVER_NOT_FOUND")) {
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "DRIVER_NOT_FOUND",
        });
      }
      if (msg.includes("OFFENCE_TYPE_NOT_FOUND")) {
        return res.status(404).json({
          error: true,
          message: "Offence type not found",
          code: "OFFENCE_TYPE_NOT_FOUND",
        });
      }
      if (msg.includes("OFFENCE_TYPE_INACTIVE")) {
        return res.status(400).json({
          error: true,
          message:
            "This offence type is no longer active. Please select a different violation.",
          code: "OFFENCE_TYPE_INACTIVE",
        });
      }
      if (msg.includes("NO_PENALTY_RULE")) {
        return res.status(422).json({
          error: true,
          message: msg.replace("NO_PENALTY_RULE: ", ""),
          code: "NO_PENALTY_RULE",
        });
      }

      logError("POST /api/offences/issue", { driver_id, officer_id }, rpcError);
      return res.status(500).json({
        error: true,
        message: "Transaction failed. No changes were saved.",
        code: "TRANSACTION_FAILED",
      });
    }

    // Attach issuing officer name from JWT for receipt display
    const result = rpcResult.issue_offence_transaction || rpcResult;
    result.officer = {
      id: officer_id,
      full_name: req.user.full_name,
      officer_id: req.user.officer_id,
    };

    // // Send notification to the driver
    // if (contact) {
    //   const emailConfirmation = await sendOffenceNotification(contact, {
    //     officer_name: result.officer.full_name,
    //     offence_name,
    //   });
    //   console.log("Email notification result:", emailConfirmation);
    // }

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    logError("POST /api/offences/issue", {}, err);
    return res.status(500).json({
      error: true,
      message: "An unexpected error occurred",
      code: "SERVER_ERROR",
    });
  }
});

// ── GET /api/offences — list offences (filtered) ──────────────────────────────
// Used by DriverProfile to fetch a driver's offence history.
router.get("/", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const {
      driver_id,
      officer_id: filterOfficerId,
      limit = 50,
      offset = 0,
    } = req.query;

    let data, error, count;

    if (isLocal) {
      // Build parameterized SQL with explicit JOINs
      const params = [];
      const conditions = [];

      if (driver_id) {
        params.push(driver_id);
        conditions.push(`o.driver_id = $${params.length}`);
      }

      if (req.user.role === "officer") {
        params.push(req.user.id);
        conditions.push(`o.officer_id = $${params.length}`);
      } else if (filterOfficerId) {
        params.push(filterOfficerId);
        conditions.push(`o.officer_id = $${params.length}`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      params.push(Number(limit));
      const limitIdx = params.length;
      params.push(Number(offset));
      const offsetIdx = params.length;

      const sql = `
        SELECT
          o.id,
          o.fine_amount,
          o.strike_delta,
          o.issued_at,
          o.notes,
          o.driver_id,
          o.officer_id,
          o.offence_type_id,
          d.full_name   AS driver_name,
          d.license_no  AS driver_license,
          u.full_name   AS officer_name,
          u.officer_id  AS officer_badge,
          ot.name       AS offence_type_name,
          ot.severity   AS offence_type_severity,
          ot.base_fine  AS base_fine
        FROM offences o
        LEFT JOIN drivers      d  ON d.id  = o.driver_id
        LEFT JOIN users        u  ON u.id  = o.officer_id
        LEFT JOIN offence_types ot ON ot.id = o.offence_type_id
        ${whereClause}
        ORDER BY o.issued_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const result = await db.query(sql, params);
      data = result.rows;
      count = data.length;
    } else {
      let query = db
        .from("offences")
        .select(
          `
          id,
          fine_amount,
          strike_delta,
          issued_at,
          notes,
          driver_id,
          officer_id,
          offence_type_id,
          drivers!offences_driver_id_fkey(full_name, license_no),
          users!offences_officer_id_fkey(full_name, officer_id),
          offence_types!offences_offence_type_id_fkey(name, severity, base_fine)
        `,
        )
        .order("issued_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (driver_id) query = query.eq("driver_id", driver_id);

      // Officers can only see their own offences unless they are admin
      if (req.user.role === "officer") {
        query = query.eq("officer_id", req.user.id);
      } else if (filterOfficerId) {
        query = query.eq("officer_id", filterOfficerId);
      }

      const res2 = await query;
      data = res2.data;
      error = res2.error;
      count = res2.count;
    }

    if (error) throw error;

    // Flatten for convenience (Supabase returns nested objects; local already flat)
    const offences = isLocal
      ? (data ?? [])
      : (data ?? []).map((o) => ({
          id: o.id,
          fine_amount: o.fine_amount,
          strike_delta: o.strike_delta,
          issued_at: o.issued_at,
          notes: o.notes,
          driver_id: o.driver_id,
          officer_id: o.officer_id,
          offence_type_id: o.offence_type_id,
          driver_name: o.drivers?.full_name,
          driver_license: o.drivers?.license_no,
          officer_name: o.users?.full_name,
          officer_badge: o.users?.officer_id,
          offence_type_name: o.offence_types?.name,
          offence_type_severity: o.offence_types?.severity,
          base_fine: o.offence_types?.base_fine,
        }));

    return res.json({
      success: true,
      data: { offences, total: count ?? offences.length },
    });
  } catch (err) {
    logError("GET /api/offences", {}, err);
    return res.status(500).json({
      error: true,
      message: "Failed to fetch offences",
      code: "FETCH_ERROR",
    });
  }
});

module.exports = router;
