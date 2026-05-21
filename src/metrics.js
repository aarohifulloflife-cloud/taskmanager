// Prometheus metrics. Exposes default Node process metrics plus a few
// custom ones so the Monitoring stage has real data to scrape and alert on.

const client = require("prom-client");

const register = new client.Registry();
register.setDefaultLabels({ app: "taskmanager-api" });
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [register],
});

const tasksTotal = new client.Gauge({
  name: "tasks_total",
  help: "Current number of tasks stored",
  registers: [register],
});

// Express middleware that records request count and latency per route.
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

module.exports = { register, metricsMiddleware, tasksTotal };
