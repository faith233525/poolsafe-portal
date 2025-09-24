import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

export function createPrismaTestClient(dbFile: string) {
  const databaseUrl = `file:./${dbFile}`;

  // Ensure schema is applied (use db push for speed in dev/tests)
  try {
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  } catch {
    // swallow for test env
  }

  // Create Prisma client with explicit database URL
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
