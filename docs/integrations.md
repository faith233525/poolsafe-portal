# Integrations

## Azure AD (Outlook SSO)

- Use Microsoft Identity Platform (MSAL) for staff (Support/Admin) login.
- Configure an Azure AD app registration with redirect URIs to the portal.
- Use server-side validation of JWTs or MSAL middleware to protect admin/support routes.

## Outlook Email & Calendar (Microsoft Graph)

- Use Microsoft Graph API with app-level permissions to send emails, create calendar events, and send reminders.
- Use OAuth2 client credentials flow for server operations.

## HubSpot

- Use HubSpot REST APIs to sync partners and ticket interactions.
- Implement a periodic sync and webhooks for bidirectional updates.

## File Storage

- Upload attachments to Azure Blob Storage and store signed URLs in the DB.
- Restrict access to attachments with SAS tokens.
