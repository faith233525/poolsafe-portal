import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  authenticateToken,
  requireAdmin,
  requireSupport,
  AuthenticatedRequest,
  hashPassword,
} from "../utils/auth";

export const usersRouter = Router();

// Apply authentication to all routes
usersRouter.use(authenticateToken);

// Get all users (Support/Admin only)
usersRouter.get("/", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { role, partnerId } = req.query;

    const where: any = {};
    if (role) {where.role = role as string;}
    if (partnerId) {where.partnerId = partnerId as string;}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by ID (Support/Admin only)
usersRouter.get("/:id", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        partnerId: true,
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
        assignedTickets: {
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            assignedTickets: true,
            serviceRecords: true,
            calendarEvents: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create user (Admin only)
usersRouter.post("/", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, password, displayName, role, partnerId } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        error: "Email and role are required",
      });
    }

    if (!["PARTNER", "SUPPORT", "ADMIN"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be PARTNER, SUPPORT, or ADMIN",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists with this email" });
    }

    // For partner users, require partnerId and password
    if (role === "PARTNER") {
      if (!partnerId || !password) {
        return res.status(400).json({
          error: "Partner users require partnerId and password",
        });
      }

      // Verify partner exists
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
      });

      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
    }

    // Prepare user data
    const userData: any = {
      email: email.toLowerCase(),
      displayName: displayName || email,
      role,
      partnerId: role === "PARTNER" ? partnerId : null,
    };

    // Hash password for partner users
    if (password) {
      userData.password = await hashPassword(password);
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            companyName: true,
          },
        },
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user (Admin only)
usersRouter.put("/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { displayName, role, partnerId } = req.body;

    if (role && !["PARTNER", "SUPPORT", "ADMIN"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be PARTNER, SUPPORT, or ADMIN",
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (displayName !== undefined) {updateData.displayName = displayName;}
    if (role !== undefined) {
      updateData.role = role;
      updateData.partnerId = role === "PARTNER" ? partnerId : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            companyName: true,
          },
        },
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (Admin only)
usersRouter.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Reset user password (Admin only)
usersRouter.post("/:id/reset-password", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "PARTNER") {
      return res.status(400).json({
        error: "Password reset only available for partner users",
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Get user statistics (Admin only)
usersRouter.get("/stats/summary", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const [totalUsers, roleStats, recentUsers, partnerUsers] = await Promise.all([
      // Total users
      prisma.user.count(),

      // By role
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),

      // Recent users (last 30 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),

      // Partner users with their companies
      prisma.user.count({
        where: { role: "PARTNER" },
      }),
    ]);

    res.json({
      totalUsers,
      byRole: roleStats,
      recentUsers,
      partnerUsers,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});
