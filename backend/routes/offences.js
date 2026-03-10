const express = require("express");
const supabase = require("../services/supabase");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

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
      const { data: driver, error: driverErr } = await supabase
        .from("drivers")
        .select("id, strike_count, status")
        .eq("id", driver_id)
        .single();

      if (driverErr || !driver) {
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "DRIVER_NOT_FOUND",
        });
      }

      // Fetch offence type
      const { data: offenceType, error: otErr } = await supabase
        .from("offence_types")
        .select("id, name, base_fine, strike_weight, severity, is_active")
        .eq("id", offence_type_id)
        .single();

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
      const { data: rules, error: ruleErr } = await supabase
        .from("penalty_rules")
        .select("min_strikes, max_strikes, fine_multiplier, status_flag")
        .lte("min_strikes", newStrikeCount)
        .gte("max_strikes", newStrikeCount)
        .limit(1);

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
    const { driver_id, offence_type_id, notes } = req.body;
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

    // Call the atomic RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "issue_offence_transaction",
      {
        p_driver_id: driver_id,
        p_officer_id: officer_id,
        p_offence_type_id: offence_type_id,
        p_notes: notes || null,
      },
    );

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
    const result = rpcResult;
    result.officer = {
      id: officer_id,
      full_name: req.user.full_name,
      officer_id: req.user.officer_id,
    };

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

    let query = supabase
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

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten for convenience
    const offences = (data ?? []).map((o) => ({
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
