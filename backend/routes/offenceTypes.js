const express = require("express");
const db = require("../utils/db");
const { isLocal } = require("../utils/db");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

const router = express.Router();

router.use(authenticateToken);

function logError(endpoint, context, err) {
  console.error(`[${endpoint}]`, context, err.message || err);
}

// ── GET /api/offence-types — list all ─────────────────────────────────────────
router.get("/", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    let data, error;

    if (isLocal) {
      const result = await db.query(
        `SELECT * FROM offence_types ORDER BY severity, name`
      );
      data = result.rows;
    } else {
      const res2 = await db
        .from("offence_types")
        .select("*")
        .order("severity", { ascending: true })
        .order("name", { ascending: true });
      data = res2.data;
      error = res2.error;
    }

    if (error) throw error;

    return res.json({ success: true, data: data ?? [] });
  } catch (err) {
    logError("GET /api/offence-types", {}, err);
    return res.status(500).json({
      error: true,
      message: "Failed to fetch offence types",
      code: "FETCH_ERROR",
    });
  }
});

// ── POST /api/offence-types — create ─────────────────────────────────────────
router.post("/", requireRole(["admin"]), async (req, res) => {
  try {
    console.log(req.body);
    const { name, description, base_fine, strike_weight, severity } = req.body;

    // Validation
    const errors = [];
    if (!name || typeof name !== "string" || !name.trim()) {
      errors.push("name is required");
    } else if (name.trim().length > 100) {
      errors.push("name must be 100 characters or fewer");
    }
    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      errors.push("description is required");
    } else if (description.trim().length > 500) {
      errors.push("description must be 500 characters or fewer");
    }
    const fine = Number(base_fine);
    if (!base_fine && base_fine !== 0) {
      errors.push("base_fine is required");
    } else if (isNaN(fine) || fine < 1000 || fine > 500000) {
      errors.push("base_fine must be between ₦1,000 and ₦500,000");
    }
    const weight = Number(strike_weight);
    if (!strike_weight && strike_weight !== 0) {
      errors.push("strike_weight is required");
    } else if (
      isNaN(weight) ||
      !Number.isInteger(weight) ||
      weight < 1 ||
      weight > 5
    ) {
      errors.push("strike_weight must be an integer between 1 and 5");
    }
    if (!["Minor", "Moderate", "Severe"].includes(severity)) {
      errors.push("severity must be Minor, Moderate, or Severe");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Check for duplicate name
    let existing;

    if (isLocal) {
      const result = await db.query(
        `SELECT id FROM offence_types WHERE LOWER(name) = LOWER($1)`,
        [name.trim()]
      );
      existing = result.rows[0] || null;
    } else {
      const res2 = await db
        .from("offence_types")
        .select("id")
        .ilike("name", name.trim())
        .maybeSingle();
      existing = res2.data;
    }

    if (existing) {
      return res.status(409).json({
        error: true,
        message: "Offence name already exists",
        code: "DUPLICATE_NAME",
      });
    }

    let data, error;

    if (isLocal) {
      const result = await db.query(
        `INSERT INTO offence_types (name, description, base_fine, strike_weight, severity, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [name.trim(), description.trim(), fine, weight, severity]
      );
      data = result.rows[0];
    } else {
      const res2 = await db
        .from("offence_types")
        .insert({
          name: name.trim(),
          description: description.trim(),
          base_fine: fine,
          strike_weight: weight,
          severity,
          is_active: true,
        })
        .select()
        .single();
      data = res2.data;
      error = res2.error;
    }

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    logError("POST /api/offence-types", {}, err);
    return res.status(500).json({
      error: true,
      message: "Failed to create offence type",
      code: "CREATE_ERROR",
    });
  }
});

// ── PUT /api/offence-types/:id — update ──────────────────────────────────────
router.put("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, base_fine, strike_weight, severity } = req.body;

    // Check record exists
    let existing, fetchErr;

    if (isLocal) {
      const result = await db.query(
        `SELECT id, name FROM offence_types WHERE id = $1`,
        [id]
      );
      existing = result.rows[0] || null;
      if (!existing) fetchErr = { message: "not found" };
    } else {
      const res2 = await db
        .from("offence_types")
        .select("id, name")
        .eq("id", id)
        .single();
      existing = res2.data;
      fetchErr = res2.error;
    }

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: true,
        message: "Offence type not found",
        code: "NOT_FOUND",
      });
    }

    // Validation
    const errors = [];
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim())
        errors.push("name cannot be empty");
      else if (name.trim().length > 100)
        errors.push("name must be 100 characters or fewer");
    }
    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim())
        errors.push("description cannot be empty");
      else if (description.trim().length > 500)
        errors.push("description must be 500 characters or fewer");
    }
    if (base_fine !== undefined) {
      const fine = Number(base_fine);
      if (isNaN(fine) || fine < 1000 || fine > 500000) {
        errors.push("base_fine must be between ₦1,000 and ₦500,000");
      }
    }
    if (strike_weight !== undefined) {
      const weight = Number(strike_weight);
      if (
        isNaN(weight) ||
        !Number.isInteger(weight) ||
        weight < 1 ||
        weight > 5
      ) {
        errors.push("strike_weight must be an integer between 1 and 5");
      }
    }
    if (
      severity !== undefined &&
      !["Minor", "Moderate", "Severe"].includes(severity)
    ) {
      errors.push("severity must be Minor, Moderate, or Severe");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Check duplicate name (excluding current record)
    if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      let dupe;

      if (isLocal) {
        const result = await db.query(
          `SELECT id FROM offence_types WHERE LOWER(name) = LOWER($1) AND id != $2`,
          [name.trim(), id]
        );
        dupe = result.rows[0] || null;
      } else {
        const res2 = await db
          .from("offence_types")
          .select("id")
          .ilike("name", name.trim())
          .neq("id", id)
          .maybeSingle();
        dupe = res2.data;
      }

      if (dupe) {
        return res.status(409).json({
          error: true,
          message: "Offence name already exists",
          code: "DUPLICATE_NAME",
        });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (base_fine !== undefined) updates.base_fine = Number(base_fine);
    if (strike_weight !== undefined)
      updates.strike_weight = Number(strike_weight);
    if (severity !== undefined) updates.severity = severity;

    let data, error;

    if (isLocal) {
      const setClauses = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(", ");
      const values = [id, ...Object.values(updates)];
      const result = await db.query(
        `UPDATE offence_types SET ${setClauses} WHERE id = $1 RETURNING *`,
        values
      );
      data = result.rows[0];
    } else {
      const res2 = await db
        .from("offence_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      data = res2.data;
      error = res2.error;
    }

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    logError("PUT /api/offence-types/:id", { id: req.params.id }, err);
    return res.status(500).json({
      error: true,
      message: "Failed to update offence type",
      code: "UPDATE_ERROR",
    });
  }
});

// ── DELETE /api/offence-types/:id — soft delete (toggle is_active) ────────────
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    let existing, fetchErr;

    if (isLocal) {
      const result = await db.query(
        `SELECT id, is_active FROM offence_types WHERE id = $1`,
        [id]
      );
      existing = result.rows[0] || null;
      if (!existing) fetchErr = { message: "not found" };
    } else {
      const res2 = await db
        .from("offence_types")
        .select("id, is_active")
        .eq("id", id)
        .single();
      existing = res2.data;
      fetchErr = res2.error;
    }

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: true,
        message: "Offence type not found",
        code: "NOT_FOUND",
      });
    }

    const newActive = !existing.is_active;

    let data, error;

    if (isLocal) {
      const result = await db.query(
        `UPDATE offence_types SET is_active = $1 WHERE id = $2 RETURNING *`,
        [newActive, id]
      );
      data = result.rows[0];
    } else {
      const res2 = await db
        .from("offence_types")
        .update({ is_active: newActive })
        .eq("id", id)
        .select()
        .single();
      data = res2.data;
      error = res2.error;
    }

    if (error) throw error;

    return res.json({
      success: true,
      data,
      message: newActive ? "Offence type enabled" : "Offence type disabled",
    });
  } catch (err) {
    logError("DELETE /api/offence-types/:id", { id: req.params.id }, err);
    return res.status(500).json({
      error: true,
      message: "Failed to update offence type status",
      code: "UPDATE_ERROR",
    });
  }
});

module.exports = router;
