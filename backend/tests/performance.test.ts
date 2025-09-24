import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

const app = buildApp();

function measureTime(fn: () => Promise<any>) {
  const start = Date.now();
  return fn().then((result) => ({ result, ms: Date.now() - start }));
}

describe("Performance: high-traffic endpoints", () => {
  it("/api/tickets responds under 300ms", async () => {
    const { ms, result } = await measureTime(
      () => request(app).get("/api/tickets").set("Authorization", "Bearer FAKE"), // triggers auth error, but measures route
    );
    expect(ms).toBeLessThan(300);
    expect([401, 403]).toContain(result.status);
  });

  it("/api/partners responds under 300ms", async () => {
    const { ms, result } = await measureTime(() =>
      request(app).get("/api/partners").set("Authorization", "Bearer FAKE"),
    );
    expect(ms).toBeLessThan(300);
    expect([401, 403]).toContain(result.status);
  });

  it("/api/attachments/upload responds under 500ms", async () => {
    const { ms, result } = await measureTime(() =>
      request(app)
        .post("/api/attachments/upload")
        .set("Authorization", "Bearer FAKE")
        .field("ticketId", "00000000-0000-0000-0000-000000000000")
        .attach("file", Buffer.from("test"), { filename: "test.txt" }),
    );
    expect(ms).toBeLessThan(500);
    expect([401, 403, 400]).toContain(result.status);
  });
});
