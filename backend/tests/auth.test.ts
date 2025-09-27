import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partner (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
  if (!seededPartner) throw new Error("Seeded partner not found. Check seed script and DB state.");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth Partner Login", () => {
  it("logs in with valid credentials (companyName login)", async () => {
    // Partner login endpoint authenticates by companyName (username) and partner plain password.
    // Seed script creates partner 'Test Resort 1' with default password 'partner123'.
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ username: "Test Resort 1", password: "partner123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    // Returned 'email' field is companyName per route implementation.
    expect(res.body.user.email).toBe("Test Resort 1");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ username: "Test Resort 1", password: "Wrong" });
    expect(res.status).toBe(401);
  });
});
