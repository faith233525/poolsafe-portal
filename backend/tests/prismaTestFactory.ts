import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

export function createPrismaTestClient(dbFile: string) {
  process.env.DATABASE_URL = `file:./${dbFile}`;
  // Ensure schema is applied (use db push for speed in dev/tests)
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "ignore" });
  } catch {
    // swallow for test env
  }
  return new PrismaClient();
}
