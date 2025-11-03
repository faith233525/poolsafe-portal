import rateLimit from "express-rate-limit";
import { config } from "../lib/config";

export const authLoginLimiter = rateLimit({
  windowMs: config.rateLimits.loginWindowMs,
  max: config.rateLimits.loginMax,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  // Allow Cypress and test orchestration to bypass rate limits
  skip: (req) =>
    req.headers["x-bypass-ratelimit"] === "true" ||
    // Allow Cypress runner to bypass limits by detecting its user agent
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("Cypress/")) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true",
});

export const partnerRegisterLimiter = rateLimit({
  windowMs: config.rateLimits.registerWindowMs,
  max: config.rateLimits.registerMax,
  message: { error: "Too many registrations from this IP. Try later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.headers["x-bypass-ratelimit"] === "true" ||
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("Cypress/")) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true",
});

export const uploadLimiter = rateLimit({
  windowMs: config.rateLimits.uploadWindowMs,
  max: config.rateLimits.uploadMax,
  message: { error: "Upload rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.headers["x-bypass-ratelimit"] === "true" ||
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("Cypress/")) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true",
});

export const notificationCreateLimiter = rateLimit({
  windowMs: config.rateLimits.notificationWindowMs,
  max: config.rateLimits.notificationMax,
  message: { error: "Too many notifications created." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.headers["x-bypass-ratelimit"] === "true" ||
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("Cypress/")) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true",
});
