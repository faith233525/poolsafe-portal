import nodemailer from "nodemailer";
import { env } from "./env";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
      console.warn("SMTP configuration incomplete. Email service disabled.");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT),
        secure: parseInt(env.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates for development
        },
      });

      this.isConfigured = true;
      console.log("Email service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize email service:", error);
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service verification failed:", error);
      return false;
    }
  }

  private async sendEmail(options: EmailOptions, template: EmailTemplate): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      console.warn("Email service not configured. Email not sent.");
      return false;
    }

    try {
      // If sending on behalf of a support/admin user, use their email as 'from' if available
      let fromAddress = env.SMTP_FROM || env.SMTP_USER;
      if (options && typeof options.to === "string" && options.to.includes("@") && options.from) {
        fromAddress = options.from;
      }
      const mailOptions = {
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(", ")
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  // Template: New Ticket Created
  async sendNewTicketNotification(
    options: EmailOptions,
    data: {
      ticketId: string;
      title: string;
      partnerName: string;
      priority: string;
      assignedTo?: string;
      portalUrl: string;
    },
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `New Support Ticket #${data.ticketId} - ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0077cc;">
              <h1 style="color: #0077cc; margin: 0; font-size: 28px;">Pool Safe Inc</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Support Partner Portal</p>
            </div>
            
            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">New Support Ticket Created</h2>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #0077cc; margin: 0 0 15px 0;">Ticket Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555; width: 120px;">Ticket ID:</td>
                    <td style="padding: 8px 0; color: #333;">#${data.ticketId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Title:</td>
                    <td style="padding: 8px 0; color: #333;">${data.title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Partner:</td>
                    <td style="padding: 8px 0; color: #333;">${data.partnerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Priority:</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: ${data.priority === "HIGH" ? "#dc3545" : data.priority === "MEDIUM" ? "#ffc107" : "#28a745"}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${data.priority}
                      </span>
                    </td>
                  </tr>
                  ${
                    data.assignedTo
                      ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Assigned To:</td>
                    <td style="padding: 8px 0; color: #333;">${data.assignedTo}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.portalUrl}/tickets/${data.ticketId}" 
                   style="background-color: #0077cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Ticket in Portal
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from Pool Safe Inc Support Portal.</p>
              <p>Please do not reply to this email. Log into the portal to respond to tickets.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Pool Safe Inc - New Support Ticket Created
        
        Ticket ID: #${data.ticketId}
        Title: ${data.title}
        Partner: ${data.partnerName}
        Priority: ${data.priority}
        ${data.assignedTo ? `Assigned To: ${data.assignedTo}` : ""}
        
        View ticket in portal: ${data.portalUrl}/tickets/${data.ticketId}
        
        This is an automated notification from Pool Safe Inc Support Portal.
      `,
    };

    return this.sendEmail(options, template);
  }

  // Template: Ticket Status Updated
  async sendTicketStatusUpdate(
    options: EmailOptions,
    data: {
      ticketId: string;
      title: string;
      oldStatus: string;
      newStatus: string;
      updatedBy: string;
      comments?: string;
      portalUrl: string;
    },
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Ticket #${data.ticketId} Status Updated to ${data.newStatus}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0077cc;">
              <h1 style="color: #0077cc; margin: 0; font-size: 28px;">Pool Safe Inc</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Support Partner Portal</p>
            </div>
            
            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">Ticket Status Updated</h2>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #0077cc; margin: 0 0 15px 0;">Update Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555; width: 120px;">Ticket ID:</td>
                    <td style="padding: 8px 0; color: #333;">#${data.ticketId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Title:</td>
                    <td style="padding: 8px 0; color: #333;">${data.title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Previous Status:</td>
                    <td style="padding: 8px 0; color: #666; text-decoration: line-through;">${data.oldStatus}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">New Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: ${data.newStatus === "RESOLVED" ? "#28a745" : data.newStatus === "IN_PROGRESS" ? "#17a2b8" : "#6c757d"}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${data.newStatus.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Updated By:</td>
                    <td style="padding: 8px 0; color: #333;">${data.updatedBy}</td>
                  </tr>
                </table>
                
                ${
                  data.comments
                    ? `
                <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid #0077cc; border-radius: 4px;">
                  <h4 style="margin: 0 0 10px 0; color: #0077cc; font-size: 14px;">Comments:</h4>
                  <p style="margin: 0; color: #333; line-height: 1.5;">${data.comments}</p>
                </div>
                `
                    : ""
                }
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.portalUrl}/tickets/${data.ticketId}" 
                   style="background-color: #0077cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Ticket in Portal
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from Pool Safe Inc Support Portal.</p>
              <p>Please do not reply to this email. Log into the portal to respond to tickets.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Pool Safe Inc - Ticket Status Updated
        
        Ticket ID: #${data.ticketId}
        Title: ${data.title}
        Previous Status: ${data.oldStatus}
        New Status: ${data.newStatus}
        Updated By: ${data.updatedBy}
        ${data.comments ? `Comments: ${data.comments}` : ""}
        
        View ticket in portal: ${data.portalUrl}/tickets/${data.ticketId}
        
        This is an automated notification from Pool Safe Inc Support Portal.
      `,
    };

    return this.sendEmail(options, template);
  }

  // Template: Partner Welcome Email
  async sendPartnerWelcome(
    options: EmailOptions,
    data: {
      partnerName: string;
      companyName: string;
      loginUrl: string;
      supportEmail: string;
    },
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Welcome to Pool Safe Inc Partner Portal - ${data.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0077cc;">
              <h1 style="color: #0077cc; margin: 0; font-size: 28px;">Pool Safe Inc</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Support Partner Portal</p>
            </div>
            
            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome to Our Partner Portal!</h2>
              
              <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                Dear ${data.partnerName},
              </p>
              
              <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                Welcome to the Pool Safe Inc Support Partner Portal! We're excited to have ${data.companyName} as part of our partner network.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 30px 0;">
                <h3 style="color: #0077cc; margin: 0 0 15px 0;">Your Portal Features:</h3>
                <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Submit and track support tickets</li>
                  <li>Access LounGenie device documentation</li>
                  <li>View service records and maintenance schedules</li>
                  <li>Real-time notifications and updates</li>
                  <li>Calendar integration for appointments</li>
                  <li>Comprehensive partner resource library</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" 
                   style="background-color: #0077cc; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Access Your Portal
                </a>
              </div>
              
              <p style="color: #333; line-height: 1.6; margin-top: 30px;">
                If you have any questions or need assistance getting started, please don't hesitate to contact our support team at 
                <a href="mailto:${data.supportEmail}" style="color: #0077cc; text-decoration: none;">${data.supportEmail}</a>.
              </p>
              
              <p style="color: #333; line-height: 1.6;">
                We look forward to a successful partnership!
              </p>
              
              <p style="color: #333; margin-top: 30px;">
                Best regards,<br>
                <strong>The Pool Safe Inc Team</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Pool Safe Inc | Keeping Swimming Pools Safe with Advanced LounGenie Technology</p>
              <p>This email was sent to confirm your partner portal access.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Welcome to Pool Safe Inc Partner Portal!
        
        Dear ${data.partnerName},
        
        Welcome to the Pool Safe Inc Support Partner Portal! We're excited to have ${data.companyName} as part of our partner network.
        
        Your Portal Features:
        • Submit and track support tickets
        • Access LounGenie device documentation
        • View service records and maintenance schedules
        • Real-time notifications and updates
        • Calendar integration for appointments
        • Comprehensive partner resource library
        
        Access your portal: ${data.loginUrl}
        
        If you have any questions, contact our support team at ${data.supportEmail}.
        
        We look forward to a successful partnership!
        
        Best regards,
        The Pool Safe Inc Team
      `,
    };

    return this.sendEmail(options, template);
  }

  // Template: Service Record Reminder
  async sendServiceReminder(
    options: EmailOptions,
    data: {
      deviceSerial: string;
      partnerName: string;
      serviceType: string;
      dueDate: string;
      portalUrl: string;
    },
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Service Reminder: ${data.serviceType} Due for Device ${data.deviceSerial}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ffc107;">
              <h1 style="color: #0077cc; margin: 0; font-size: 28px;">Pool Safe Inc</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Service Reminder</p>
            </div>
            
            <!-- Alert Banner -->
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
              <div style="display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                <div>
                  <h3 style="color: #856404; margin: 0; font-size: 16px;">Service Reminder</h3>
                  <p style="color: #856404; margin: 5px 0 0 0; font-size: 14px;">Scheduled maintenance is due for your LounGenie device</p>
                </div>
              </div>
            </div>
            
            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">Service Required</h2>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #0077cc; margin: 0 0 15px 0;">Device Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555; width: 140px;">Device Serial:</td>
                    <td style="padding: 8px 0; color: #333; font-family: monospace; font-weight: bold;">${data.deviceSerial}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Service Type:</td>
                    <td style="padding: 8px 0; color: #333;">${data.serviceType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Due Date:</td>
                    <td style="padding: 8px 0; color: #d63384; font-weight: bold;">${data.dueDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Partner:</td>
                    <td style="padding: 8px 0; color: #333;">${data.partnerName}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #0077cc; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460; line-height: 1.5;">
                  <strong>Action Required:</strong> Please schedule the required service to maintain optimal device performance and ensure compliance with maintenance requirements.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.portalUrl}/service-records" 
                   style="background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 15px;">
                  View Service Records
                </a>
                <a href="${data.portalUrl}/tickets/new" 
                   style="background-color: #0077cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Schedule Service
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated service reminder from Pool Safe Inc.</p>
              <p>Regular maintenance ensures optimal device performance and safety.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Pool Safe Inc - Service Reminder
        
        ⚠️ Service Required for LounGenie Device
        
        Device Serial: ${data.deviceSerial}
        Service Type: ${data.serviceType}
        Due Date: ${data.dueDate}
        Partner: ${data.partnerName}
        
        Action Required: Please schedule the required service to maintain optimal device performance.
        
        View service records: ${data.portalUrl}/service-records
        Schedule service: ${data.portalUrl}/tickets/new
        
        This is an automated service reminder from Pool Safe Inc.
      `,
    };

    return this.sendEmail(options, template);
  }

  // Generic notification template
  async sendNotification(
    options: EmailOptions,
    data: {
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error";
      actionUrl?: string;
      actionText?: string;
    },
  ): Promise<boolean> {
    const typeConfig = {
      info: { color: "#17a2b8", bgcolor: "#d1ecf1", icon: "ℹ️" },
      success: { color: "#28a745", bgcolor: "#d4edda", icon: "✅" },
      warning: { color: "#ffc107", bgcolor: "#fff3cd", icon: "⚠️" },
      error: { color: "#dc3545", bgcolor: "#f8d7da", icon: "❌" },
    };

    const config = typeConfig[data.type];

    const template: EmailTemplate = {
      subject: `Pool Safe Inc - ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0077cc;">
              <h1 style="color: #0077cc; margin: 0; font-size: 28px;">Pool Safe Inc</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Support Partner Portal</p>
            </div>
            
            <!-- Notification -->
            <div style="background-color: ${config.bgcolor}; border-left: 4px solid ${config.color}; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
              <div style="display: flex; align-items: flex-start;">
                <span style="font-size: 24px; margin-right: 15px; margin-top: 5px;">${config.icon}</span>
                <div style="flex: 1;">
                  <h2 style="color: ${config.color}; margin: 0 0 15px 0; font-size: 20px;">${data.title}</h2>
                  <p style="color: #333; line-height: 1.6; margin: 0;">${data.message}</p>
                </div>
              </div>
            </div>
            
            ${
              data.actionUrl && data.actionText
                ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.actionUrl}" 
                 style="background-color: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                ${data.actionText}
              </a>
            </div>
            `
                : ""
            }
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from Pool Safe Inc Support Portal.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Pool Safe Inc - ${data.title}
        
        ${data.message}
        
        ${data.actionUrl && data.actionText ? `${data.actionText}: ${data.actionUrl}` : ""}
        
        This is an automated notification from Pool Safe Inc Support Portal.
      `,
    };

    return this.sendEmail(options, template);
  }

  // Test email functionality
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendNotification(
      { to },
      {
        title: "Email Service Test",
        message:
          "This is a test email to verify that the Pool Safe Inc email service is working correctly. If you receive this message, the email configuration is successful.",
        type: "success",
        actionUrl: "https://poolsafe.com",
        actionText: "Visit Pool Safe Inc",
      },
    );
  }
}

// Export singleton instance
export const emailService = new EmailService();
export { EmailService };
