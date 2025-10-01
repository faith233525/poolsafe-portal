import dotenv from "dotenv";

dotenv.config();

interface EnvShape {
  NODE_ENV: string;
  PORT: string | number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  // Azure AD / Outlook SSO
  AZURE_CLIENT_ID?: string;
  AZURE_CLIENT_SECRET?: string;
  AZURE_TENANT_ID?: string;
  AZURE_REDIRECT_URI?: string;
  // SMTP Configuration
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  // HubSpot Integration
  HUBSPOT_API_KEY?: string;
  HUBSPOT_WEBHOOK_SECRET?: string;
}

function getEnv(name: string, fallback?: string, opts?: { requiredInProd?: boolean }): string {
  const val = process.env[name];
  if (val && val.trim() !== "") {
    return val;
  }
  const inProd = (process.env.NODE_ENV || "development") === "production";
  const requiredInProd = opts?.requiredInProd ?? true;
  if (inProd && requiredInProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return "";
}

export const env: EnvShape = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,
  // In development, provide safe fallbacks so the server can start without a .env file
  // Production will still require explicit values
  DATABASE_URL: getEnv("DATABASE_URL", "file:./prisma/dev.db", { requiredInProd: true }),
  JWT_SECRET: getEnv("JWT_SECRET", "dev-secret-change-me", { requiredInProd: true }),
  // Azure AD / Outlook SSO
  AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
  AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
  AZURE_REDIRECT_URI: process.env.AZURE_REDIRECT_URI,
  // SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  // HubSpot Integration
  HUBSPOT_API_KEY: process.env.HUBSPOT_API_KEY,
  HUBSPOT_WEBHOOK_SECRET: process.env.HUBSPOT_WEBHOOK_SECRET,
};

export const isProd = env.NODE_ENV === "production";
