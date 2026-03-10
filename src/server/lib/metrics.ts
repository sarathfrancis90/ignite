import client from "prom-client";

const register = new client.Registry();

register.setDefaultLabels({
  app: "ignite",
});

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestErrors = new client.Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP request errors",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

export const jobQueueDepth = new client.Gauge({
  name: "job_queue_depth",
  help: "Number of jobs waiting in the queue",
  labelNames: ["queue_name"] as const,
  registers: [register],
});

export { register };
