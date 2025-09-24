import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword } from "../src/utils/auth";

const app = buildApp();
let partnerId: string;
const prisma = createPrismaTestClient("test-auth.db");

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partner and user (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
  if (!seededPartner) throw new Error("Seeded partner not found. Check seed script and DB state.");
  partnerId = seededPartner.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth Partner Login", () => {
  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ email: "manager1@testresort.com", password: "partner123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("manager1@testresort.com");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ email: "manager1@testresort.com", password: "Wrong" });
    expect(res.status).toBe(401);
  });
});
