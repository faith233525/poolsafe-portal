import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

export const prisma: PrismaClient = new PrismaClient();

export function setPrismaClient(client: PrismaClient) {
  prismaInstance = client;
}

export function getPrismaClient(): PrismaClient {
  return prismaInstance || prisma;
}
