import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

// Simple sanity check against a real route to keep suite healthy
const app = buildApp();

describe("Health endpoint", () => {
  it("returns ok: true", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});
