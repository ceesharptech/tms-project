require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ddits-backend",
    timestamp: new Date().toISOString(),
  });
});

// API routes (to be mounted in later phases)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/drivers', require('./routes/drivers'));
// app.use('/api/offences', require('./routes/offences'));
// app.use('/api/offence-types', require('./routes/offenceTypes'));
// app.use('/api/penalty-rules', require('./routes/penaltyRules'));
// app.use('/api/analytics', require('./routes/analytics'));
// app.use('/api/audit-logs', require('./routes/auditLogs'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
