import client from "prom-client";
import { Request, Response, NextFunction } from "express";

type MetricsBundle = {
  register: client.Registry;
  httpRequestsTotal: client.Counter;
  httpRequestDurationMs: client.Histogram;
  httpErrorsTotal: client.Counter;
  uploadsTotal: client.Counter;
  notificationsCreatedTotal: client.Counter;
  httpStatusClassTotal: client.Counter;
  dbQueryDurationMs: client.Histogram;
  authzDeniedTotal: client.Counter;
};

const g = globalThis as any;

if (!g.__PS_METRICS__) {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [register],
  });

  const httpRequestDurationMs = new client.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "status"],
    buckets: [1, 3, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
    registers: [register],
  });
  const dbQueryDurationMs = new client.Histogram({
    name: "db_query_duration_ms",
    help: "Duration of database (Prisma) queries in ms",
    labelNames: ["model", "action", "success"],
    buckets: [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000],
    registers: [register],
  });

  const httpErrorsTotal = new client.Counter({
    name: "http_errors_total",
    help: "Total number of HTTP error responses",
    labelNames: ["method", "route", "status"],
    registers: [register],
  });

  const uploadsTotal = new client.Counter({
    name: "uploads_total",
    help: "Total successful attachment uploads",
    labelNames: ["userRole"],
    registers: [register],
  });

  const notificationsCreatedTotal = new client.Counter({
    name: "notifications_created_total",
    help: "Total notifications created",
    labelNames: ["creatorRole", "type"],
    registers: [register],
  });

  const httpStatusClassTotal = new client.Counter({
    name: "http_status_class_total",
    help: "HTTP responses aggregated by status class (2xx,3xx,4xx,5xx)",
    labelNames: ["method", "route", "class"],
    registers: [register],
  });

  const authzDeniedTotal = new client.Counter({
    name: "authz_denied_total",
    help: "Total number of authorization denials (access control middleware)",
    labelNames: ["method", "route", "reason", "role"],
    registers: [register],
  });

  g.__PS_METRICS__ = {
    register,
    httpRequestsTotal,
    httpRequestDurationMs,
    httpErrorsTotal,
    uploadsTotal,
    notificationsCreatedTotal,
    httpStatusClassTotal,
    dbQueryDurationMs,
    authzDeniedTotal,
  } as MetricsBundle;
}

const {
  register,
  httpRequestsTotal,
  httpRequestDurationMs,
  httpErrorsTotal,
  uploadsTotal,
  notificationsCreatedTotal,
  httpStatusClassTotal,
  dbQueryDurationMs,
  authzDeniedTotal,
} = g.__PS_METRICS__ as MetricsBundle;

export {
  register,
  httpRequestsTotal,
  httpRequestDurationMs,
  httpErrorsTotal,
  uploadsTotal,
  notificationsCreatedTotal,
  httpStatusClassTotal,
  dbQueryDurationMs,
  authzDeniedTotal,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const route = (req as any).route?.path || req.path || "unknown";
    const status = res.statusCode;
    const labels = { method: req.method, route, status: String(status) } as any;
    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, Date.now() - start);
    if (status >= 400) {httpErrorsTotal.inc(labels);}
    const klass = `${Math.floor(status / 100)}xx`;
    httpStatusClassTotal.inc({ method: req.method, route, class: klass });
  });
  next();
}

export function metricsEndpoint(_req: Request, res: Response) {
  res.set("Content-Type", register.contentType);
  res.send(register.metrics());
}
