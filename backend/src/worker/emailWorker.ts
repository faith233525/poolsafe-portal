import dotenv from "dotenv";
import { prisma } from "../prismaClient";
import { startEmailToTicketService } from "../services/emailToTicket";

// Load environment variables
dotenv.config();

const ENABLE_WORKER = (process.env.EMAIL_WORKER_ENABLED ?? "true").toLowerCase() !== "false";

async function main() {
  console.log("[email-worker] starting...", { ENABLE_WORKER });
  // Connect Prisma proactively so first ticket creation is fast
  try {
    await prisma.$connect();
    console.log("[email-worker] Prisma connected");
  } catch (e) {
    console.error("[email-worker] Prisma connection failed", e);
  }

  if (!ENABLE_WORKER) {
    console.log("[email-worker] disabled via EMAIL_WORKER_ENABLED=false");
    return;
  }

  try {
    void startEmailToTicketService();
    console.log("[email-worker] IMAP listener started");
  } catch (e) {
    console.error("[email-worker] failed to start IMAP listener", e);
    process.exitCode = 1;
  }
}

void main().catch((e) => {
  console.error("[email-worker] fatal error", e);
  process.exitCode = 1;
});

// Graceful shutdown
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log("[email-worker] shutting down...");
  void prisma
    .$disconnect()
    .then(() => console.log("[email-worker] Prisma disconnected"))
    .catch((e) => console.error("[email-worker] Prisma disconnect error", e))
    .finally(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
