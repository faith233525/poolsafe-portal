import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";
import { generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let token: string;

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partner and user
  const seededPartner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 2" } });
  const seededUser = await prisma.user.findFirst({ where: { email: "manager2@testresort.com" } });
  if (!seededPartner || !seededUser) {
    throw new Error("Seeded partner or user not found. Check seed script and DB state.");
  }
  token = generateToken(seededUser.id, seededUser.email, seededUser.role, seededPartner.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Ticket edge cases", () => {
  it("rejects invalid priority value", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Test", priority: "INVALID" });
    expect([400, 422]).toContain(res.status);
  });

  it("rejects missing subject", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "No subject" });
    expect([400, 422]).toContain(res.status);
  });

  it("accepts max priority value", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Max priority", priority: "HIGH" });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe("HIGH");
  });

  it("accepts min priority value", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Min priority", priority: "LOW" });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe("LOW");
  });
});
