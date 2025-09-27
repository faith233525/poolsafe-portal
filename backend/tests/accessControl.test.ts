import { describe, it, expect } from "vitest";
import {
  accessControl,
  resolvePermissions,
  ROLE_PERMISSIONS,
} from "../src/middleware/accessControl";

// We test the pure logic indirectly by invoking the middleware with mocked req/res objects.

function runMiddleware(mw: any, req: any = {}, resCapture: any = {}) {
  return new Promise<{ status?: number; body?: any; calledNext: boolean }>((resolve) => {
    const res: any = {
      status(code: number) {
        resCapture.status = code;
        return this;
      },
      json(body: any) {
        resCapture.body = body;
        resolve({ status: resCapture.status, body, calledNext: false });
      },
    };
    mw(req, res, () => resolve({ status: 200, calledNext: true }));
  });
}

describe("accessControl middleware", () => {
  it("allows admin via wildcard", async () => {
    const mw = accessControl({ all: ["ticket:update"] });
    const result = await runMiddleware(mw, { user: { id: "1", role: "admin" } });
    expect(result.calledNext).toBe(true);
  });

  it("denies when missing required ALL permission", async () => {
    const mw = accessControl({ all: ["ticket:update"] });
    const result = await runMiddleware(mw, { user: { id: "1", role: "partner" } });
    expect(result.status).toBe(403);
    expect(result.body?.reason).toBe("MISSING_ALL");
  });

  it("passes when ANY one permission matches", async () => {
    const mw = accessControl({ any: ["ticket:create", "nonexistent:perm"] });
    const result = await runMiddleware(mw, { user: { id: "1", role: "partner" } });
    expect(result.calledNext).toBe(true);
  });

  it("denies if deny list matches", async () => {
    const mw = accessControl({ deny: ["ticket:create"] });
    const result = await runMiddleware(mw, { user: { id: "1", role: "partner" } });
    expect(result.status).toBe(403);
    expect(result.body?.reason).toBe("DENY_MATCH");
  });

  it("resolves permissions union w/out duplicates", () => {
    const base = ROLE_PERMISSIONS["partner"];
    const perms = resolvePermissions("partner", ["ticket:create"]);
    const unique = new Set(perms);
    expect(perms.length).toBe(unique.size);
    expect(perms).toEqual(base); // adding duplicate should not change
  });
});
