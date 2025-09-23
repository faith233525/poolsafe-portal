import { describe, it, expect } from "vitest";
import { z } from "zod";

// Duplicate envSchema from config.ts for isolated test
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  UPLOAD_MAX_SIZE_MB: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(2),
  RATE_LIMIT_GLOBAL_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(100),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(60000),
  RATE_LIMIT_LOGIN_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(10),
  RATE_LIMIT_LOGIN_WINDOW_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(60000),
  RATE_LIMIT_REGISTER_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(5),
  RATE_LIMIT_REGISTER_WINDOW_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(60000),
  RATE_LIMIT_UPLOAD_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(10),
  RATE_LIMIT_UPLOAD_WINDOW_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(60000),
  RATE_LIMIT_NOTIFICATIONS_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(20),
  RATE_LIMIT_NOTIFICATIONS_WINDOW_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .default(60000),
  LOG_LEVEL: z.string().default("info"),
});

describe("env validation", () => {
  it("throws if required env vars are missing", () => {
    expect(() => envSchema.parse({})).toThrow();
  });

  it("throws if JWT_SECRET is too short", () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: "sqlite://db",
        JWT_SECRET: "short",
      }),
    ).toThrow();
  });

  it("passes with valid env", () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: "sqlite://db",
        JWT_SECRET: "supersecretkey123",
      }),
    ).not.toThrow();
  });
});
