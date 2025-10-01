import { ConfidentialClientApplication } from "@azure/msal-node";
import { env } from "./env";

export const isAzureADConfigured = () => {
  // Read from process.env so tests that mutate env can observe changes at runtime
  return !!process.env.AZURE_CLIENT_ID && !!process.env.AZURE_CLIENT_SECRET;
};

export const ssoConfig = {
  scopes: ["openid", "profile", "email", "User.Read"],
  // Router is mounted under /api/sso and defines route "/sso/callback" -> effective path: /api/sso/sso/callback
  // We prefer the /api/auth mount which definitely exists: /api/auth/sso/callback
  redirectUri:
    env.AZURE_REDIRECT_URI || `http://localhost:${env.PORT || 4000}/api/auth/sso/callback`,
  responseType: "code",
  responseMode: "query",
  prompt: "select_account",
};

export const msalConfig = {
  auth: {
    clientId: env.AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID || "common"}`,
    clientSecret: env.AZURE_CLIENT_SECRET || "",
  },
};

export let msalInstance: ConfidentialClientApplication | null = null;

if (isAzureADConfigured()) {
  msalInstance = new ConfidentialClientApplication(msalConfig);
}

export const createGraphClient = (accessToken: string) => {
  if (!isAzureADConfigured()) {
    return null;
  }
  // Simple Graph API client without external dependencies
  return {
    api: (endpoint: string) => ({
      async get() {
        const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
      }
    })
  };
};
