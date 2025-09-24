import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { generateToken } from "../src/utils/auth";

const app = buildApp();
const partnerId = undefined;
let token: string;
const prisma = createPrismaTestClient("test-auth.db");

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partner and user (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
  const seededUser = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
  if (!seededPartner || !seededUser) {
    throw new Error("Seeded partner or user not found. Check seed script and DB state.");
  }
  token = generateToken(seededUser.id, seededUser.email, seededUser.role, seededPartner.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Ticket lifecycle", () => {
  it("creates a ticket (partner)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Connectivity Issue", description: "Cannot connect" });
    expect(res.status).toBe(201);
    expect(res.body.subject).toBe("Connectivity Issue");
  });

  it("validates missing subject", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Missing subject" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});
