import { ConfidentialClientApplication } from "@azure/msal-node";
import { env } from "../lib/env";

export const isAzureADConfigured = () => {
  return !!env.AZURE_AD_CLIENT_ID && !!env.AZURE_AD_CLIENT_SECRET;
};

export const ssoConfig = {
  scopes: ["openid", "profile", "email", "User.Read"],
  redirectUri: "http://localhost:4000/sso/callback",
  responseType: "code",
  responseMode: "query",
  prompt: "select_account",
};

export let msalInstance: ConfidentialClientApplication | null = null;

if (isAzureADConfigured()) {
  msalInstance = new ConfidentialClientApplication({
    auth: {
      clientId: env.AZURE_AD_CLIENT_ID,
      authority: `https://login.microsoftonline.com/common`,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
    },
  });
}

export const createGraphClient = (accessToken: string) => {
  // You can use @microsoft/microsoft-graph-client here if needed
  return null;
};
