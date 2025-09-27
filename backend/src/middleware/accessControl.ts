import { Request, Response, NextFunction } from "express";
import { authzDeniedTotal } from "../metrics";

// Simple role -> permissions mapping. In a real system this might come from DB or config.
// Keep intentionally minimal; expand as routes formalize required permissions.
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  support: ["ticket:read", "ticket:update", "ticket:comment", "knowledge:read", "user:read"],
  partner: ["ticket:create", "ticket:read", "ticket:comment", "knowledge:read"],
  readonly: ["ticket:read", "knowledge:read"],
};

export interface AccessControlOptions {
  any?: string[]; // user must have at least one
  all?: string[]; // user must have all
  deny?: string[]; // if user has any of these permissions -> deny
}

// Extract user + role from request (assumes auth middleware populated req.user)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    permissions?: string[]; // optional pre-expanded permissions
  };
}

export function resolvePermissions(role?: string, extra?: string[]): string[] {
  if (!role) {
    return extra || [];
  }
  // Normalize role casing since tokens use uppercase roles (e.g. "ADMIN", "PARTNER")
  const normalized = role.toLowerCase();
  const base = ROLE_PERMISSIONS[normalized] || [];
  // de-duplicate while preserving '*'
  const merged = new Set([...base, ...(extra || [])]);
  return [...merged];
}

function hasPermission(userPerms: string[], needed: string): boolean {
  if (userPerms.includes("*")) {
    return true;
  }
  return userPerms.includes(needed);
}

export function accessControl(opts: AccessControlOptions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const role = req.user?.role;
      const userPerms = req.user?.permissions || resolvePermissions(role);

      if (!userPerms.length) {
        authzDeniedTotal.inc({
          method: req.method,
          route: req.path,
          reason: "NO_PERMISSIONS",
          role,
        });
        return res.status(403).json({ error: "forbidden", reason: "NO_PERMISSIONS" });
      }

      // Deny list check first
      if (opts.deny?.some((p) => hasPermission(userPerms, p))) {
        authzDeniedTotal.inc({ method: req.method, route: req.path, reason: "DENY_MATCH", role });
        return res.status(403).json({ error: "forbidden", reason: "DENY_MATCH" });
      }

      if (opts.all && !opts.all.every((p) => hasPermission(userPerms, p))) {
        authzDeniedTotal.inc({ method: req.method, route: req.path, reason: "MISSING_ALL", role });
        return res.status(403).json({ error: "forbidden", reason: "MISSING_ALL" });
      }

      if (opts.any && !opts.any.some((p) => hasPermission(userPerms, p))) {
        authzDeniedTotal.inc({ method: req.method, route: req.path, reason: "MISSING_ANY", role });
        return res.status(403).json({ error: "forbidden", reason: "MISSING_ANY" });
      }

      return next();
    } catch {
      return res.status(500).json({ error: "access_control_error" });
    }
  };
}

// Helper to attach resolved permissions after authentication (idempotent)
export function attachResolvedPermissions(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  if (req.user && !req.user.permissions) {
    req.user.permissions = resolvePermissions(req.user.role);
  }
  next();
}

// Lightweight route guard examples could be added where routes are defined; leaving middleware export only.
export default accessControl;
