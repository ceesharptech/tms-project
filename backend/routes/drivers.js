const express = require("express");
const multer = require("multer");

const supabase = require("../services/supabase");
const { enrollFace } = require("../services/faceService");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
const {
  validateDriverCreate,
  validateDriverUpdate,
} = require("../middleware/validation");

const router = express.Router();

// Files held in memory (buffers forwarded directly to Python service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error(`File ${file.originalname} is not an image`));
    }
    cb(null, true);
  },
});

// All driver routes require authentication
router.use(authenticateToken);

// ── Helpers ──────────────────────────────────────────────────────────────────

function logError(endpoint, context, err) {
  console.error(`[${endpoint}]`, context, err.message || err);
}

// ── GET /api/drivers — paginated list ────────────────────────────────────────
router.get("/", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const {
      data: drivers,
      error,
      count,
    } = await supabase
      .from("drivers")
      .select("*", { count: "exact" })
      .neq("status", "Deleted")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      success: true,
      data: { drivers, total: count },
    });
  } catch (err) {
    logError("GET /api/drivers", { user: req.user.id }, err);
    return res.status(500).json({
      error: true,
      message: "Failed to fetch drivers",
      code: "FETCH_ERROR",
    });
  }
});

// ── POST /api/drivers/search — search by name, license, or plate ─────────────
// Must come BEFORE /:id to avoid route collision
router.post("/search", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const { query, searchType } = req.body;

    if (!query || !searchType) {
      return res.status(400).json({
        error: true,
        message: "query and searchType are required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!["name", "license", "plate"].includes(searchType)) {
      return res.status(400).json({
        error: true,
        message: "searchType must be one of: name, license, plate",
        code: "VALIDATION_ERROR",
      });
    }

    let dbQuery = supabase.from("drivers").select("*").neq("status", "Deleted");

    if (searchType === "name") {
      dbQuery = dbQuery.ilike("full_name", `%${query}%`);
    } else if (searchType === "license") {
      dbQuery = dbQuery.eq("license_no", query);
    } else {
      dbQuery = dbQuery.eq("plate_no", query);
    }

    const { data: drivers, error } = await dbQuery.order("full_name");

    if (error) throw error;

    return res.json({
      success: true,
      data: { drivers: drivers ?? [], count: (drivers ?? []).length },
    });
  } catch (err) {
    logError("POST /api/drivers/search", { user: req.user.id }, err);
    return res.status(500).json({
      error: true,
      message: "Search failed",
      code: "SEARCH_ERROR",
    });
  }
});

// ── GET /api/drivers/:id — single driver ─────────────────────────────────────
router.get("/:id", requireRole(["officer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: driver, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !driver) {
      return res.status(404).json({
        error: true,
        message: "Driver not found",
        code: "NOT_FOUND",
      });
    }

    // Enrich with enrollment status (don't expose raw embedding in this route)
    const result = {
      ...driver,
      face_enrolled: driver.face_embedding !== null,
      face_embedding: undefined, // strip raw embedding from GET response
    };

    return res.json({ success: true, data: result });
  } catch (err) {
    logError(
      "GET /api/drivers/:id",
      { user: req.user.id, driver: req.params.id },
      err,
    );
    return res.status(500).json({
      error: true,
      message: "Failed to fetch driver",
      code: "FETCH_ERROR",
    });
  }
});

// ── POST /api/drivers — create driver ────────────────────────────────────────
router.post(
  "/",
  requireRole(["admin"]),
  validateDriverCreate,
  async (req, res) => {
    try {
      const { full_name, license_no, plate_no, contact } = req.body;

      const { data: driver, error } = await supabase
        .from("drivers")
        .insert({
          full_name: full_name.trim(),
          license_no,
          plate_no: plate_no || null,
          contact: contact || null,
          status: "Active",
          strike_count: 0,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          return res.status(409).json({
            error: true,
            message: "A driver with that license number already exists",
            code: "DUPLICATE_LICENSE",
          });
        }
        throw error;
      }

      console.log(
        `[POST /api/drivers] Driver created: ${driver.id} by user ${req.user.id}`,
      );

      return res.status(201).json({ success: true, data: driver });
    } catch (err) {
      logError("POST /api/drivers", { user: req.user.id }, err);
      return res.status(500).json({
        error: true,
        message: "Failed to create driver",
        code: "CREATE_ERROR",
      });
    }
  },
);

// ── PUT /api/drivers/:id — update driver ─────────────────────────────────────
router.put(
  "/:id",
  requireRole(["admin"]),
  validateDriverUpdate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { full_name, license_no, plate_no, contact, status } = req.body;

      // Build only the fields that were provided
      const updates = {};
      if (full_name !== undefined) updates.full_name = full_name.trim();
      if (license_no !== undefined) updates.license_no = license_no;
      if (plate_no !== undefined) updates.plate_no = plate_no || null;
      if (contact !== undefined) updates.contact = contact || null;
      if (status !== undefined) {
        const allowed = ["Active", "Flagged", "Suspended"];
        if (!allowed.includes(status)) {
          return res.status(400).json({
            error: true,
            message: `status must be one of: ${allowed.join(", ")}`,
            code: "VALIDATION_ERROR",
          });
        }
        updates.status = status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: true,
          message: "No updatable fields provided",
          code: "VALIDATION_ERROR",
        });
      }

      updates.updated_at = new Date().toISOString();

      const { data: driver, error } = await supabase
        .from("drivers")
        .update(updates)
        .eq("id", id)
        .neq("status", "Deleted")
        .select()
        .single();

      if (error || !driver) {
        if (error?.code === "23505") {
          return res.status(409).json({
            error: true,
            message: "A driver with that license number already exists",
            code: "DUPLICATE_LICENSE",
          });
        }
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "NOT_FOUND",
        });
      }

      return res.json({ success: true, data: driver });
    } catch (err) {
      logError(
        "PUT /api/drivers/:id",
        { user: req.user.id, driver: req.params.id },
        err,
      );
      return res.status(500).json({
        error: true,
        message: "Failed to update driver",
        code: "UPDATE_ERROR",
      });
    }
  },
);

// ── DELETE /api/drivers/:id — soft delete ────────────────────────────────────
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: driver, error } = await supabase
      .from("drivers")
      .update({ status: "Deleted", updated_at: new Date().toISOString() })
      .eq("id", id)
      .neq("status", "Deleted")
      .select("id, full_name")
      .single();

    if (error || !driver) {
      return res.status(404).json({
        error: true,
        message: "Driver not found",
        code: "NOT_FOUND",
      });
    }

    console.log(
      `[DELETE /api/drivers/:id] Driver ${driver.id} soft-deleted by user ${req.user.id}`,
    );

    return res.json({
      success: true,
      message: `Driver "${driver.full_name}" has been deleted`,
    });
  } catch (err) {
    logError(
      "DELETE /api/drivers/:id",
      { user: req.user.id, driver: req.params.id },
      err,
    );
    return res.status(500).json({
      error: true,
      message: "Failed to delete driver",
      code: "DELETE_ERROR",
    });
  }
});

// ── POST /api/drivers/:id/enroll-face ────────────────────────────────────────
router.post(
  "/:id/enroll-face",
  requireRole(["admin"]),
  upload.array("images", 5),
  async (req, res) => {
    const { id } = req.params;

    try {
      const files = req.files || [];

      if (files.length < 3 || files.length > 5) {
        return res.status(400).json({
          error: true,
          message: `Must provide 3-5 face images, received ${files.length}`,
          code: "INVALID_IMAGE_COUNT",
        });
      }

      // Verify driver exists and hasn't been enrolled yet
      const { data: driver, error: fetchErr } = await supabase
        .from("drivers")
        .select("id, full_name, face_embedding, status")
        .eq("id", id)
        .single();

      if (fetchErr || !driver) {
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "NOT_FOUND",
        });
      }

      if (driver.status === "Deleted") {
        return res.status(404).json({
          error: true,
          message: "Driver not found",
          code: "NOT_FOUND",
        });
      }

      if (driver.face_embedding !== null) {
        return res.status(400).json({
          error: true,
          message:
            "Driver already has a face enrolled. Use re-enroll to update.",
          code: "ALREADY_ENROLLED",
        });
      }

      console.log(
        `[POST /api/drivers/:id/enroll-face] Enrolling driver ${id} with ${files.length} images`,
      );

      // Forward images to Python face service
      let faceResult;
      try {
        faceResult = await enrollFace(id, files);
      } catch (faceErr) {
        const status = faceErr.statusCode || 500;
        const code =
          status === 503 ? "FACE_SERVICE_UNAVAILABLE" : "FACE_SERVICE_ERROR";
        return res.status(status === 503 ? 503 : 422).json({
          error: true,
          message: faceErr.message,
          code,
        });
      }

      // Persist embedding in database
      const embeddingPayload = {
        embedding: faceResult.embedding,
        model: faceResult.model || "ArcFace",
        enrolled_at: new Date().toISOString(),
        num_images: files.length,
      };

      const { error: updateErr } = await supabase
        .from("drivers")
        .update({
          face_embedding: embeddingPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      console.log(
        `[POST /api/drivers/:id/enroll-face] Enrollment complete for driver ${id}`,
      );

      return res.json({
        success: true,
        message: "Face enrolled successfully",
        data: {
          driver_id: id,
          driver_name: driver.full_name,
          enrollment_status: "completed",
          model: embeddingPayload.model,
          enrolled_at: embeddingPayload.enrolled_at,
        },
      });
    } catch (err) {
      logError(
        "POST /api/drivers/:id/enroll-face",
        { user: req.user.id, driver: id },
        err,
      );
      return res.status(500).json({
        error: true,
        message: "Face enrollment failed",
        code: "ENROLLMENT_ERROR",
      });
    }
  },
);

module.exports = router;
