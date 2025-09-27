import { Router } from "express";
import { requireSupport, requireAuthenticated, AuthenticatedRequest } from "../utils/auth";
import { emailService } from "../lib/emailService";
import { errorResponse } from "../lib/response";
import { validateBody } from "../middleware/validate";
import { z } from "zod";

export const emailRouter = Router();

// Email configuration schemas
const testEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
});

const sendNotificationSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  actionUrl: z.string().url().optional(),
  actionText: z.string().optional(),
});

const ticketNotificationSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  ticketId: z.string(),
  title: z.string(),
  partnerName: z.string(),
  priority: z.string(),
  assignedTo: z.string().optional(),
});

const statusUpdateSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  ticketId: z.string(),
  title: z.string(),
  oldStatus: z.string(),
  newStatus: z.string(),
  updatedBy: z.string(),
  comments: z.string().optional(),
});

const welcomeEmailSchema = z.object({
  to: z.string().email(),
  partnerName: z.string(),
  companyName: z.string(),
});

const serviceReminderSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  deviceSerial: z.string(),
  partnerName: z.string(),
  serviceType: z.string(),
  dueDate: z.string(),
});

// Check email service status
emailRouter.get("/status", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const isConnected = await emailService.verifyConnection();

    res.json({
      configured: isConnected,
      status: isConnected ? "connected" : "disconnected",
      message: isConnected
        ? "Email service is configured and connected"
        : "Email service is not configured or connection failed",
    });
  } catch (error) {
    console.error("Error checking email status:", error);
    res.status(500).json(errorResponse("Failed to check email status"));
  }
});

// Send test email
emailRouter.post(
  "/test",
  requireSupport,
  validateBody(testEmailSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { to } = (req as any).validated;

      const success = await emailService.sendTestEmail(to);

      if (success) {
        res.json({
          success: true,
          message: `Test email sent successfully to ${to}`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send test email"));
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json(errorResponse("Failed to send test email"));
    }
  },
);

// Send generic notification email
emailRouter.post(
  "/notification",
  requireSupport,
  validateBody(sendNotificationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const { to, ...notificationData } = data;

      const success = await emailService.sendNotification({ to }, notificationData);

      if (success) {
        res.json({
          success: true,
          message: `Notification email sent successfully`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send notification email"));
      }
    } catch (error) {
      console.error("Error sending notification email:", error);
      res.status(500).json(errorResponse("Failed to send notification email"));
    }
  },
);

// Send new ticket notification
emailRouter.post(
  "/ticket/new",
  requireSupport,
  validateBody(ticketNotificationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const { to, ...ticketData } = data;

      const success = await emailService.sendNewTicketNotification(
        { to },
        {
          ...ticketData,
          portalUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
        },
      );

      if (success) {
        res.json({
          success: true,
          message: `New ticket notification sent successfully`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send ticket notification"));
      }
    } catch (error) {
      console.error("Error sending ticket notification:", error);
      res.status(500).json(errorResponse("Failed to send ticket notification"));
    }
  },
);

// Send ticket status update notification
emailRouter.post(
  "/ticket/status-update",
  requireSupport,
  validateBody(statusUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const { to, ...updateData } = data;

      const success = await emailService.sendTicketStatusUpdate(
        { to },
        {
          ...updateData,
          portalUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
        },
      );

      if (success) {
        res.json({
          success: true,
          message: `Status update notification sent successfully`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send status update notification"));
      }
    } catch (error) {
      console.error("Error sending status update notification:", error);
      res.status(500).json(errorResponse("Failed to send status update notification"));
    }
  },
);

// Send partner welcome email
emailRouter.post(
  "/welcome",
  requireSupport,
  validateBody(welcomeEmailSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const { to, ...welcomeData } = data;

      const success = await emailService.sendPartnerWelcome(
        { to },
        {
          ...welcomeData,
          loginUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
          supportEmail: process.env.SUPPORT_EMAIL || "support@poolsafe.com",
        },
      );

      if (success) {
        res.json({
          success: true,
          message: `Welcome email sent successfully to ${to}`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send welcome email"));
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      res.status(500).json(errorResponse("Failed to send welcome email"));
    }
  },
);

// Send service reminder email
emailRouter.post(
  "/service-reminder",
  requireSupport,
  validateBody(serviceReminderSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const { to, ...reminderData } = data;

      const success = await emailService.sendServiceReminder(
        { to },
        {
          ...reminderData,
          portalUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
        },
      );

      if (success) {
        res.json({
          success: true,
          message: `Service reminder sent successfully`,
        });
      } else {
        res.status(500).json(errorResponse("Failed to send service reminder"));
      }
    } catch (error) {
      console.error("Error sending service reminder:", error);
      res.status(500).json(errorResponse("Failed to send service reminder"));
    }
  },
);

// Get email templates (for frontend reference)
emailRouter.get("/templates", requireAuthenticated, (req: AuthenticatedRequest, res) => {
  try {
    const templates = [
      {
        id: "ticket-new",
        name: "New Ticket Notification",
        description: "Sent when a new support ticket is created",
        fields: ["ticketId", "title", "partnerName", "priority", "assignedTo?"],
      },
      {
        id: "ticket-status-update",
        name: "Ticket Status Update",
        description: "Sent when a ticket status changes",
        fields: ["ticketId", "title", "oldStatus", "newStatus", "updatedBy", "comments?"],
      },
      {
        id: "partner-welcome",
        name: "Partner Welcome",
        description: "Sent to new partners upon registration",
        fields: ["partnerName", "companyName"],
      },
      {
        id: "service-reminder",
        name: "Service Reminder",
        description: "Sent for upcoming service requirements",
        fields: ["deviceSerial", "partnerName", "serviceType", "dueDate"],
      },
      {
        id: "notification",
        name: "Generic Notification",
        description: "General purpose notification template",
        fields: ["title", "message", "type", "actionUrl?", "actionText?"],
      },
    ];

    res.json(templates);
  } catch (error) {
    console.error("Error getting email templates:", error);
    res.status(500).json(errorResponse("Failed to get email templates"));
  }
});

// Email activity log (for admin monitoring)
emailRouter.get("/activity", requireSupport, (req: AuthenticatedRequest, res) => {
  try {
    // This would typically be stored in database in production
    // For now, return a mock response
    const activity = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        type: "test",
        recipient: "test@example.com",
        status: "sent",
        template: "test-email",
      },
    ];

    res.json({
      activity,
      total: activity.length,
      message: "Email activity log (implement database storage for production)",
    });
  } catch (error) {
    console.error("Error getting email activity:", error);
    res.status(500).json(errorResponse("Failed to get email activity"));
  }
});
