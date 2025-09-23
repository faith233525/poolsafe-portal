import request from "supertest";
import { buildApp } from "../src/app";

const app = buildApp();

describe("Security edge cases", () => {
  it("should block requests exceeding rate limit", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "badpass" });
    }
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "badpass" });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate/i);
  });

  it("should reject oversize file upload", async () => {
    const token = "Bearer FAKE"; // Replace with valid token if available
    const bigBuffer = Buffer.alloc(2 * 1024 * 1024, 1); // 2MB
    const res = await request(app)
      .post("/api/attachments/upload")
      .set("Authorization", token)
      .field("ticketId", "00000000-0000-0000-0000-000000000000")
      .attach("file", bigBuffer, { filename: "big.pdf" });
    expect([413, 400, 422]).toContain(res.status);
  });

  it("should block unauthorized attachment download", async () => {
    const res = await request(app).get("/api/attachments/some-id/download");
    expect([401, 403]).toContain(res.status);
  });

  it("should reject invalid JWT", async () => {
    const res = await request(app).get("/api/tickets").set("Authorization", "Bearer BADTOKEN");
    expect([401, 403]).toContain(res.status);
  });
});
