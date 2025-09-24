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
import { requestLogger } from "./middleware/logger";
import { metricsMiddleware, metricsEndpoint } from "./metrics";
import { errorHandler } from "./middleware/error";
import { requestId } from "./middleware/requestId";
import { config } from "./lib/config";

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: config.rateLimits.globalWindowMs,
      max: config.rateLimits.globalMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(requestId);
  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.get("/api/health", (req, res) => res.json({ ok: true }));
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
  app.get("/api/metrics", metricsEndpoint);

  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use(errorHandler);
  return app;
}
