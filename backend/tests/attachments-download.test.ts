import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-tickets.db");
let partnerTokenA: string;
let partnerTokenB: string;
let supportToken: string;
let attachmentId: string;

beforeAll(async () => {
  await prisma.$connect();
  await resetDb(prisma);
  const partnerA = await prisma.partner.create({ data: { companyName: "Partner A" } });
  const partnerB = await prisma.partner.create({ data: { companyName: "Partner B" } });

  const userA = await prisma.user.create({
    data: {
      email: "a@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partnerA.id,
    },
  });
  const userB = await prisma.user.create({
    data: {
      email: "b@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partnerB.id,
    },
  });
  const supportUser = await prisma.user.create({
    data: { email: "s@example.com", password: await hashPassword("Password123!"), role: "SUPPORT" },
  });
  partnerTokenA = generateToken(userA.id, userA.email, userA.role, partnerA.id);
  partnerTokenB = generateToken(userB.id, userB.email, userB.role, partnerB.id);
  supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);

  const ticket = await prisma.ticket.create({
    data: {
      subject: "Download",
      description: "Test",
      createdByName: userA.email,
      partnerId: partnerA.id,
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
