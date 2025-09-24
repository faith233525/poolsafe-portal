import rateLimit from "express-rate-limit";
import { config } from "../lib/config";

export const authLoginLimiter = rateLimit({
  windowMs: config.rateLimits.loginWindowMs,
  max: config.rateLimits.loginMax,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const partnerRegisterLimiter = rateLimit({
  windowMs: config.rateLimits.registerWindowMs,
  max: config.rateLimits.registerMax,
  message: { error: "Too many registrations from this IP. Try later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: config.rateLimits.uploadWindowMs,
  max: config.rateLimits.uploadMax,
  message: { error: "Upload rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const notificationCreateLimiter = rateLimit({
  windowMs: config.rateLimits.notificationWindowMs,
  max: config.rateLimits.notificationMax,
  message: { error: "Too many notifications created." },
  standardHeaders: true,
  legacyHeaders: false,
});
