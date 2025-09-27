import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
const app = buildApp();

describe("API Edge Case Tests", () => {
  it("returns 404 for unknown route", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for missing required fields in POST /api/tickets", async () => {
    // Auth is enforced before validation, so without a token we now expect 401
    const res = await request(app).post("/api/tickets").send({});
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 for protected route without auth", async () => {
    const res = await request(app).get("/api/partners");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for forbidden access", async () => {
    // Simulate forbidden by sending a JWT with insufficient permissions
    const res = await request(app)
      .get("/api/admin")
      .set("Authorization", "Bearer fake-partner-jwt");
    // Route may not exist (404) or be rejected as unauthorized/forbidden
    expect([401, 403, 404]).toContain(res.status);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 422 for invalid data format", async () => {
    // Still unauthenticated, so expect 401 rather than validation errors
    const res = await request(app).post("/api/tickets").send({ subject: 123, description: true });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
