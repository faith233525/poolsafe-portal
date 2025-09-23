import dotenv from "dotenv";

dotenv.config();

interface EnvShape {
  NODE_ENV: string;
  PORT: string | number;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env: EnvShape = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
};

export const isProd = env.NODE_ENV === "production";