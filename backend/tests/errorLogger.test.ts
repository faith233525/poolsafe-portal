import { describe, it, expect } from "vitest";
import { persistError } from "../src/services/errorLogger";
import { prisma } from "../src/prismaClient";

describe("persistError", () => {
  it("should persist error with context", async () => {
    const err = new Error("Test error");
    const ctx = {
      severity: "high",
      type: "db",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      context: { foo: "bar" },
    };
    await persistError(err, ctx);
    const log = await prisma.errorLog.findFirst({ where: { message: "Test error" } });
    expect(log).toBeTruthy();
    expect(log?.severity).toBe("high");
    expect(log?.type).toBe("db");
    expect(log?.ipAddress).toBe("127.0.0.1");
    expect(log?.userAgent).toBe("test-agent");
  });

  it("should deduplicate errors by errorId", async () => {
    // Clean up any existing records with this message
    await prisma.errorLog.deleteMany({ where: { message: "Duplicate error" } });

    const err = new Error("Duplicate error");
    await persistError(err);
    await persistError(err);

    const logs = await prisma.errorLog.findMany({ where: { message: "Duplicate error" } });
    expect(logs.length).toBe(1);
    expect(logs[0].count).toBeGreaterThanOrEqual(2);
  });
});
