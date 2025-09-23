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
  await resetDb(prisma);
  const partner = await prisma.partner.create({
    data: { companyName: "Test Partner" },
  });
  partnerId = partner.id;
  await prisma.user.create({
    data: {
      email: "partner@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner.id,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth Partner Login", () => {
  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ email: "partner@example.com", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("partner@example.com");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login/partner")
      .send({ email: "partner@example.com", password: "Wrong" });
    expect(res.status).toBe(401);
  });
});
