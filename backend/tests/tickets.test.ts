import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
let partnerId: string;
let token: string;
const prisma = createPrismaTestClient("test-tickets.db");

beforeAll(async () => {
  await prisma.$connect();
  await resetDb(prisma);
  const partner = await prisma.partner.create({
    data: { companyName: "Ticket Partner" },
  });
  partnerId = partner.id;
  const user = await prisma.user.create({
    data: {
      email: "ticket_partner@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner.id,
    },
  });
  token = generateToken(user.id, user.email, user.role, partner.id);
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
