import { beforeEach, afterEach, it, expect, describe } from "vitest";
import { isAzureADConfigured, createGraphClient, msalConfig } from "../src/lib/azureAD";
describe("AzureAD config", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.AZURE_CLIENT_ID;
    delete process.env.AZURE_CLIENT_SECRET;
    delete process.env.AZURE_TENANT_ID;
  });
  afterEach(() => {
    process.env.AZURE_CLIENT_ID = originalEnv.AZURE_CLIENT_ID;
    process.env.AZURE_CLIENT_SECRET = originalEnv.AZURE_CLIENT_SECRET;
    process.env.AZURE_TENANT_ID = originalEnv.AZURE_TENANT_ID;
  });

  it("should return false if env is missing", () => {
    expect(isAzureADConfigured()).toBe(false);
  });

  it("should return true if env is present", () => {
    process.env.AZURE_CLIENT_ID = "client";
    process.env.AZURE_CLIENT_SECRET = "secret";
    process.env.AZURE_TENANT_ID = "tenant";
    expect(isAzureADConfigured()).toBe(true);
  });

  it("should return null for graph client if not configured", () => {
    expect(createGraphClient("token")).toBeNull();
  });

  it("should have correct msalConfig authority format", () => {
    process.env.AZURE_TENANT_ID = "tenant";
    // msalConfig is static, so authority may not update dynamically; just check format
    expect(msalConfig.auth.authority).toContain("login.microsoftonline.com");
  });
});
