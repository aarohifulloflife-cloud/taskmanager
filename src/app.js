// Express application. Exported WITHOUT calling listen() so that Supertest
// can import it directly for integration tests. server.js starts it.

const path = require("path");
const express = require("express");

const { register, metricsMiddleware } = require("./metrics");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();

app.use(express.json());
app.use(metricsMiddleware);

// Static front-end (the original To-Do UI, now talking to this API)
app.use(express.static(path.join(__dirname, "..", "public")));

// Health check — used by Docker, Jenkins Deploy stage, and uptime monitoring
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Prometheus scrape endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

module.exports = app;
