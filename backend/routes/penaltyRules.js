const express = require("express");
const supabase = require("../services/supabase");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

const router = express.Router();

router.use(authenticateToken);

function logError(endpoint, context, err) {
  console.error(`[${endpoint}]`, context, err.message || err);
}

// ── GET /api/penalty-rules — list all ─────────────────────────────────────────
router.get("/", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("penalty_rules")
      .select("*")
      .order("min_strikes", { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: data ?? [] });
  } catch (err) {
    logError("GET /api/penalty-rules", {}, err);
    return res.status(500).json({
      error: true,
      message: "Failed to fetch penalty rules",
      code: "FETCH_ERROR",
    });
  }
});

// ── POST /api/penalty-rules — create ─────────────────────────────────────────
router.post("/", requireRole(["admin"]), async (req, res) => {
  try {
    const { min_strikes, max_strikes, fine_multiplier, status_flag } = req.body;

    const errors = [];
    const minVal = Number(min_strikes);
    const maxVal = Number(max_strikes);
    const multiplier = Number(fine_multiplier);

    if (
      min_strikes === undefined ||
      min_strikes === null ||
      min_strikes === ""
    ) {
      errors.push("min_strikes is required");
    } else if (isNaN(minVal) || !Number.isInteger(minVal) || minVal < 0) {
      errors.push("min_strikes must be a non-negative integer");
    }

    if (
      max_strikes === undefined ||
      max_strikes === null ||
      max_strikes === ""
    ) {
      errors.push("max_strikes is required");
    } else if (isNaN(maxVal) || !Number.isInteger(maxVal)) {
      errors.push("max_strikes must be an integer");
    } else if (!isNaN(minVal) && maxVal <= minVal) {
      errors.push("max_strikes must be greater than min_strikes");
    }

    if (!fine_multiplier && fine_multiplier !== 0) {
      errors.push("fine_multiplier is required");
    } else if (isNaN(multiplier) || multiplier < 1.0 || multiplier > 5.0) {
      errors.push("fine_multiplier must be between 1.0 and 5.0");
    }

    if (
      !status_flag ||
      typeof status_flag !== "string" ||
      !status_flag.trim()
    ) {
      errors.push("status_flag is required");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Check for overlapping ranges
    const { data: existing } = await supabase
      .from("penalty_rules")
      .select("id, min_strikes, max_strikes");

    const overlap = (existing ?? []).find(
      (r) => minVal <= r.max_strikes && maxVal >= r.min_strikes,
    );

    if (overlap) {
      return res.status(409).json({
        error: true,
        message: `Range overlaps with existing rule (${overlap.min_strikes}–${overlap.max_strikes === 9999 ? overlap.min_strikes + "+" : overlap.max_strikes})`,
        code: "RANGE_OVERLAP",
      });
    }

    const { data, error } = await supabase
      .from("penalty_rules")
      .insert({
        min_strikes: minVal,
        max_strikes: maxVal,
        fine_multiplier: multiplier,
        status_flag: status_flag.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    logError("POST /api/penalty-rules", {}, err);
    return res.status(500).json({
      error: true,
      message: "Failed to create penalty rule",
      code: "CREATE_ERROR",
    });
  }
});

// ── PUT /api/penalty-rules/:id — update ──────────────────────────────────────
router.put("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_strikes, max_strikes, fine_multiplier, status_flag } = req.body;

    const { data: existing, error: fetchErr } = await supabase
      .from("penalty_rules")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: true,
        message: "Penalty rule not found",
        code: "NOT_FOUND",
      });
    }

    const errors = [];
    const minVal =
      min_strikes !== undefined ? Number(min_strikes) : existing.min_strikes;
    const maxVal =
      max_strikes !== undefined ? Number(max_strikes) : existing.max_strikes;
    const multiplier =
      fine_multiplier !== undefined
        ? Number(fine_multiplier)
        : existing.fine_multiplier;

    if (min_strikes !== undefined) {
      if (
        isNaN(Number(min_strikes)) ||
        !Number.isInteger(Number(min_strikes)) ||
        Number(min_strikes) < 0
      ) {
        errors.push("min_strikes must be a non-negative integer");
      }
    }
    if (max_strikes !== undefined) {
      if (
        isNaN(Number(max_strikes)) ||
        !Number.isInteger(Number(max_strikes))
      ) {
        errors.push("max_strikes must be an integer");
      }
    }
    if (maxVal <= minVal) {
      errors.push("max_strikes must be greater than min_strikes");
    }
    if (fine_multiplier !== undefined) {
      if (isNaN(multiplier) || multiplier < 1.0 || multiplier > 5.0) {
        errors.push("fine_multiplier must be between 1.0 and 5.0");
      }
    }
    if (status_flag !== undefined && (!status_flag || !status_flag.trim())) {
      errors.push("status_flag cannot be empty");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Check for overlapping ranges (exclude current rule)
    const { data: allRules } = await supabase
      .from("penalty_rules")
      .select("id, min_strikes, max_strikes")
      .neq("id", id);

    const overlap = (allRules ?? []).find(
      (r) => minVal <= r.max_strikes && maxVal >= r.min_strikes,
    );

    if (overlap) {
      return res.status(409).json({
        error: true,
        message: `Range overlaps with existing rule (${overlap.min_strikes}–${overlap.max_strikes === 9999 ? overlap.min_strikes + "+" : overlap.max_strikes})`,
        code: "RANGE_OVERLAP",
      });
    }

    const updates = {};
    if (min_strikes !== undefined) updates.min_strikes = minVal;
    if (max_strikes !== undefined) updates.max_strikes = maxVal;
    if (fine_multiplier !== undefined) updates.fine_multiplier = multiplier;
    if (status_flag !== undefined) updates.status_flag = status_flag.trim();

    const { data, error } = await supabase
      .from("penalty_rules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    logError("PUT /api/penalty-rules/:id", { id: req.params.id }, err);
    return res.status(500).json({
      error: true,
      message: "Failed to update penalty rule",
      code: "UPDATE_ERROR",
    });
  }
});

// ── DELETE /api/penalty-rules/:id — hard delete ───────────────────────────────
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from("penalty_rules")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: true,
        message: "Penalty rule not found",
        code: "NOT_FOUND",
      });
    }

    const { error } = await supabase
      .from("penalty_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ success: true, message: "Penalty rule deleted" });
  } catch (err) {
    logError("DELETE /api/penalty-rules/:id", { id: req.params.id }, err);
    return res.status(500).json({
      error: true,
      message: "Failed to delete penalty rule",
      code: "DELETE_ERROR",
    });
  }
});

module.exports = router;
