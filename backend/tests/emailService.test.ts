import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import { env } from "../src/lib/env";
import { EmailService } from "../src/lib/emailService";

describe("EmailService", () => {
  let emailService: EmailService;
  beforeEach(() => {
    vi.resetAllMocks();
    emailService = new EmailService();
  });

  it("should not configure transporter if SMTP env is missing", () => {
    vi.spyOn(env, "SMTP_HOST", "get").mockReturnValue(undefined);
    const service = new EmailService();
    expect(service["isConfigured"]).toBe(false);
  });

  it("should initialize transporter if SMTP env is present", () => {
    vi.spyOn(env, "SMTP_HOST", "get").mockReturnValue("smtp.test.com");
    vi.spyOn(env, "SMTP_PORT", "get").mockReturnValue("587");
    vi.spyOn(env, "SMTP_USER", "get").mockReturnValue("user");
    vi.spyOn(env, "SMTP_PASS", "get").mockReturnValue("pass");
    const service = new EmailService();
    expect(service["isConfigured"]).toBe(true);
  });

  it("should warn and not send email if not configured", async () => {
    // Directly set private property for test
    (emailService as any).isConfigured = false;
    const result = await (emailService as any).sendEmail(
      { to: "test@test.com" },
      { subject: "Test", html: "<b>Test</b>", text: "Test" },
    );
    expect(result).toBe(false);
  });

  it("should call nodemailer.createTransport when configured", () => {
    const spy = vi.spyOn(nodemailer, "createTransport");
    vi.spyOn(env, "SMTP_HOST", "get").mockReturnValue("smtp.test.com");
    vi.spyOn(env, "SMTP_PORT", "get").mockReturnValue("587");
    vi.spyOn(env, "SMTP_USER", "get").mockReturnValue("user");
    vi.spyOn(env, "SMTP_PASS", "get").mockReturnValue("pass");
    new EmailService();
    expect(spy).toHaveBeenCalled();
  });
});
