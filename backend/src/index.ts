import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ticketsRouter } from "./routes/tickets";
import { partnersRouter } from "./routes/partners";
import { attachmentsRouter } from "./routes/attachments";
import { serviceRecordsRouter } from "./routes/serviceRecords";
import { calendarEventsRouter } from "./routes/calendarEvents";
import { knowledgeBaseRouter } from "./routes/knowledgeBase";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { prisma } from "./prismaClient";
import { env } from "./lib/env";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/error";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(requestLogger);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Authentication routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

// Feature routes
app.use("/api/tickets", ticketsRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/service-records", serviceRecordsRouter);
app.use("/api/calendar-events", calendarEventsRouter);
app.use("/api/knowledge-base", knowledgeBaseRouter);

// 404 handler (basic)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Central error handler
app.use(errorHandler);

const port = env.PORT;
const server = app.listen(port, async () => {
  console.log(`Server running on ${port}`);
  try {
    await prisma.$connect();
    console.log("Prisma connected");
  } catch (e) {
    console.error("Prisma connection failed", e);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
