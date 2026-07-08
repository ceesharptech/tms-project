const express = require("express");
const multer = require("multer");

const db = require("../utils/db");
const { isLocal } = require("../utils/db");
const { enrollFace, identifyFace } = require("../services/faceService");
const {
  uploadProfilePicture,
  deleteProfilePicture,
} = require("../services/storageService");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
const {
  validateDriverCreate,
  validateDriverUpdate,
} = require("../middleware/validation");

const router = express.Router();

// Multer: face enrollment images (up to 5, 10 MB each)
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

// Multer: profile picture (single file, 2 MB, JPG/PNG only)
const PROFILE_PIC_MAX = 2 * 1024 * 1024; // 2 MB
const PROFILE_PIC_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const uploadProfilePic = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_PIC_MAX },
  fileFilter: (_req, file, cb) => {
    if (!PROFILE_PIC_TYPES.includes(file.mimetype)) {
      return cb(
        Object.assign(new Error("Only JPG and PNG files are allowed"), {
          code: "INVALID_FILE_TYPE",
        }),
      );
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

    let drivers, count, error;

    if (isLocal) {
      const result = await db.query(
        `SELECT *, COUNT(*) OVER() AS total_count
         FROM drivers
         WHERE status != 'Deleted'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      drivers = result.rows.map(({ total_count, ...row }) => row);
      count = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count) : 0;
    } else {
      const res2 = await db
        .from("drivers")
        .select("*", { count: "exact" })
        .neq("status", "Deleted")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      drivers = res2.data;
      count = res2.count;
      error = res2.error;
    }

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

// ── POST /api/drivers/identify — facial identification ──────────────────────
// Must come BEFORE /:id to avoid route collision
router.post(
  "/identify",
  requireRole(["officer", "admin"]),
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: "No image file uploaded",
        code: "NO_IMAGE",
      });
    }

    try {
      // Fetch all drivers that have an embedding stored
      let drivers, dbError;

      if (isLocal) {
        const result = await db.query(
          `SELECT id, full_name, license_no, plate_no, contact, status, strike_count, face_embedding
           FROM drivers
           WHERE status != 'Deleted' AND face_embedding IS NOT NULL`
        );
        drivers = result.rows;
      } else {
        const res2 = await db
          .from("drivers")
          .select(
            "id, full_name, license_no, plate_no, contact, status, strike_count, face_embedding",
          )
          .neq("status", "Deleted")
          .not("face_embedding", "is", null);
        drivers = res2.data;
        dbError = res2.error;
      }

      if (dbError) throw dbError;

      if (!drivers || drivers.length === 0) {
        return res.status(404).json({
          error: true,
          matched: false,
          message: "No enrolled drivers to compare against",
          code: "NO_ENROLLED_DRIVERS",
        });
      }

      // Build the embeddings list expected by the Python service.
      // face_embedding is stored as { embedding: float[], model, enrolled_at, num_images }
      // — extract only the float array.
      const storedEmbeddings = drivers
        .filter((d) => Array.isArray(d.face_embedding?.embedding))
        .map((d) => ({
          driver_id: d.id,
          embedding: d.face_embedding.embedding,
        }));

      const result = await identifyFace(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        storedEmbeddings,
      );

      if (!result.matched) {
        return res.status(404).json({ success: true, matched: false });
      }

      // Look up the matched driver (without raw embedding)
      const matchedDriver = drivers.find((d) => d.id === result.driver_id);
      if (!matchedDriver) {
        return res.status(404).json({ success: true, matched: false });
      }

      // Fetch full driver record to include profile_picture_url
      let fullDriver;
      if (isLocal) {
        const r2 = await db.query(
          `SELECT id, full_name, license_no, plate_no, contact, status, strike_count, profile_picture_url
           FROM drivers
           WHERE id = $1`,
          [matchedDriver.id]
        );
        fullDriver = r2.rows[0] || null;
      } else {
        const res2 = await db
          .from("drivers")
          .select(
            "id, full_name, license_no, plate_no, contact, status, strike_count, profile_picture_url",
          )
          .eq("id", matchedDriver.id)
          .single();
        fullDriver = res2.data;
      }

      const driverData = fullDriver || matchedDriver;
      const { face_embedding: _removed, ...safeDriverData } = driverData;

      return res.json({
        success: true,
        matched: true,
        confidence: result.confidence,
        distance: result.distance,
        driver: { ...safeDriverData, face_enrolled: true },
      });
    } catch (err) {
      logError("POST /api/drivers/identify", { user: req.user.id }, err);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: true,
        message: err.message || "Identification failed",
        code: status === 503 ? "SERVICE_UNAVAILABLE" : "IDENTIFY_ERROR",
      });
    }
  },
);

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

    let drivers, error;

    if (isLocal) {
      let sql, params;
      if (searchType === "name") {
        sql = `SELECT * FROM drivers WHERE status != 'Deleted' AND full_name ILIKE $1 ORDER BY full_name`;
        params = [`%${query}%`];
      } else if (searchType === "license") {
        sql = `SELECT * FROM drivers WHERE status != 'Deleted' AND license_no = $1 ORDER BY full_name`;
        params = [query];
      } else {
        sql = `SELECT * FROM drivers WHERE status != 'Deleted' AND plate_no = $1 ORDER BY full_name`;
        params = [query];
      }
      const result = await db.query(sql, params);
      drivers = result.rows;
    } else {
      let dbQuery = db.from("drivers").select("*").neq("status", "Deleted");

      if (searchType === "name") {
        dbQuery = dbQuery.ilike("full_name", `%${query}%`);
      } else if (searchType === "license") {
        dbQuery = dbQuery.eq("license_no", query);
      } else {
        dbQuery = dbQuery.eq("plate_no", query);
      }

      const res2 = await dbQuery.order("full_name");
      drivers = res2.data;
      error = res2.error;
    }

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

    let driver, error;

    if (isLocal) {
      const result = await db.query(
        `SELECT * FROM drivers WHERE id = $1`,
        [id]
      );
      driver = result.rows[0] || null;
      if (!driver) error = { message: "not found" };
    } else {
      const res2 = await db
        .from("drivers")
        .select("*")
        .eq("id", id)
        .single();
      driver = res2.data;
      error = res2.error;
    }

    if (error || !driver) {
      return res.status(404).json({
        error: true,
        message: "Driver not found",
        code: "NOT_FOUND",
      });
    }

    // Enrich with enrollment status (don't expose raw embedding in this route)
    const result2 = {
      ...driver,
      face_enrolled: driver.face_embedding !== null,
      face_embedding: undefined, // strip raw embedding from GET response
    };

    return res.json({ success: true, data: result2 });
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
  (req, res, next) => {
    uploadProfilePic.single("profile_picture")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: true,
            message: "Profile picture must be less than 2MB",
            code: "FILE_TOO_LARGE",
          });
        }
        if (err.code === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            error: true,
            message: "Only JPG and PNG files are allowed for profile picture",
            code: "INVALID_FILE_TYPE",
          });
        }
        return next(err);
      }
      next();
    });
  },
  validateDriverCreate,
  async (req, res) => {
    try {
      console.log(req.body);
      const { full_name, license_no, plate_no, contact } = req.body;

      let driver, error;

      if (isLocal) {
        const result = await db.query(
          `INSERT INTO drivers (full_name, license_no, plate_no, contact, status, strike_count)
           VALUES ($1, $2, $3, $4, 'Active', 0)
           RETURNING *`,
          [full_name.trim(), license_no, plate_no || null, contact || null]
        );
        driver = result.rows[0];
      } else {
        const res2 = await db
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
        driver = res2.data;
        error = res2.error;
      }

      if (error) {
        if (error.code === "23505") {
          return res.status(409).json({
            error: true,
            message: "A driver with that license number already exists",
            code: "DUPLICATE_LICENSE",
          });
        }
        throw error;
      }

      // Upload profile picture if provided
      if (req.file) {
        try {
          const publicUrl = await uploadProfilePicture(
            driver.id,
            req.file.buffer,
            req.file.mimetype,
          );

          if (isLocal) {
            const r2 = await db.query(
              `UPDATE drivers SET profile_picture_url = $1 WHERE id = $2 RETURNING *`,
              [publicUrl, driver.id]
            );
            driver.profile_picture_url = r2.rows[0]?.profile_picture_url ?? publicUrl;
          } else {
            const { data: updated } = await db
              .from("drivers")
              .update({ profile_picture_url: publicUrl })
              .eq("id", driver.id)
              .select()
              .single();
            driver.profile_picture_url =
              updated?.profile_picture_url ?? publicUrl;
          }
        } catch (uploadErr) {
          console.error(
            `[POST /api/drivers] Profile picture upload failed for ${driver.id}:`,
            uploadErr.message,
          );
          // Non-fatal: driver was created, picture just didn't upload
        }
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
  (req, res, next) => {
    uploadProfilePic.single("profile_picture")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: true,
            message: "Profile picture must be less than 2MB",
            code: "FILE_TOO_LARGE",
          });
        }
        if (err.code === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            error: true,
            message: "Only JPG and PNG files are allowed for profile picture",
            code: "INVALID_FILE_TYPE",
          });
        }
        return next(err);
      }
      next();
    });
  },
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

      // Allow update requests that only contain a profile picture with no text fields
      const hasTextUpdates = Object.keys(updates).length > 0;
      const hasFileUpdate = !!req.file;

      if (!hasTextUpdates && !hasFileUpdate) {
        return res.status(400).json({
          error: true,
          message: "No updatable fields provided",
          code: "VALIDATION_ERROR",
        });
      }

      let driver;

      if (hasTextUpdates) {
        updates.updated_at = new Date().toISOString();

        if (isLocal) {
          const setClauses = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(", ");
          const values = [id, ...Object.values(updates)];
          const result = await db.query(
            `UPDATE drivers SET ${setClauses} WHERE id = $1 AND status != 'Deleted' RETURNING *`,
            values
          );
          if (result.rows.length === 0) {
            return res.status(404).json({
              error: true,
              message: "Driver not found",
              code: "NOT_FOUND",
            });
          }
          driver = result.rows[0];
        } else {
          const { data, error } = await db
            .from("drivers")
            .update(updates)
            .eq("id", id)
            .neq("status", "Deleted")
            .select()
            .single();

          if (error || !data) {
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
          driver = data;
        }
      } else {
        // Only a profile picture update — fetch the current driver record
        if (isLocal) {
          const result = await db.query(
            `SELECT * FROM drivers WHERE id = $1 AND status != 'Deleted'`,
            [id]
          );
          if (result.rows.length === 0) {
            return res.status(404).json({
              error: true,
              message: "Driver not found",
              code: "NOT_FOUND",
            });
          }
          driver = result.rows[0];
        } else {
          const { data, error } = await db
            .from("drivers")
            .select("*")
            .eq("id", id)
            .neq("status", "Deleted")
            .single();

          if (error || !data) {
            return res.status(404).json({
              error: true,
              message: "Driver not found",
              code: "NOT_FOUND",
            });
          }
          driver = data;
        }
      }

      // Handle profile picture upload/update
      if (hasFileUpdate) {
        try {
          // Delete old picture from storage if it exists
          if (driver.profile_picture_url) {
            await deleteProfilePicture(driver.profile_picture_url);
          }

          const publicUrl = await uploadProfilePicture(
            id,
            req.file.buffer,
            req.file.mimetype,
          );

          if (isLocal) {
            const r2 = await db.query(
              `UPDATE drivers SET profile_picture_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
              [publicUrl, id]
            );
            if (r2.rows[0]) driver = r2.rows[0];
          } else {
            const { data: updated } = await db
              .from("drivers")
              .update({
                profile_picture_url: publicUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id)
              .select()
              .single();

            if (updated) driver = updated;
          }
        } catch (uploadErr) {
          console.error(
            `[PUT /api/drivers/:id] Profile picture update failed for ${id}:`,
            uploadErr.message,
          );
          return res.status(500).json({
            error: true,
            message: "Failed to update profile picture",
            code: "STORAGE_ERROR",
          });
        }
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

    let driver, error;

    if (isLocal) {
      const result = await db.query(
        `UPDATE drivers
         SET status = 'Deleted', updated_at = NOW()
         WHERE id = $1 AND status != 'Deleted'
         RETURNING id, full_name`,
        [id]
      );
      driver = result.rows[0] || null;
    } else {
      const res2 = await db
        .from("drivers")
        .update({ status: "Deleted", updated_at: new Date().toISOString() })
        .eq("id", id)
        .neq("status", "Deleted")
        .select("id, full_name")
        .single();
      driver = res2.data;
      error = res2.error;
    }

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
      let driver, fetchErr;

      if (isLocal) {
        const result = await db.query(
          `SELECT id, full_name, face_embedding, status FROM drivers WHERE id = $1`,
          [id]
        );
        driver = result.rows[0] || null;
        if (!driver) fetchErr = { message: "not found" };
      } else {
        const res2 = await db
          .from("drivers")
          .select("id, full_name, face_embedding, status")
          .eq("id", id)
          .single();
        driver = res2.data;
        fetchErr = res2.error;
      }

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

      if (isLocal) {
        const updateErr2 = await db.query(
          `UPDATE drivers SET face_embedding = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(embeddingPayload), id]
        ).catch((e) => e);
        if (updateErr2 instanceof Error) throw updateErr2;
      } else {
        const { error: updateErr } = await db
          .from("drivers")
          .update({
            face_embedding: embeddingPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (updateErr) throw updateErr;
      }

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
