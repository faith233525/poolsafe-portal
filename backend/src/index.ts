import dotenv from "dotenv";
import { prisma } from "./prismaClient";
import { env } from "./lib/env";
import { buildApp } from "./app";

dotenv.config();
const app = buildApp();

const port = typeof env.PORT === "string" ? parseInt(env.PORT, 10) : env.PORT;
const host = process.env.HOST || "0.0.0.0";
const server = app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
  void prisma
    .$connect()
    .then(() => console.log("Prisma connected"))
    .catch((e) => console.error("Prisma connection failed", e));
});

server.on("error", (err) => {
  console.error("HTTP server error:", err);
});

// Allow disabling graceful shutdown hooks for local testing if some tools send signals
// Set ENABLE_SHUTDOWN=false to skip registering signal handlers
const ENABLE_SHUTDOWN = (process.env.ENABLE_SHUTDOWN ?? "true").toLowerCase() !== "false";

if (ENABLE_SHUTDOWN) {
  let shuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = 10000;
  // Graceful shutdown
  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log("[shutdown] Initiating graceful shutdown...");
    // Stop accepting new connections
    server.close(() => {
      console.log("[shutdown] HTTP server closed");
    });
    void prisma
      .$disconnect()
      .then(() => console.log("[shutdown] Prisma disconnected"))
      .catch((e) => console.error("[shutdown] Error during prisma disconnect", e));
    // Fallback hard exit after timeout
    setTimeout(() => {
      console.log("[shutdown] Forcing process exit after timeout");
      process.exit(0);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  console.log("[startup] Graceful shutdown disabled (ENABLE_SHUTDOWN=false)");
}
