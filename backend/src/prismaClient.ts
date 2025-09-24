import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

// Create Prisma client - during tests, use test database URL from environment
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
export const prisma: PrismaClient = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

export function setPrismaClient(client: PrismaClient) {
  prismaInstance = client;
}

export function getPrismaClient(): PrismaClient {
  return prismaInstance || prisma;
}
