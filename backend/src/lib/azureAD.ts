import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { env } from "./env";

// Azure AD Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: env.AZURE_CLIENT_ID || "",
    clientSecret: env.AZURE_CLIENT_SECRET || "",
    authority: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID || "common"}`,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: env.NODE_ENV === "production" ? 3 : 1, // Error level in prod, Verbose in dev
    },
  },
};

// Create MSAL instance - only if properly configured
export const msalInstance = isAzureADConfigured()
  ? new ConfidentialClientApplication(msalConfig)
  : null;

// Microsoft Graph client factory
export function createGraphClient(accessToken: string): Client | null {
  if (!isAzureADConfigured()) {
    console.warn("Azure AD not configured - Graph client unavailable");
    return null;
  }

  return Client.init({
    defaultVersion: "v1.0",
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

// SSO Configuration
export const ssoConfig = {
  scopes: [
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/profile",
    "https://graph.microsoft.com/email",
  ],
  redirectUri: env.AZURE_REDIRECT_URI || "http://localhost:4000/api/auth/callback",
  responseType: "code",
  responseMode: "query",
  prompt: "select_account",
};

// Helper to check if Azure AD is configured
export function isAzureADConfigured(): boolean {
  // Check process.env directly for tests that modify environment variables
  const clientId = process.env.AZURE_CLIENT_ID || env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET || env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID || env.AZURE_TENANT_ID;
  return !!(clientId && clientSecret && tenantId);
}
