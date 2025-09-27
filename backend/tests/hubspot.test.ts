import { beforeEach, afterEach, describe, it, expect, vi as _vi } from "vitest";
import { getHubSpotClient, isHubSpotConfigured, syncPartnerToHubSpot } from "../src/lib/hubspot";
describe("HubSpot integration", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.HUBSPOT_API_KEY = "";
  });
  afterEach(() => {
    process.env.HUBSPOT_API_KEY = originalEnv.HUBSPOT_API_KEY;
  });

  it("should return false if API key is missing", () => {
    expect(isHubSpotConfigured()).toBe(false);
  });

  it("should return true if API key is present", () => {
    process.env.HUBSPOT_API_KEY = "key";
    expect(isHubSpotConfigured()).toBe(true);
  });

  it("should return null client if API key is missing", () => {
    expect(getHubSpotClient()).toBeNull();
  });

  it("should warn and return null when syncing partner if not configured", async () => {
    const result = await syncPartnerToHubSpot({ companyName: "Test", userEmail: "test@test.com" });
    expect(result).toBeNull();
  });
});
