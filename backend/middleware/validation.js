/**
 * Input validation middleware for driver routes.
 */

const LICENSE_RE = /^[A-Z0-9]{11}$/;
const PLATE_RE = /^[A-Z]{3}-[A-Z0-9]{5}$/;

/**
 * validateDriverCreate — enforces required fields and format rules.
 * Used on POST /api/drivers
 */
const validateDriverCreate = (req, res, next) => {
  const errors = [];
  const { full_name, license_no, plate_no } = req.body;

  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 3) {
    errors.push("full_name is required and must be at least 3 characters");
  }

  if (!license_no || typeof license_no !== "string") {
    errors.push("license_no is required");
  } else if (!LICENSE_RE.test(license_no.toUpperCase())) {
    errors.push(
      "license_no must be exactly 11 uppercase alphanumeric characters (e.g. A1B2C3D4E5F)"
    );
  }

  if (plate_no !== undefined && plate_no !== null && plate_no !== "") {
    if (!PLATE_RE.test(plate_no.toUpperCase())) {
      errors.push(
        "plate_no must be in format ABC-123DE (3 letters, dash, 5 alphanumeric chars)"
      );
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: true,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors,
    });
  }

  // Normalise casing before passing downstream
  req.body.license_no = license_no.toUpperCase();
  if (plate_no) req.body.plate_no = plate_no.toUpperCase();

  next();
};

/**
 * validateDriverUpdate — same rules but all fields are optional.
 * Used on PUT /api/drivers/:id
 */
const validateDriverUpdate = (req, res, next) => {
  const errors = [];
  const { full_name, license_no, plate_no, strike_count, face_embedding } = req.body;

  // Prevent direct update of controlled fields
  if (strike_count !== undefined) {
    errors.push("strike_count cannot be updated directly — use the offence endpoints");
  }
  if (face_embedding !== undefined) {
    errors.push("face_embedding cannot be updated directly — use the enroll-face endpoint");
  }

  if (full_name !== undefined) {
    if (typeof full_name !== "string" || full_name.trim().length < 3) {
      errors.push("full_name must be at least 3 characters");
    }
  }

  if (license_no !== undefined) {
    if (!LICENSE_RE.test(license_no.toUpperCase())) {
      errors.push(
        "license_no must be exactly 11 uppercase alphanumeric characters (e.g. A1B2C3D4E5F)"
      );
    }
  }

  if (plate_no !== undefined && plate_no !== null && plate_no !== "") {
    if (!PLATE_RE.test(plate_no.toUpperCase())) {
      errors.push(
        "plate_no must be in format ABC-123DE (3 letters, dash, 5 alphanumeric chars)"
      );
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: true,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors,
    });
  }

  // Normalise casing
  if (license_no) req.body.license_no = license_no.toUpperCase();
  if (plate_no) req.body.plate_no = plate_no.toUpperCase();

  next();
};

module.exports = { validateDriverCreate, validateDriverUpdate };
