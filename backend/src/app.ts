import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ticketsRouter } from "./routes/tickets";
import { partnersRouter } from "./routes/partners";
import { attachmentsRouter } from "./routes/attachments";
import { serviceRecordsRouter } from "./routes/serviceRecords";
import { calendarEventsRouter } from "./routes/calendarEvents";
import { knowledgeBaseRouter } from "./routes/knowledgeBase";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { notificationsRouter } from "./routes/notifications";
import { searchRouter } from "./routes/search";
import { hubspotRouter } from "./routes/hubspot";
import { emailRouter } from "./routes/email";
import { analyticsRouter } from "./routes/analytics";
import monitoringRouter from "./routes/monitoring";
import errorsRouter from "./routes/errors";
import { requestLogger } from "./middleware/logger";
import { metricsMiddleware, metricsEndpoint } from "./metrics";
import { performanceMonitor } from "./middleware/monitoring";
import {
  sessionSecurity,
  inputSanitizer,
  contentSecurityPolicy,
  ipSecurityFilter,
  userRateLimit,
} from "./middleware/security";
import { errorHandler } from "./middleware/error";
import { requestId } from "./middleware/requestId";
import { config } from "./lib/config";
// import swaggerRouter from "./routes/swagger";
import { readinessCheck, livenessCheck } from "./lib/health";
import { attachResolvedPermissions } from "./middleware/accessControl";

export function buildApp() {
  const app = express();
  const allowed = config.cors.allowedOrigins;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {return callback(null, true);} // allow server-to-server
        if (allowed.length === 0 || allowed.includes(origin)) {return callback(null, true);}
        return callback(new Error("CORS origin not allowed"));
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
      exposedHeaders: ["X-Request-ID"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );
  app.use(express.json());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: true,
      crossOriginResourcePolicy: { policy: "same-origin" },
      frameguard: { action: "deny" },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
    }),
  );
  // Additional headers (Permissions-Policy & basic CSP if custom not applied yet)
  app.use((_, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), fullscreen=*, payment=()",
    );
    // Fallback minimal CSP - main custom middleware may override
    if (!res.getHeader("Content-Security-Policy")) {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
      );
    }
    next();
  });
  // Basic security event logging
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/users")) {
      console.log(`[SECURITY] Access: ${req.method} ${req.path} by IP ${req.ip}`);
    }
    next();
  });
  app.use(
    rateLimit({
      windowMs: config.rateLimits.globalWindowMs,
      max: config.rateLimits.globalMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(requestId);
  app.use(performanceMonitor);
  app.use(sessionSecurity);
  app.use(inputSanitizer);
  app.use(contentSecurityPolicy);
  app.use(ipSecurityFilter);
  app.use(userRateLimit(200, 15)); // 200 requests per 15 minutes per user
  app.use(requestLogger);
  app.use(metricsMiddleware);
  // Attach resolved permissions if user object is present (after any auth population later in per-route chains)
  app.use(attachResolvedPermissions as any);

  // Fast liveness
  app.get("/api/healthz", (_req, res) => {
    res.json(livenessCheck());
  });
  // Legacy health alias for tests expecting /api/health returning { ok: true }
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  // Readiness (DB + critical deps)
  app.get("/api/readyz", async (_req, res) => {
    const status = await readinessCheck();
    res.status(status.ready ? 200 : 503).json(status);
  });
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/partners", partnersRouter);
  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/service-records", serviceRecordsRouter);
  app.use("/api/calendar-events", calendarEventsRouter);
  app.use("/api/knowledge-base", knowledgeBaseRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/hubspot", hubspotRouter);
  app.use("/api/email", emailRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/monitoring", monitoringRouter);
  app.use("/api/errors", errorsRouter);
  // app.use("/api", swaggerRouter);
  app.use("/api/sso", authRouter);
  app.get("/api/metrics", metricsEndpoint);

  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use(errorHandler);
  return app;
}
