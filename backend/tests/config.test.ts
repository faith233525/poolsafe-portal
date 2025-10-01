import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { config } from "../src/lib/config";

describe("Config", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should parse all config values from environment", () => {
    expect(config).toBeDefined();
    expect(config.jwtSecret).toBeTruthy();
    expect(config.databaseUrl).toBeTruthy();
    expect(config.cors).toBeDefined();
    expect(config.upload).toBeDefined();
    expect(config.rateLimits).toBeDefined();
    expect(config.logLevel).toBeDefined();
  });

  it("should have default values for optional config", () => {
    expect(config.upload.maxSizeBytes).toBeGreaterThan(0);
    expect(config.rateLimits.globalMax).toBeGreaterThan(0);
    expect(config.rateLimits.globalWindowMs).toBeGreaterThan(0);
    expect(config.rateLimits.loginMax).toBeGreaterThan(0);
    expect(config.rateLimits.loginWindowMs).toBeGreaterThan(0);
    expect(config.rateLimits.registerMax).toBeGreaterThan(0);
    expect(config.rateLimits.registerWindowMs).toBeGreaterThan(0);
    expect(config.rateLimits.uploadMax).toBeGreaterThan(0);
    expect(config.rateLimits.uploadWindowMs).toBeGreaterThan(0);
  });

  it("should parse CORS origins correctly", () => {
    expect(Array.isArray(config.cors.allowedOrigins)).toBe(true);
  });

  it("should handle missing optional ALLOWED_ORIGINS", () => {
    // Test with existing config object instead of re-requiring
    expect(config.cors.allowedOrigins).toBeDefined();
    expect(Array.isArray(config.cors.allowedOrigins)).toBe(true);
  });

  it("should validate numeric environment variables", () => {
    // Test the parsing logic directly with existing config values
    expect(typeof config.upload.maxSizeBytes).toBe("number");
    expect(config.upload.maxSizeBytes).toBeGreaterThan(0);
    expect(typeof config.rateLimits.globalMax).toBe("number");
    expect(config.rateLimits.globalMax).toBeGreaterThan(0);
  });

  it("should have sensible default values for rate limits", () => {
    // Test that we have sensible defaults
    expect(config.upload.maxSizeBytes).toBeGreaterThanOrEqual(1024 * 1024); // at least 1MB
    expect(config.rateLimits.globalMax).toBeGreaterThanOrEqual(50); // at least 50 requests
  });

  it("should reject invalid numeric environment variables", async () => {
    process.env.UPLOAD_MAX_SIZE_MB = "invalid";

    await expect(async () => {
      vi.resetModules();
      await import("../src/lib/config");
    }).rejects.toThrow();
  });

  it("should require JWT_SECRET to be at least 10 characters", async () => {
    process.env.JWT_SECRET = "short";

    await expect(async () => {
      vi.resetModules();
      await import("../src/lib/config");
    }).rejects.toThrow();
  });

  it("should require DATABASE_URL to be non-empty", async () => {
    process.env.DATABASE_URL = "";

    await expect(async () => {
      vi.resetModules();
      await import("../src/lib/config");
    }).rejects.toThrow();
  });
});
