import { EventEmitter } from "events";
import { emailService } from "../lib/emailService";
import { prisma } from "../prismaClient";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface NotificationEventPayload {
  event: "notification" | "unread_count" | "ticket_created" | "ticket_updated" | "partner_welcome";
  notification?: any;
  unreadCount?: number;
  data?: any;
}

export function emitNotification(userId: string, payload: NotificationEventPayload) {
  emitter.emit(userId, payload);

  // Handle automatic email sending for certain events
  // Currently synchronous no-op; kept for future extensibility
  handleAutoEmail(userId, payload);
}

export function addNotificationListener(
  userId: string,
  listener: (payload: NotificationEventPayload) => void,
) {
  emitter.on(userId, listener);
}

export function removeNotificationListener(
  userId: string,
  listener: (payload: NotificationEventPayload) => void,
) {
  emitter.off(userId, listener);
}

// Enhanced event emitters with automatic email integration
export async function emitTicketCreated(ticketData: {
  id: string;
  title: string;
  priority: string;
  partnerId: string;
  assignedToId?: string;
}) {
  try {
    // Get partner and user information
    const [partner, assignedUser] = await Promise.all([
      prisma.partner.findUnique({
        where: { id: ticketData.partnerId },
        include: {
          users: {
            select: { email: true, displayName: true },
          },
        },
      }),
      ticketData.assignedToId
        ? prisma.user.findUnique({
            where: { id: ticketData.assignedToId },
            select: { email: true, displayName: true },
          })
        : null,
    ]);

    if (partner) {
      const emailRecipients = [];

      // Add partner users to email list
      partner.users.forEach((user) => {
        if (user.email) {
          emailRecipients.push(user.email);
        }
      });

      // Add assigned user to email list
      if (assignedUser?.email) {
        emailRecipients.push(assignedUser.email);
      }

      // Send email notification if there are recipients
      if (emailRecipients.length > 0) {
        await emailService.sendNewTicketNotification(
          {
            to: emailRecipients,
            from: assignedUser?.email || undefined,
          },
          {
            ticketId: ticketData.id,
            title: ticketData.title,
            partnerName: partner.companyName,
            priority: ticketData.priority,
            assignedTo: assignedUser?.displayName || undefined,
            portalUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
          },
        );
      }

      // Emit real-time notification
      partner.users.forEach((user) => {
        emitNotification(user.email, {
          event: "ticket_created",
          data: ticketData,
        });
      });

      if (assignedUser) {
        emitNotification(assignedUser.email, {
          event: "ticket_created",
          data: ticketData,
        });
      }
    }
  } catch (error) {
    console.error("Error in emitTicketCreated:", error);
  }
}

export async function emitTicketStatusUpdate(ticketData: {
  id: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  partnerId: string;
  assignedToId?: string;
  comments?: string;
}) {
  try {
    // Get partner and user information
    const [partner, assignedUser, updatedByUser] = await Promise.all([
      prisma.partner.findUnique({
        where: { id: ticketData.partnerId },
        include: {
          users: {
            select: { email: true, displayName: true },
          },
        },
      }),
      ticketData.assignedToId
        ? prisma.user.findUnique({
            where: { id: ticketData.assignedToId },
            select: { email: true, displayName: true },
          })
        : null,
      prisma.user.findUnique({
        where: { id: ticketData.updatedBy },
        select: { displayName: true, email: true },
      }),
    ]);

    if (partner && updatedByUser) {
      const emailRecipients = [];

      // Add partner users to email list
      partner.users.forEach((user) => {
        if (user.email) {
          emailRecipients.push(user.email);
        }
      });

      // Add assigned user to email list
      if (assignedUser?.email) {
        emailRecipients.push(assignedUser.email);
      }

      // Send email notification if there are recipients
      if (emailRecipients.length > 0) {
        await emailService.sendTicketStatusUpdate(
          {
            to: emailRecipients,
            from: assignedUser?.email || updatedByUser?.email || undefined,
          },
          {
            ticketId: ticketData.id,
            title: ticketData.title,
            oldStatus: ticketData.oldStatus,
            newStatus: ticketData.newStatus,
            updatedBy: updatedByUser.displayName || "System",
            comments: ticketData.comments,
            portalUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
          },
        );
      }

      // Emit real-time notification
      partner.users.forEach((user) => {
        emitNotification(user.email, {
          event: "ticket_updated",
          data: ticketData,
        });
      });

      if (assignedUser) {
        emitNotification(assignedUser.email, {
          event: "ticket_updated",
          data: ticketData,
        });
      }
    }
  } catch (error) {
    console.error("Error in emitTicketStatusUpdate:", error);
  }
}

export async function emitPartnerWelcome(partnerData: {
  userId: string;
  partnerName: string;
  companyName: string;
  email: string;
}) {
  try {
    // Send welcome email
    await emailService.sendPartnerWelcome(
      { to: partnerData.email },
      {
        partnerName: partnerData.partnerName,
        companyName: partnerData.companyName,
        loginUrl: process.env.FRONTEND_URL || "https://portal.poolsafe.com",
        supportEmail: process.env.SUPPORT_EMAIL || "support@poolsafe.com",
      },
    );

    // Emit real-time notification
    emitNotification(partnerData.userId, {
      event: "partner_welcome",
      data: partnerData,
    });
  } catch (error) {
    console.error("Error in emitPartnerWelcome:", error);
  }
}

// Helper function for automatic email handling
function handleAutoEmail(_userId: string, _payload: NotificationEventPayload) {
  // This function can be extended to handle other automatic email scenarios
  // Currently, specific email events are handled by dedicated functions above
  return;
}
