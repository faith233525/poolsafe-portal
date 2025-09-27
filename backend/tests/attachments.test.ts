import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";
import { generateToken, hashPassword } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let token: string;
let ticketId: string;

beforeAll(async () => {
  await prisma.$connect();
  // Use seeded partner and user (do NOT reset the DB - it was seeded in setup.ts)
  const seededPartner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
  const seededUser = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
  if (!seededPartner || !seededUser) {
    throw new Error("Seeded partner or user not found. Check seed script and DB state.");
  }
  token = generateToken(seededUser.id, seededUser.email, seededUser.role, seededPartner.id);
  const ticket = await prisma.ticket.create({
    data: {
      subject: "Upload test",
      description: "Testing upload",
      createdByName: seededUser.email,
      partnerId: seededPartner.id,
    },
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Attachments download and access control", () => {
  let supportToken: string;
  let adminToken: string;
  let attachmentId: string;

  beforeAll(async () => {
    const seededSupport = await prisma.user.findFirst({ where: { role: "SUPPORT" } });
    const seededAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!seededSupport || !seededAdmin) {
      throw new Error("Required test users not found");
    }
    supportToken = generateToken(seededSupport.id, seededSupport.email, seededSupport.role);
    adminToken = generateToken(seededAdmin.id, seededAdmin.email, seededAdmin.role);
    // Create a test attachment using the same logic as upload
    const UPLOAD_DIR = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileContent = "downloadable content";
    const hash = crypto.createHash("sha256").update(fileContent).digest("hex");
    const uploadPath = path.join(UPLOAD_DIR, hash);
    fs.writeFileSync(uploadPath, fileContent);
    const attachment = await prisma.ticketAttachment.create({
      data: {
        filename: "download-test.txt",
        filepath: hash,
        mimetype: "text/plain",
        size: Buffer.byteLength(fileContent),
        ticketId: ticketId,
      },
    });
    attachmentId = attachment.id;
  });

  afterAll(() => {
    const UPLOAD_DIR = path.join(process.cwd(), "uploads");
    const fileContent = "downloadable content";
    const hash = crypto.createHash("sha256").update(fileContent).digest("hex");
    const uploadPath = path.join(UPLOAD_DIR, hash);
    if (fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
  });

  it("allows support to download attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${supportToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe("downloadable content");
  });

  it("allows admin to download attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe("downloadable content");
  });

  it("denies download for unauthenticated user", async () => {
    const res = await request(app).get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(401);
  });

  it("denies download for unrelated partner", async () => {
    // Create a new partner and user
    const otherPartner = await prisma.partner.create({
      data: {
        companyName: "Other Resort",
        managementCompany: "Other Group",
        streetAddress: "1 Other St",
        city: "Other City",
        state: "OT",
        zip: "00000",
        country: "USA",
        numberOfLoungeUnits: 1,
        topColour: "Red",
        latitude: 0,
        longitude: 0,
      },
    });
    const otherUser = await prisma.user.upsert({
      where: { email: "other@resort.com" },
      update: {},
      create: {
        email: "other@resort.com",
        password: await hashPassword("otherpass"),
        displayName: "Other User",
        role: "PARTNER",
        partnerId: otherPartner.id,
      },
    });
    const otherToken = generateToken(
      otherUser.id,
      otherUser.email,
      otherUser.role,
      otherPartner.id,
    );
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect([403, 404]).toContain(res.status); // Should be forbidden or not found
  });
});

describe("Attachments upload", () => {
  it("uploads a file and creates attachment metadata", async () => {
    const tmpFile = path.join(process.cwd(), "temp-upload.txt");
    fs.writeFileSync(tmpFile, "hello world");
    const res = await request(app)
      .post("/api/attachments/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("ticketId", ticketId)
      .attach("file", tmpFile);
    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticketId);
    expect(res.body.filename).toBe("temp-upload.txt");
    fs.unlinkSync(tmpFile);
  });

  it("lists attachments for ticket", async () => {
    const res = await request(app)
      .get(`/api/attachments/ticket/${ticketId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
