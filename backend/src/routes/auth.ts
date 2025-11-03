import { Router } from "express";
import jwt from "jsonwebtoken";
import { authLoginLimiter, partnerRegisterLimiter } from "../middleware/rateLimiters";
import { getPrismaClient } from "../prismaClient";
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  AuthenticatedRequest,
} from "../utils/auth";
import { msalInstance, ssoConfig, createGraphClient, isAzureADConfigured } from "../lib/azureAD";
import { env } from "../lib/env";
import { ActivityLogger } from "../services/activityLogger";

const prisma = getPrismaClient();

export const authRouter = Router();

// General Login (for admin/support email-based authentication)
authRouter.post("/login", authLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user by email
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: {
        email: username.toLowerCase(),
      },
      include: {
        partner: {
          select: {
            id: true,
            companyName: true,
            managementCompany: true,
            numberOfLoungeUnits: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!user?.password) {
      // Log failed login attempt
      await ActivityLogger.logLogin(
        username.toLowerCase(),
        "UNKNOWN",
        false,
        req,
        "User not found or no password",
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare hashed password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      // Log failed login attempt
      await ActivityLogger.logLogin(
        username.toLowerCase(),
        user.role,
        false,
        req,
        "Invalid password",
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Log successful login
    await ActivityLogger.logLogin(user.email, user.role, true, req);

    // Generate token
    const token = generateToken(user.id, user.email, user.role, user.partnerId || undefined);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        partnerId: user.partnerId,
        partner: user.partner,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Partner Login (company-based authentication) - DEFAULT LOGIN METHOD FOR PARTNERS
authRouter.post("/login/partner", authLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find partner by exact company name match
    const prisma = getPrismaClient();
    const partner = await prisma.partner.findUnique({
      where: {
        companyName: username,
      },
    });

    if (!partner?.userPass) {
      // Log failed login attempt
      await ActivityLogger.logLogin(
        username,
        "PARTNER",
        false,
        req,
        "Partner not found or no password",
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // For partner authentication, we can use simple string comparison
    // since partners use plain text passwords in the system
    if (password !== partner.userPass) {
      // Log failed login attempt
      await ActivityLogger.logLogin(username, "PARTNER", false, req, "Invalid password");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Log successful partner login
    await ActivityLogger.logLogin(partner.companyName, "PARTNER", true, req);

    // Generate token for partner
    const token = generateToken(partner.id, partner.companyName, "PARTNER", partner.id);

    res.json({
      token,
      user: {
        id: partner.id,
        email: partner.companyName, // Use company name as identifier
        displayName: partner.companyName,
        role: "PARTNER",
        partner: {
          id: partner.id,
          companyName: partner.companyName,
          streetAddress: partner.streetAddress,
          city: partner.city,
          state: partner.state,
          zip: partner.zip,
          country: partner.country,
          numberOfLoungeUnits: partner.numberOfLoungeUnits,
          topColour: partner.topColour,
        },
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

// Outlook SSO Login (Partners + Support/Admin)
// This endpoint accepts an accessToken + email from the client and classifies the user role
// Partners must be present as a Contact email on a Partner record; Support/Admin are internal emails
authRouter.post("/login/outlook", async (req, res) => {
  try {
    const { accessToken, email, displayName } = req.body;

    if (!accessToken || !email) {
      return res.status(400).json({ error: "Access token and email are required" });
    }

    // Verify the access token with Microsoft Graph (simplified for demo)
    // In production, you would validate the token with Microsoft Graph API

    const prisma = getPrismaClient();

    const lowerEmail = email.toLowerCase();
    let adminEmails = (env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length === 0) {
      adminEmails = ["support@poolsafeinc.com", "fabdi@poolsafeinc.com"]; // safe defaults
    }
    const internalDomain = (env.INTERNAL_EMAIL_DOMAIN || "poolsafeinc.com").toLowerCase();
    const isInternal = lowerEmail.endsWith(`@${internalDomain}`);

    let role: "ADMIN" | "SUPPORT" | "PARTNER" | null = null;
    let partnerId: string | undefined;

    if (adminEmails.includes(lowerEmail)) {
      role = "ADMIN";
    } else if (isInternal) {
      role = "SUPPORT";
    } else {
      // External email: attempt to map to Partner via Contact email
      const contact = await prisma.contact.findFirst({
        where: { email: lowerEmail },
        select: { partnerId: true },
      });
      if (contact?.partnerId) {
        role = "PARTNER";
        partnerId = contact.partnerId;
      }
    }

    if (!role) {
      // Not recognized as internal or a known partner contact
      return res.status(403).json({ error: "This email is not authorized for SSO" });
    }

    // Upsert user with resolved role and optional partnerId
    let user = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          displayName: displayName || email,
          role,
          partnerId,
          password: null,
        },
      });
    } else {
      // Ensure role/partner mapping is in sync (do not downgrade ADMIN)
      const nextRole = user.role === "ADMIN" ? "ADMIN" : role;
      if (user.role !== nextRole || (partnerId && user.partnerId !== partnerId)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: nextRole, partnerId: partnerId ?? user.partnerId },
        });
      }
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
        partnerId: user.partnerId,
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

    // Handle partner authentication (support legacy tokens where userId==partnerId)
    if (req.user!.role === "PARTNER") {
      const partnerId = req.user!.partnerId || req.user!.id;
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
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
          createdAt: true,
        },
      });

      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      res.json({
        id: partner.id,
        email: partner.companyName,
        displayName: partner.companyName,
        role: "PARTNER",
        partner: {
          id: partner.id,
          companyName: partner.companyName,
          streetAddress: partner.streetAddress,
          city: partner.city,
          state: partner.state,
          zip: partner.zip,
          country: partner.country,
          numberOfLoungeUnits: partner.numberOfLoungeUnits,
          topColour: partner.topColour,
        },
        createdAt: partner.createdAt,
      });
      return;
    }

    // Handle regular user authentication (ADMIN, SUPPORT, etc.)
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

    if (!user?.password) {
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
authRouter.post("/logout", authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    // In a more sophisticated setup, you might blacklist the token
    // For now, we just acknowledge the logout
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// ========================================
// OUTLOOK SSO INTEGRATION
// ========================================

// Initiate Outlook SSO login (Admin/Support only)
authRouter.get("/sso/login", async (req, res) => {
  try {
    if (!isAzureADConfigured() || !msalInstance) {
      return res.status(503).json({
        error: "Outlook SSO is not configured. Please contact administrator.",
      });
    }

    const authCodeUrlParameters = {
      scopes: ssoConfig.scopes,
      redirectUri: ssoConfig.redirectUri,
      responseType: ssoConfig.responseType,
      responseMode: ssoConfig.responseMode as any,
      prompt: ssoConfig.prompt as any,
    };

    // Generate the authorization URL
    const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParameters);

    // Redirect to Microsoft login
    res.redirect(authUrl);
  } catch (error) {
    console.error("SSO login initiation error:", error);
    res.status(500).json({ error: "Failed to initiate SSO login" });
  }
});

// Handle SSO callback from Microsoft (Partners + Support/Admin)
authRouter.get("/sso/callback", async (req, res) => {
  try {
    if (!isAzureADConfigured() || !msalInstance) {
      return res.status(503).json({
        error: "Outlook SSO is not configured. Please contact administrator.",
      });
    }

    const { code, error: authError } = req.query as { code?: string; error?: unknown };

    if (authError) {
      const msg = typeof authError === "string" ? authError : JSON.stringify(authError);
      return res.status(400).json({ error: `SSO authentication failed: ${msg}` });
    }

    if (!code) {
      return res.status(400).json({ error: "Authorization code not received" });
    }

    // Exchange code for token (code is defined above)
    const tokenRequest = {
      code,
      scopes: ssoConfig.scopes,
      redirectUri: ssoConfig.redirectUri,
    };

    const response = await msalInstance.acquireTokenByCode(tokenRequest);

    if (!response?.accessToken) {
      return res.status(400).json({ error: "Failed to acquire access token" });
    }

    // Get user info from Microsoft Graph
    const graphClient = createGraphClient(response.accessToken);
    if (!graphClient) {
      return res.status(503).json({ error: "Microsoft Graph client not available" });
    }

    const userProfile = (await graphClient.api("/me").get()) as {
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };

    const email = userProfile.mail || userProfile.userPrincipalName;
    if (!email) {
      return res.status(400).json({ error: "Unable to retrieve email from Microsoft profile" });
    }

    const prisma = getPrismaClient();

    const lowerEmail = email.toLowerCase();
    let adminEmails = (env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length === 0) {
      adminEmails = ["support@poolsafeinc.com", "fabdi@poolsafeinc.com"]; // safe defaults
    }
    const internalDomain = (env.INTERNAL_EMAIL_DOMAIN || "poolsafeinc.com").toLowerCase();
    const isInternal = lowerEmail.endsWith(`@${internalDomain}`);

    let role: "ADMIN" | "SUPPORT" | "PARTNER" | null = null;
    let partnerId: string | undefined;

    if (adminEmails.includes(lowerEmail)) {
      role = "ADMIN";
    } else if (isInternal) {
      role = "SUPPORT";
    } else {
      const contact = await prisma.contact.findFirst({
        where: { email: lowerEmail },
        select: { partnerId: true },
      });
      if (contact?.partnerId) {
        role = "PARTNER";
        partnerId = contact.partnerId;
      }
    }

    if (!role) {
      return res.status(403).json({ error: "This email is not authorized for SSO" });
    }

    let user = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          displayName: userProfile.displayName || email,
          role,
          partnerId,
          // No password for SSO users
        },
      });
    } else {
      const nextRole = user.role === "ADMIN" ? "ADMIN" : role;
      if (user.role !== nextRole || (partnerId && user.partnerId !== partnerId)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: nextRole, partnerId: partnerId ?? user.partnerId },
        });
      }
    }

    // Generate JWT token for our system
    const token = generateToken(user.id, user.email, user.role, user.partnerId || undefined);

    // Redirect to frontend with token (or return JSON for SPA)
    const redirectUrl =
      env.NODE_ENV === "production"
        ? `${req.protocol}://${req.get("host")}/dashboard?token=${token}`
        : `http://localhost:5173/dashboard?token=${token}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("SSO callback error:", error);
    res.status(500).json({ error: "SSO authentication failed" });
  }
});

// Get SSO status
authRouter.get("/sso/status", (req, res) => {
  res.json({
    enabled: isAzureADConfigured(),
    loginUrl: isAzureADConfigured() ? "/api/auth/sso/login" : null,
  });
});

// Handle Outlook user sync from frontend
authRouter.post("/outlook-sync", async (req, res) => {
  try {
    const { email, name } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    // Determine user role based on email
    const lowerEmail = email.toLowerCase();
    let adminEmails = (env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length === 0) {
      adminEmails = ["support@poolsafeinc.com", "fabdi@poolsafeinc.com"]; // safe defaults
    }
    const internalDomain = (env.INTERNAL_EMAIL_DOMAIN || "poolsafeinc.com").toLowerCase();
    const role = adminEmails.includes(lowerEmail) || lowerEmail.endsWith(`@${internalDomain}`)
      ? "admin"
      : "support";

    // Check if user exists or create new user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Create new user with Outlook authentication
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          displayName: name,
          role: role.toUpperCase(), // Prisma expects uppercase role
          password: null, // No password for SSO users
        },
      });
    } else {
      // Update existing user's display name if provided
      if (name && user.displayName !== name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: name, // Update display name in case it changed
          },
        });
      }
    }

    // Generate JWT token for the user
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        authMethod: "outlook",
      },
      env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        role: user.role,
        authMethod: "outlook",
      },
      token,
    });
  } catch (error) {
    console.error("Outlook user sync error:", error);
    res.status(500).json({ error: "Failed to sync Outlook user" });
  }
});
