import dotenv from "dotenv";
import { prisma } from "./prismaClient";
import { env } from "./lib/env";
import { buildApp } from "./app";

dotenv.config();
const app = buildApp();

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
