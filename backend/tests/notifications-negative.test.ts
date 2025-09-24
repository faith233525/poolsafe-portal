import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let partnerToken: string;
let supportToken: string;
let otherPartnerToken: string;
let targetUserId: string;

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partners and users (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartner1 = await prisma.partner.findFirst({
    where: { companyName: "Test Resort 1" },
  });
  const seededPartner2 = await prisma.partner.findFirst({
    where: { companyName: "Test Resort 2" },
  });
  const seededUser1 = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
  const seededUser2 = await prisma.user.findFirst({ where: { email: "manager2@testresort.com" } });
  const supportUser = await prisma.user.findFirst({ where: { email: "support@poolsafe.com" } });
  if (!seededPartner1 || !seededPartner2 || !seededUser1 || !seededUser2 || !supportUser) {
    throw new Error("Seeded partner or user not found. Check seed script and DB state.");
  }
  targetUserId = seededUser1.id;
  partnerToken = generateToken(
    seededUser1.id,
    seededUser1.email,
    seededUser1.role,
    seededPartner1.id,
  );
  otherPartnerToken = generateToken(
    seededUser2.id,
    seededUser2.email,
    seededUser2.role,
    seededPartner2.id,
  );
  supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);

  // Create a notification for user1
  await prisma.notification.create({
    data: { userId: targetUserId, type: "INFO", title: "t", message: "m" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Notifications negative cases", () => {
  it("prevents partner from querying another partner's notifications via userId override", async () => {
    const res = await request(app)
      .get(`/api/notifications?userId=${targetUserId}`)
      .set("Authorization", `Bearer ${otherPartnerToken}`);
    // Should ignore override and return empty list
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("prevents partner from creating a notification", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${partnerToken}`)
      .send({ userId: targetUserId, type: "INFO", title: "x", message: "y" });
    expect(res.status).toBe(403);
  });

  it("allows support to create notification", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${supportToken}`)
      .send({ userId: targetUserId, type: "INFO", title: "Test Notification", message: "y" });
    expect(res.status).toBe(201);
  });
});
