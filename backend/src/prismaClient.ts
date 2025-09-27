import { PrismaClient } from "@prisma/client";
import { dbQueryDurationMs } from "./metrics";
// Prisma instrumentation: guard if $use is unavailable in current client build

let prismaInstance: PrismaClient | null = null;

// Create Prisma client - during tests, use test database URL from environment
// Default to local SQLite in prisma/dev.db for development
const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
export const prisma: PrismaClient = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Attach middleware only if available (older generated clients may lack $use)
if (typeof (prisma as any).$use === "function") {
  (prisma as any).$use(async (params: any, next: any) => {
    const start = Date.now();
    let success = true;
    try {
      const result = await next(params);
      return result;
    } catch (e) {
      success = false;
      throw e;
    } finally {
      const duration = Date.now() - start;
      try {
        dbQueryDurationMs.observe(
          { model: params.model || "raw", action: params.action, success: String(success) },
          duration,
        );
      } catch {
        /* metric failure ignored */
      }
    }
  });
}

export function setPrismaClient(client: PrismaClient) {
  prismaInstance = client;
}

export function getPrismaClient(): PrismaClient {
  return prismaInstance || prisma;
}
