import crypto from "crypto";
import { prisma } from "../prismaClient";

export interface PersistedErrorContext {
  severity?: string; // low|medium|high|critical
  type?: string; // classification (validation, db, external, unknown)
  ipAddress?: string | null;
  userAgent?: string | null;
  context?: Record<string, unknown> | string;
}

export async function persistError(err: any, ctx: PersistedErrorContext = {}) {
  const message = err?.message || String(err);
  const stack = err?.stack;
  const contextStr =
    typeof ctx.context === "string"
      ? ctx.context
      : ctx.context
        ? JSON.stringify(ctx.context).slice(0, 4000)
        : undefined;
  const errorId = crypto
    .createHash("sha256")
    .update(message + (stack || ""))
    .digest("hex")
    .slice(0, 32);

  const nowIso = new Date().toISOString();
  try {
    await prisma.errorLog.upsert({
      where: { errorId },
      create: {
        errorId,
        message,
        stack,
        context: contextStr,
        firstSeen: nowIso,
        lastSeen: nowIso,
        severity: ctx.severity || "medium",
        type: ctx.type || "unknown",
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      },
      update: {
        lastSeen: nowIso,
        count: { increment: 1 },
        severity: ctx.severity || "medium",
        type: ctx.type || "unknown",
      },
    });
  } catch (e) {
    // Swallow to avoid cascading failures; optionally could buffer for retry.
    // eslint-disable-next-line no-console
    console.error("[errorLogger] Failed to persist error", e);
  }
}
