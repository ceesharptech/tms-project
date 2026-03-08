const { verifyToken } = require("../utils/jwt");

/**
 * authenticateToken — extracts and verifies the Bearer JWT.
 * Attaches the decoded payload to req.user on success.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "No token provided",
      code: "NO_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token, "access");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: true,
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
};

module.exports = { authenticateToken };
