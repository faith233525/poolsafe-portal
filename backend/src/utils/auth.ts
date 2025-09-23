import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    partnerId?: string;
  };
}

// Generate JWT token
export const generateToken = (
  userId: string,
  email: string,
  role: string,
  partnerId?: string
) => {
  return jwt.sign(
    {
      userId,
      email,
      role,
      partnerId,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// Verify JWT token
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Middleware to authenticate token
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.user = {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    partnerId: decoded.partnerId,
  };

  next();
};

// Middleware to check if user has required role
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

// Middleware for admin-only routes
export const requireAdmin = requireRole(["ADMIN"]);

// Middleware for support and admin routes
export const requireSupport = requireRole(["SUPPORT", "ADMIN"]);

// Middleware for partner, support, and admin routes
export const requireAuthenticated = requireRole([
  "PARTNER",
  "SUPPORT",
  "ADMIN",
]);
