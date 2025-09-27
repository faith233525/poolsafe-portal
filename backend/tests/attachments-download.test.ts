import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { buildApp } from "../src/app";
import { resetDb as _resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword as _hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let partnerTokenA: string;
let partnerTokenB: string;
let supportToken: string;
let attachmentId: string;

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partners and users (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartnerA = await prisma.partner.findFirst({
    where: { companyName: "Test Resort 1" },
  });
  const seededPartnerB = await prisma.partner.findFirst({
    where: { companyName: "Test Resort 2" },
  });
  const seededUserA = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
  const seededUserB = await prisma.user.findFirst({ where: { email: "manager2@testresort.com" } });
  const supportUser = await prisma.user.findFirst({ where: { email: "support@poolsafe.com" } });
  if (!seededPartnerA || !seededPartnerB || !seededUserA || !seededUserB || !supportUser) {
    throw new Error("Seeded partner or user not found. Check seed script and DB state.");
  }
  partnerTokenA = generateToken(
    seededUserA.id,
    seededUserA.email,
    seededUserA.role,
    seededPartnerA.id,
  );
  partnerTokenB = generateToken(
    seededUserB.id,
    seededUserB.email,
    seededUserB.role,
    seededPartnerB.id,
  );
  supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);

  const ticket = await prisma.ticket.create({
    data: {
      subject: "Download",
      description: "Test",
      createdByName: seededUserA.email,
      partnerId: seededPartnerA.id,
    },
  });

  // create fake file in uploads dir
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const storedName = Date.now() + "-sample.txt";
  const fullPath = path.join(uploadsDir, storedName);
  fs.writeFileSync(fullPath, "sample content");

  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId: ticket.id,
      filename: "sample.txt",
      filepath: storedName,
      mimetype: "text/plain",
      size: 14,
    },
  });
  attachmentId = attachment.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Attachment download authorization", () => {
  it("denies other partner", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${partnerTokenB}`);
    expect(res.status).toBe(403);
  });

  it("allows owning partner", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${partnerTokenA}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("allows support staff", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${supportToken}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 for nonexistent id", async () => {
    const res = await request(app)
      .get(`/api/attachments/00000000-0000-0000-0000-000000000000/download`)
      .set("Authorization", `Bearer ${partnerTokenA}`);
    // Could be 404 or 403; we defined 404 in route when record absent
    expect(res.status).toBe(404);
  });
});
