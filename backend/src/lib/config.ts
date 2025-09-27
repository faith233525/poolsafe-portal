import { z } from "zod";
import { env as coreEnv } from "./env";

// intFromEnv is not used, so removed to fix lint warning

// Validate only the optional tuning knobs; DB/JWT are provided by core env loader
const envSchema = z.object({
  ALLOWED_ORIGINS: z.string().optional(),
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
  databaseUrl: coreEnv.DATABASE_URL,
  jwtSecret: coreEnv.JWT_SECRET,
};
