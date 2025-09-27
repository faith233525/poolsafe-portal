import { prisma } from "../prismaClient";

interface ReadinessStatus {
  ready: boolean;
  checks: {
    database: { ok: boolean; latencyMs?: number; error?: string };
    config: { ok: boolean; missing?: string[] };
  };
  timestamp: string;
  version?: string;
}

export function livenessCheck() {
  return { ok: true, timestamp: new Date().toISOString() };
}

export async function readinessCheck(): Promise<ReadinessStatus> {
  const start = Date.now();
  const dbStatus: ReadinessStatus["checks"]["database"] = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus.ok = true;
    dbStatus.latencyMs = Date.now() - start;
  } catch (e: any) {
    dbStatus.error = e?.message || "db_error";
  }

  const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
  const missing = requiredEnv.filter((k) => !process.env[k]);
  const configStatus: ReadinessStatus["checks"]["config"] = { ok: missing.length === 0 };
  if (missing.length) {configStatus.missing = missing;}

  const ready = dbStatus.ok && configStatus.ok;
  return {
    ready,
    checks: { database: dbStatus, config: configStatus },
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  };
}
