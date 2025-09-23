import client from "prom-client";
import { Request, Response, NextFunction } from "express";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
});

export const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP error responses",
  labelNames: ["method", "route", "status"],
});

export const uploadsTotal = new client.Counter({
  name: "uploads_total",
  help: "Total successful attachment uploads",
  labelNames: ["userRole"],
});

export const notificationsCreatedTotal = new client.Counter({
  name: "notifications_created_total",
  help: "Total notifications created",
  labelNames: ["creatorRole", "type"],
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationMs);
register.registerMetric(httpErrorsTotal);
register.registerMetric(uploadsTotal);
register.registerMetric(notificationsCreatedTotal);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const route = (req as any).route?.path || req.path || "unknown";
    const status = res.statusCode;
    const labels = { method: req.method, route, status: String(status) } as any;
    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, Date.now() - start);
    if (status >= 400) httpErrorsTotal.inc(labels);
  });
  next();
}

export function metricsEndpoint(_req: Request, res: Response) {
  res.set("Content-Type", register.contentType);
  res.send(register.metrics());
}

export { register };
