const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRY = process.env.JWT_EXPIRES_IN || "30m";
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

/**
 * Generate a short-lived access token (default 30 min).
 * Payload: { sub, id, email, officer_id, role, full_name }
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    officer_id: user.officer_id,
    role: user.role,
    full_name: user.full_name,
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

/**
 * Generate a long-lived refresh token (default 7 days).
 * Minimal payload — only what is needed to re-issue an access token.
 */
function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: "refresh",
  };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

/**
 * Verify and decode a token.
 * @param {string} token
 * @param {'access'|'refresh'} type
 * @returns decoded payload
 * @throws JsonWebTokenError | TokenExpiredError
 */
function verifyToken(token, type = "access") {
  const secret = type === "refresh" ? REFRESH_SECRET : ACCESS_SECRET;
  return jwt.verify(token, secret);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };
