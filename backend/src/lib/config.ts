import { z } from "zod";
import { env as coreEnv } from "./env";

// intFromEnv is not used, so removed to fix lint warning

// Validate only the optional tuning knobs; DB/JWT are provided by core env loader
const numericEnv = (def: number) =>
  z
    .union([z.string().regex(/^\d+$/), z.undefined()])
    .transform((v) => (v === undefined ? def : Number(v)));

const envSchema = z.object({
  ALLOWED_ORIGINS: z.string().optional(),
  UPLOAD_MAX_SIZE_MB: numericEnv(2),
  RATE_LIMIT_GLOBAL_MAX: numericEnv(100),
  RATE_LIMIT_GLOBAL_WINDOW_MS: numericEnv(60000),
  RATE_LIMIT_LOGIN_MAX: numericEnv(10),
  RATE_LIMIT_LOGIN_WINDOW_MS: numericEnv(60000),
  RATE_LIMIT_REGISTER_MAX: numericEnv(5),
  RATE_LIMIT_REGISTER_WINDOW_MS: numericEnv(60000),
  RATE_LIMIT_UPLOAD_MAX: numericEnv(10),
  RATE_LIMIT_UPLOAD_WINDOW_MS: numericEnv(60000),
  RATE_LIMIT_NOTIFICATIONS_MAX: numericEnv(20),
  RATE_LIMIT_NOTIFICATIONS_WINDOW_MS: numericEnv(60000),
  LOG_LEVEL: z.string().default("info"),
});

const env = envSchema.parse(process.env);

export const config = {
  cors: {
    allowedOrigins: (env.ALLOWED_ORIGINS?.split(/[,\s]+/) || []).filter(Boolean),
  },
  upload: {
    maxSizeBytes: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
  },
  rateLimits: {
    globalWindowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
    globalMax: env.RATE_LIMIT_GLOBAL_MAX,
    loginWindowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
    loginMax: env.RATE_LIMIT_LOGIN_MAX,
    registerWindowMs: env.RATE_LIMIT_REGISTER_WINDOW_MS,
    registerMax: env.RATE_LIMIT_REGISTER_MAX,
    uploadWindowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
    uploadMax: env.RATE_LIMIT_UPLOAD_MAX,
    notificationWindowMs: env.RATE_LIMIT_NOTIFICATIONS_WINDOW_MS,
    notificationMax: env.RATE_LIMIT_NOTIFICATIONS_MAX,
  },
  logLevel: env.LOG_LEVEL,
  databaseUrl: (() => {
    // If user explicitly sets empty string, treat as error (ignore dev fallback)
    if (typeof process.env.DATABASE_URL !== "undefined" && process.env.DATABASE_URL.trim() === "") {
      throw new Error("DATABASE_URL is required and must be non-empty");
    }
    if (!coreEnv.DATABASE_URL || coreEnv.DATABASE_URL.trim() === "") {
      throw new Error("DATABASE_URL is required and must be non-empty");
    }
    return coreEnv.DATABASE_URL;
  })(),
  jwtSecret: (() => {
    if (!coreEnv.JWT_SECRET || coreEnv.JWT_SECRET.length < 10) {
      throw new Error("JWT_SECRET must be at least 10 characters");
    }
    return coreEnv.JWT_SECRET;
  })(),
};
