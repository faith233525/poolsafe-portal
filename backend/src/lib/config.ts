import { z } from "zod";

function intFromEnv(key: string, def: number) {
  const v = process.env[key];
  if (!v) return def;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
}

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

const env = envSchema.parse(process.env);

export const config = {
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
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
};
