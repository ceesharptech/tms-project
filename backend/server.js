require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { authenticateToken } = require("./middleware/auth");
const { requireRole } = require("./middleware/roleCheck");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ddits-backend",
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
// app.use('/api/drivers',      require('./routes/drivers'));
// app.use('/api/offences',     require('./routes/offences'));
// app.use('/api/offence-types',require('./routes/offenceTypes'));
// app.use('/api/penalty-rules',require('./routes/penaltyRules'));
// app.use('/api/analytics',    require('./routes/analytics'));
// app.use('/api/audit-logs',   require('./routes/auditLogs'));

// ── Protected test endpoints ──────────────────────────────────────────────────
// Accessible by both officers and admins
app.get(
  "/api/test/officer",
  authenticateToken,
  requireRole(["officer", "admin"]),
  (req, res) => {
    res.json({
      success: true,
      message: `Hello ${req.user.full_name} (${req.user.role}) — officer route ok`,
    });
  },
);

// Accessible by admins only
app.get(
  "/api/test/admin",
  authenticateToken,
  requireRole(["admin"]),
  (req, res) => {
    res.json({
      success: true,
      message: `Hello ${req.user.full_name} — admin route ok`,
    });
  },
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal server error",
    code: "SERVER_ERROR",
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
