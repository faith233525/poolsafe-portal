import { Router } from "express";
import { authLoginLimiter, partnerRegisterLimiter } from "../middleware/rateLimiters";
import { getPrismaClient } from "../prismaClient";
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  AuthenticatedRequest,
} from "../utils/auth";

export const authRouter = Router();

// Partner Login (generic username/password)
authRouter.post("/login/partner", authLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user with partner role
    const prisma = getPrismaClient();
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: "PARTNER",
      },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
            streetAddress: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            numberOfLoungeUnits: true,
            topColour: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role, user.partnerId || undefined);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        partner: user.partner,
      },
    });
  } catch (error) {
    console.error("Partner login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Create Partner Account (Admin only)
authRouter.post("/register/partner", partnerRegisterLimiter, async (req, res) => {
  try {
    const { email, password, displayName, partnerId } = req.body;

    if (!email || !password || !partnerId) {
      return res.status(400).json({
        error: "Email, password, and partnerId are required",
      });
    }

    // Check if user already exists
    const prisma = getPrismaClient();
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists with this email" });
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName,
        role: "PARTNER",
        partnerId,
      },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // Generate token
    const token = generateToken(user.id, user.email, user.role, user.partnerId || undefined);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        partner: user.partner,
      },
    });
  } catch (error) {
    console.error("Partner registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Outlook SSO Login (Support/Admin)
authRouter.post("/login/outlook", async (req, res) => {
  try {
    const { accessToken, email, displayName } = req.body;

    if (!accessToken || !email) {
      return res.status(400).json({ error: "Access token and email are required" });
    }

    // Verify the access token with Microsoft Graph (simplified for demo)
    // In production, you would validate the token with Microsoft Graph API

    // Find or create user with support/admin role
    const prisma = getPrismaClient();
    let user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: {
          in: ["SUPPORT", "ADMIN"],
        },
      },
    });

    if (!user) {
      // Auto-create user with SUPPORT role (Admin can upgrade later)
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          displayName: displayName || email,
          role: "SUPPORT", // Default to SUPPORT, admin can upgrade
          password: null, // No password for SSO users
        },
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Outlook SSO login error:", error);
    res.status(500).json({ error: "SSO login failed" });
  }
});

// Get current user profile
authRouter.get("/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
            streetAddress: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            numberOfLoungeUnits: true,
            topColour: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      partner: user.partner,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Update user profile
authRouter.put("/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { displayName } = req.body;

    const prisma = getPrismaClient();
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { displayName },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      partner: updatedUser.partner,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Change password (Partner users only)
authRouter.put("/change-password", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required",
      });
    }

    if (req.user!.role !== "PARTNER") {
      return res.status(403).json({
        error: "Password change not available for SSO users",
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: "User not found or no password set" });
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedNewPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Logout (client-side token removal, but we can log the action)
authRouter.post("/logout", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // In a more sophisticated setup, you might blacklist the token
    // For now, we just acknowledge the logout
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});
