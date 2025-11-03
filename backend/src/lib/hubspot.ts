import { Client } from "@hubspot/api-client";
import { env } from "./env";

// HubSpot Account Configuration
export const HUBSPOT_ACCOUNT_ID = "21854204";

// HubSpot client singleton
let hubspotClient: Client | null = null;

export function getHubSpotClient(): Client | null {
  const inTest = !!process.env.VITEST || process.env.NODE_ENV === "test";
  // In tests, only respect process.env to allow per-test overrides
  const token = inTest ? process.env.HUBSPOT_API_KEY : process.env.HUBSPOT_API_KEY || env.HUBSPOT_API_KEY;
  if (!token) {
    console.warn("HubSpot API key not configured");
    hubspotClient = null;
    return null;
  }

  if (!hubspotClient) {
    hubspotClient = new Client({ accessToken: token });
  }

  return hubspotClient;
}

// Check if HubSpot is configured
export function isHubSpotConfigured(): boolean {
  const inTest = !!process.env.VITEST || process.env.NODE_ENV === "test";
  // In tests, only use process.env so test can force missing/present
  const apiKey = inTest ? process.env.HUBSPOT_API_KEY : process.env.HUBSPOT_API_KEY || env.HUBSPOT_API_KEY;
  return !!apiKey;
}

// Partner to HubSpot Contact mapping
export interface HubSpotContact {
  email: string;
  firstname?: string;
  lastname?: string;
  company: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  // Custom properties for Pool Safe Inc
  loungenie_units?: string;
  top_colour?: string;
  partner_id?: string;
  management_company?: string;
}

// Ticket to HubSpot Deal mapping
export interface HubSpotDeal {
  dealname: string;
  dealstage: string;
  amount?: string;
  closedate?: string;
  pipeline?: string;
  // Custom properties
  ticket_id?: string;
  ticket_category?: string;
  ticket_priority?: string;
  units_affected?: string;
}

// Sync partner to HubSpot as contact
export async function syncPartnerToHubSpot(partner: any): Promise<string | null> {
  const client = getHubSpotClient();
  if (!client) {
    return null;
  }

  try {
    const contactData: HubSpotContact = {
      email:
        partner.userEmail ||
        `contact@${partner.companyName?.toLowerCase().replace(/\s+/g, "")}.com`,
      company: partner.companyName,
      address: partner.streetAddress,
      city: partner.city,
      state: partner.state,
      zip: partner.zip,
      country: partner.country,
      // Custom properties
      loungenie_units: String(partner.numberOfLoungeUnits || 0),
      top_colour: partner.topColour,
      partner_id: partner.id,
      management_company: partner.managementCompany,
    };

    // Check if contact exists
    let contactId: string | null = null;
    try {
      const searchResult = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "partner_id",
                operator: "EQ" as any, // Fix type error for FilterOperatorEnum
                value: partner.id,
              },
            ],
          },
        ],
        limit: 1,
      });

      if (searchResult.results && searchResult.results.length > 0) {
        contactId = searchResult.results[0].id;
      }
    } catch {
      console.log("Contact not found, will create new one");
    }

    if (contactId) {
      // Update existing contact
      const contactProps: Record<string, string> = Object.entries(contactData).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      await client.crm.contacts.basicApi.update(contactId, {
        properties: contactProps,
      });
      console.log(`Updated HubSpot contact ${contactId} for partner ${partner.companyName}`);
      return contactId;
    } else {
      // Create new contact
      const contactProps: Record<string, string> = Object.entries(contactData).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      const result = await client.crm.contacts.basicApi.create({
        properties: contactProps,
      });
      console.log(`Created HubSpot contact ${result.id} for partner ${partner.companyName}`);
      return result.id;
    }
  } catch (error) {
    console.error("Error syncing partner to HubSpot:", error);
    return null;
  }
}

// Sync ticket to HubSpot as deal
export async function syncTicketToHubSpot(ticket: any, partner: any): Promise<string | null> {
  const client = getHubSpotClient();
  if (!client) {
    return null;
  }

  try {
    // Map ticket status to HubSpot deal stage
    const statusToStage: { [key: string]: string } = {
      OPEN: "qualifiedtobuy", // Qualified to buy
      IN_PROGRESS: "presentationscheduled", // Presentation scheduled
      RESOLVED: "closedwon", // Closed won
    };

    const dealData: HubSpotDeal = {
      dealname: `${partner.companyName} - ${ticket.subject}`,
      dealstage: statusToStage[ticket.status] || "qualifiedtobuy",
      // Custom properties
      ticket_id: ticket.id,
      ticket_category: ticket.category,
      ticket_priority: ticket.priority,
      units_affected: String(ticket.unitsAffected || 0),
    };

    // Check if deal exists for this ticket
    let dealId: string | null = null;
    try {
      const searchResult = await client.crm.deals.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "ticket_id",
                operator: "EQ" as any, // Fix type error for FilterOperatorEnum
                value: ticket.id,
              },
            ],
          },
        ],
        limit: 1,
      });

      if (searchResult.results && searchResult.results.length > 0) {
        dealId = searchResult.results[0].id;
      }
    } catch {
      console.log("Deal not found, will create new one");
    }

    if (dealId) {
      // Update existing deal
      const dealProps: Record<string, string> = Object.entries(dealData).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      await client.crm.deals.basicApi.update(dealId, {
        properties: dealProps,
      });
      console.log(`Updated HubSpot deal ${dealId} for ticket ${ticket.id}`);
      return dealId;
    } else {
      // Create new deal
      const dealProps: Record<string, string> = Object.entries(dealData).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      const result = await client.crm.deals.basicApi.create({
        properties: dealProps,
      });
      console.log(`Created HubSpot deal ${result.id} for ticket ${ticket.id}`);
      return result.id;
    }
  } catch (error) {
    console.error("Error syncing ticket to HubSpot:", error);
    return null;
  }
}

// Log activity to HubSpot
export async function logActivityToHubSpot(
  _contactId: string,
  _activityType: string,
  _subject: string,
  _description: string,
): Promise<void> {
  const client = getHubSpotClient();
  if (!client) {
    return;
  }

  try {
    await client.crm.contacts.basicApi.create({
      properties: {
        // This would be an engagement/activity - adjust based on HubSpot setup
      },
    });
  } catch (error) {
    console.error("Error logging activity to HubSpot:", error);
  }
}
