import { PrismaClient } from "@prisma/client";
export function createPrismaTestClient(dbFile: string) {
  const databaseUrl = `file:./${dbFile}`;

  // Create Prisma client with explicit database URL
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
