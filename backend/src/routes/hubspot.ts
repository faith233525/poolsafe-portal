import { Router } from "express";
import { requireAdmin, AuthenticatedRequest } from "../utils/auth";
import { getPrismaClient } from "../prismaClient";
import {
  syncPartnerToHubSpot,
  syncTicketToHubSpot,
  isHubSpotConfigured,
  getHubSpotClient,
} from "../lib/hubspot";
import { env } from "../lib/env";
import crypto from "crypto";

export const hubspotRouter = Router();

// Get HubSpot integration status
hubspotRouter.get("/status", requireAdmin, (req, res) => {
  res.json({
    configured: isHubSpotConfigured(),
    syncEnabled: isHubSpotConfigured(),
  });
});

// Manually sync partner to HubSpot
hubspotRouter.post("/sync/partner/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isHubSpotConfigured()) {
      return res.status(503).json({ error: "HubSpot integration not configured" });
    }

    const { id } = req.params;
    const prisma = getPrismaClient();

    const partner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      return res.status(404).json({ error: "Partner not found" });
    }

    const hubspotContactId = await syncPartnerToHubSpot(partner);

    if (hubspotContactId) {
      // Store HubSpot contact ID in our database for future reference
      await prisma.partner.update({
        where: { id },
        data: {
          // Add hubspotContactId field to schema if needed
          // hubspotContactId: hubspotContactId
        },
      });

      res.json({
        success: true,
        hubspotContactId,
        message: "Partner successfully synced to HubSpot",
      });
    } else {
      res.status(500).json({ error: "Failed to sync partner to HubSpot" });
    }
  } catch (error) {
    console.error("HubSpot sync error:", error);
    res.status(500).json({ error: "Internal server error during HubSpot sync" });
  }
});

// Manually sync ticket to HubSpot
hubspotRouter.post("/sync/ticket/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isHubSpotConfigured()) {
      return res.status(503).json({ error: "HubSpot integration not configured" });
    }

    const { id } = req.params;
    const prisma = getPrismaClient();

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        partner: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const hubspotDealId = await syncTicketToHubSpot(ticket, ticket.partner);

    if (hubspotDealId) {
      res.json({
        success: true,
        hubspotDealId,
        message: "Ticket successfully synced to HubSpot",
      });
    } else {
      res.status(500).json({ error: "Failed to sync ticket to HubSpot" });
    }
  } catch (error) {
    console.error("HubSpot ticket sync error:", error);
    res.status(500).json({ error: "Internal server error during HubSpot sync" });
  }
});

// Bulk sync all partners
hubspotRouter.post("/sync/partners/bulk", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isHubSpotConfigured()) {
      return res.status(503).json({ error: "HubSpot integration not configured" });
    }

    const prisma = getPrismaClient();
    const partners = await prisma.partner.findMany();

    const results = {
      total: partners.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const partner of partners) {
      try {
        const hubspotContactId = await syncPartnerToHubSpot(partner);
        if (hubspotContactId) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push(`Failed to sync partner: ${partner.companyName}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error syncing ${partner.companyName}: ${String(error)}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      results,
      message: `Bulk sync completed: ${results.synced} synced, ${results.failed} failed`,
    });
  } catch (error) {
    console.error("Bulk partner sync error:", error);
    res.status(500).json({ error: "Internal server error during bulk sync" });
  }
});

// Webhook endpoint for HubSpot to notify us of changes
hubspotRouter.post("/webhook", (req, res) => {
  try {
    // Verify webhook signature if secret is configured
    if (env.HUBSPOT_WEBHOOK_SECRET) {
      const signature = req.headers["x-hubspot-signature-v3"] as string;
      const bodyString = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      const sourceString = `${req.method}${req.url}${bodyString}${Date.now()}`;

      const hash = crypto
        .createHmac("sha256", env.HUBSPOT_WEBHOOK_SECRET)
        .update(sourceString)
        .digest("hex");

      if (signature !== hash) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
    }

    const events = req.body;

    // Process HubSpot webhook events
    for (const event of events) {
      console.log("Processing HubSpot webhook event:", event);

      // Handle contact updates, deal updates, etc.
      switch (event.subscriptionType) {
        case "contact.propertyChange":
          // Handle contact property changes
          break;
        case "deal.propertyChange":
          // Handle deal property changes
          break;
        default:
          console.log("Unhandled webhook event type:", event.subscriptionType);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("HubSpot webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Get HubSpot sync statistics
hubspotRouter.get("/stats", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isHubSpotConfigured()) {
      return res.status(503).json({ error: "HubSpot integration not configured" });
    }

    const client = getHubSpotClient();
    if (!client) {
      return res.status(503).json({ error: "HubSpot client not available" });
    }

    const prisma = getPrismaClient();

    // Get counts from our database
    const [partnerCount, ticketCount] = await Promise.all([
      prisma.partner.count(),
      prisma.ticket.count(),
    ]);

    // Could also fetch counts from HubSpot for comparison
    res.json({
      poolSafe: {
        partners: partnerCount,
        tickets: ticketCount,
      },
      hubspot: {
        // Could add HubSpot contact/deal counts here
        lastSync: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("HubSpot stats error:", error);
    res.status(500).json({ error: "Failed to fetch HubSpot statistics" });
  }
});
