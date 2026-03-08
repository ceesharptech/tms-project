const express = require("express");
const bcrypt = require("bcrypt");
const supabase = require("../services/supabase");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/jwt");

const router = express.Router();

// In-memory refresh token blacklist.
// For production, replace with a Redis set or a DB table.
const revokedTokens = new Set();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { identifier, password }
//   identifier — 6-digit officer_id  OR  email address
// ---------------------------------------------------------------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      error: true,
      message: "identifier and password are required",
      code: "MISSING_FIELDS",
    });
  }

  // Determine query field: numeric-only ≤6 chars → officer_id, else → email
  const isOfficerId = /^\d{1,6}$/.test(identifier.trim());
  const field = isOfficerId ? "officer_id" : "email";

  const { data: users, error: dbError } = await supabase
    .from("users")
    .select("id, officer_id, email, password_hash, role, full_name")
    .eq(field, identifier.trim())
    .limit(1);

  if (dbError) {
    console.error("DB error during login:", dbError);
    return res.status(500).json({
      error: true,
      message: "Database error",
      code: "DB_ERROR",
    });
  }

  const user = users?.[0];

  // Use a constant-time comparison to avoid user enumeration
  const dummyHash =
    "$2b$10$invalidhashpadding000000000000000000000000000000000000000";
  const hashToCompare = user ? user.password_hash : dummyHash;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    return res.status(401).json({
      error: true,
      message: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Safe user object — omit password_hash
  const safeUser = {
    id: user.id,
    officer_id: user.officer_id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
  };

  return res.status(200).json({
    success: true,
    data: {
      user: safeUser,
      accessToken,
      refreshToken,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// Body: { refreshToken }
// ---------------------------------------------------------------------------
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: true,
      message: "Refresh token is required",
      code: "MISSING_TOKEN",
    });
  }

  if (revokedTokens.has(refreshToken)) {
    return res.status(401).json({
      error: true,
      message: "Token has been revoked",
      code: "TOKEN_REVOKED",
    });
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, "refresh");
  } catch {
    return res.status(401).json({
      error: true,
      message: "Invalid or expired refresh token",
      code: "INVALID_REFRESH_TOKEN",
    });
  }

  // Fetch fresh user data so the new access token reflects current state
  const { data: users, error: dbError } = await supabase
    .from("users")
    .select("id, officer_id, email, role, full_name")
    .eq("id", decoded.sub)
    .limit(1);

  if (dbError || !users?.[0]) {
    return res.status(401).json({
      error: true,
      message: "User not found",
      code: "USER_NOT_FOUND",
    });
  }

  const accessToken = generateAccessToken(users[0]);

  return res.status(200).json({
    success: true,
    data: { accessToken },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Body: { refreshToken }
// ---------------------------------------------------------------------------
router.post("/logout", (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    revokedTokens.add(refreshToken);
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
