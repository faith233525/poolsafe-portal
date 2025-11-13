# Hybrid Email Setup (Microsoft Graph)

Use this guide to enable “send as agent@poolsafeinc.com” with centralized tracking via Reply‑To: support@poolsafeinc.com.

## 1) Azure AD App (once)

1. Go to Azure Active Directory → App registrations → New registration
2. Name: PoolSafe Portal Hybrid Email
3. Supported account types: Accounts in this organizational directory only
4. Redirect URI (Web):
   - https://YOUR-SITE/wp-admin/admin-post.php?action=psp_graph_oauth_callback
5. After creating, copy:
   - Tenant ID
   - Application (client) ID
6. Certificates & secrets → New client secret → copy the value
7. API permissions:
   - Delegated: Mail.Send, offline_access
   - Application: Mail.Read (or Mail.ReadWrite) for shared mailbox ingestion
8. Grant admin consent for your tenant

## 2) WordPress Plugin Settings

In WordPress admin:
- Pool Safe → Email → Microsoft Graph (Hybrid Email)
  - Enable Hybrid Email
  - Reply‑To (Shared Mailbox): support@poolsafeinc.com
  - Azure AD Tenant ID: (from Azure)
  - Client ID: (from Azure)
  - Client Secret: (from Azure)
  - Enable Inbound Ingestion (polls every 5 minutes)

DNS deliverability (recommended):
- Ensure SPF, DKIM, DMARC are set for poolsafeinc.com

Cron (optional, improves timeliness):
- Configure a system cron to hit wp‑cron.php every 5 minutes for near real‑time ingestion

## 3) Connect Microsoft (each support agent)

Each support/admin user:
- WordPress → Profile → “Connect Microsoft”
- Sign in and accept consent
- Status shows connected

## 4) How it works

- Outbound from portal (support comment on a ticket):
  - If connected: sends via Graph as agent@poolsafeinc.com; Reply‑To set to support@poolsafeinc.com
  - If not connected: falls back to SMTP (From your configured SMTP From)
- Inbound: Replies to support@poolsafeinc.com are ingested via Graph, matched by [TICKET‑###], appended to the ticket as a comment, and notify the assigned agent in‑app + email

## 5) Quick test (staging)

1. Create a test ticket and assign it to yourself
2. As support, add a comment on the ticket
   - Partner receives email (From: your Outlook if connected; Reply‑To: support@)
3. Reply from the partner mailbox to the email
   - Within ~5 minutes, the ticket shows a new comment with the reply
   - You receive an in‑app notification and an email alert

## 6) Troubleshooting

- No messages ingested:
  - Check Azure app permissions and Admin Consent
  - Confirm Reply‑To matches your shared mailbox address
  - Ensure wp‑cron runs (or add system cron)
- Send as agent not working:
  - User must “Connect Microsoft” in profile
  - Token may be expired → reconnect; verify Tenant/Client/Secret in Email settings
- Matching fails:
  - Ensure subject includes [TICKET‑###]; users should not remove the tag

## 7) Security notes

- Client Secret is stored in WordPress options; keep admin access limited
- User tokens are stored in user meta; only accessible to administrators
- Use HTTPS for your WordPress site so OAuth redirects are secure
