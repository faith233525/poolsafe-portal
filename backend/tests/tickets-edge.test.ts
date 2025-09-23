import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-tickets.db");
let token: string;
let partnerId: string;

beforeAll(async () => {
  await prisma.$connect();
  const partner = await prisma.partner.create({ data: { companyName: "Edge Partner" } });
  partnerId = partner.id;
  const user = await prisma.user.create({
    data: {
      email: "edgecase@example.com",
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
