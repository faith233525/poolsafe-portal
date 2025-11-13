# Microsoft Outlook Email Integration Setup

## Overview
Your PoolSafe Portal is configured to use **Microsoft Outlook (Microsoft 365 / Exchange)** for email-to-ticket functionality. This guide shows how to set up email forwarding using **Power Automate**.

## Your Configuration

**Email Webhook Token:** `(auto-generated and encrypted)`

**Webhook Endpoints:**
- Email-to-Ticket: `https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN`
- Response Tracking: `https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN`

> 📝 **Note:** Your actual webhook URLs with token are available in the Setup Wizard → Email Configuration tab.

---

## Setup Method: Power Automate Flow

### Why Power Automate?
- ✅ Native Microsoft 365 integration
- ✅ No third-party email provider needed
- ✅ Works with existing Outlook mailbox
- ✅ Free with Microsoft 365 subscription
- ✅ Visual flow builder (no coding required)
- ✅ Supports attachments and rich HTML

---

## Step-by-Step Setup

### Step 1: Access Power Automate

1. Go to [https://make.powerautomate.com](https://make.powerautomate.com)
2. Sign in with your **Microsoft 365 admin account**
3. Click **"Create"** → **"Automated cloud flow"**

### Step 2: Configure Trigger

**Flow Name:** `PoolSafe Email to Ticket`

**Trigger:** `When a new email arrives (V3)`

**Settings:**
- **Folder:** Inbox (or create dedicated folder "Support")
- **To:** `support@yourcompany.com` (your support email)
- **Include Attachments:** Yes
- **Only with Attachments:** No
- **Importance:** Any

**Advanced Settings (Optional):**
- **From:** Leave blank (all senders)
- **Has Attachments:** No
- **Subject Filter:** Leave blank

### Step 3: Add Condition (Optional but Recommended)

To differentiate new tickets from replies:

**Add Action:** `Condition`

**If yes (New Ticket):**
- Subject does NOT contain `[Ticket #`
- Send to `/email-to-ticket` endpoint

**If no (Reply to Ticket):**
- Subject contains `[Ticket #`
- Send to `/email-response` endpoint

### Step 4A: New Ticket Flow (Left Branch)

**Add Action:** `HTTP`

**Method:** POST

**URI:**
```
https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN
```
*(Copy exact URL from Setup Wizard)*

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "from": "@{triggerOutputs()?['body/from']}",
  "from_name": "@{triggerOutputs()?['body/fromName']}",
  "to": "@{triggerOutputs()?['body/to']}",
  "subject": "@{triggerOutputs()?['body/subject']}",
  "text": "@{triggerOutputs()?['body/bodyPreview']}",
  "html": "@{triggerOutputs()?['body/body']}"
}
```

### Step 4B: Reply Tracking Flow (Right Branch)

**Add Action:** `HTTP`

**Method:** POST

**URI:**
```
https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "from": "@{triggerOutputs()?['body/from']}",
  "from_name": "@{triggerOutputs()?['body/fromName']}",
  "subject": "@{triggerOutputs()?['body/subject']}",
  "text": "@{triggerOutputs()?['body/bodyPreview']}",
  "html": "@{triggerOutputs()?['body/body']}",
  "in_reply_to": "@{triggerOutputs()?['body/conversationId']}"
}
```

### Step 5: Optional - Move Email After Processing

**Add Action:** `Move email (V2)`

**Settings:**
- **Message Id:** `@{triggerOutputs()?['body/id']}`
- **Destination Folder:** Archive or Processed folder
- **Mark as Read:** Yes (optional)

This keeps your inbox clean and prevents duplicate processing.

### Step 6: Save and Test

1. Click **"Save"** in Power Automate
2. Send a test email to your support address
3. Check **Flow run history** (should show success)
4. Verify ticket created in WordPress Admin → Tickets

---

## Testing Your Flow

### Test 1: New Ticket Creation

**Send email:**
```
To: support@yourcompany.com
Subject: Test ticket from Power Automate
Body: This is a test email to verify email-to-ticket integration.
```

**Expected Result:**
- ✅ Flow runs successfully (check run history)
- ✅ Ticket created in WordPress
- ✅ Ticket has correct partner (matched by domain)
- ✅ Email body appears in ticket content

### Test 2: Support Reply Tracking

**Send email:**
```
To: support@yourcompany.com
Subject: Re: [Ticket #123] Original subject
Body: This is a reply to an existing ticket.
```

**Expected Result:**
- ✅ Flow runs successfully
- ✅ Comment added to ticket #123
- ✅ Response tracked as `via: outlook`
- ✅ Response count incremented

---

## Troubleshooting

### Flow Shows "Failed" in Run History

**Error: 401 Unauthorized**
- **Cause:** Invalid webhook token
- **Solution:** Copy exact URL from Setup Wizard (includes encrypted token)

**Error: 404 Not Found**
- **Cause:** WordPress REST API disabled or permalink structure incorrect
- **Solution:** Settings → Permalinks → Select "Post name" → Save

**Error: 500 Internal Server Error**
- **Cause:** Plugin error or WordPress issue
- **Solution:** Check WordPress debug.log for PHP errors

### Email Received but No Ticket Created

1. Check Flow run history (should show success)
2. Check WordPress → Tickets (ticket may exist)
3. If domain doesn't match, check Tickets → Pending Emails (manual linking)
4. Verify webhook token matches Setup Wizard

### Duplicate Tickets Created

**Cause:** Flow triggering multiple times for same email

**Solution:**
- Add condition to check if ticket already exists
- Add delay/debounce action
- Move processed emails to separate folder

### Attachments Not Included

**Cause:** Power Automate doesn't send attachments in basic HTTP action

**Solution:**
- Use Graph API connector instead of basic HTTP
- Or: Add separate action to upload attachments via WordPress REST API

---

## Advanced: Microsoft Graph API Integration

For more control, use the Microsoft Graph API connector:

### Advantages:
- ✅ Access to full email metadata
- ✅ Attachment handling
- ✅ Message threading/conversation tracking
- ✅ Better performance for high volume

### Setup:

**1. Add Graph Connector:**
- Action: `Microsoft Graph - Get emails (V3)`
- Connection: Use your Azure AD app credentials (already configured)

**2. Poll for New Emails:**
- Trigger: Recurrence (every 5 minutes)
- Filter: `isRead eq false and receivedDateTime ge @{addMinutes(utcNow(), -10)}`

**3. Process Each Email:**
- Loop through results
- Send to webhook endpoints
- Mark as read

**4. Handle Attachments:**
- Get attachments via Graph API
- Upload to WordPress media library
- Attach to ticket

---

## Alternative: Email Forwarding Rule

If Power Automate is unavailable:

### Option 1: Outlook Rules + Azure Logic Apps
Similar to Power Automate but more enterprise features

### Option 2: Third-Party Email Parser
- **Zapier:** Outlook trigger → Webhook action
- **Make.com (Integromat):** Outlook module → HTTP module
- **n8n:** Self-hosted alternative

### Option 3: SendGrid/Mailgun Forwarding
Forward emails from Outlook to SendGrid Inbound Parse:
1. Create forwarding rule in Outlook
2. Forward to SendGrid inbound domain
3. SendGrid triggers webhook

---

## Security Best Practices

1. **Protect Webhook Token:**
   - Never share token publicly
   - Regenerate if compromised (Setup Wizard)
   - Use HTTPS only

2. **Limit Flow Permissions:**
   - Run flow with service account (not personal admin)
   - Restrict to specific mailbox folder

3. **Monitor Flow Activity:**
   - Check run history weekly
   - Set up failure alerts
   - Review created tickets

4. **Validate Email Source:**
   - Add SPF/DKIM checks in flow
   - Whitelist sender domains
   - Block suspicious patterns

---

## Cost Considerations

**Power Automate:**
- Included with Microsoft 365 Business plans
- ~2000 runs/month on free tier
- Premium connectors may require additional license

**Microsoft Graph API:**
- No additional cost (uses existing Azure AD app)
- Rate limits apply (depends on Azure plan)

**Recommendations:**
- Start with Power Automate (easier, no coding)
- Scale to Graph API if needed (>1000 emails/day)

---

## Support Resources

**Microsoft Documentation:**
- [Power Automate](https://learn.microsoft.com/en-us/power-automate/)
- [Graph API - List Messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages)
- [Outlook Mail REST API](https://learn.microsoft.com/en-us/previous-versions/office/office-365-api/api/version-2.0/mail-rest-operations)

**PoolSafe Portal:**
- Setup Wizard: WordPress Admin → PoolSafe Setup
- Webhook URLs: Setup Wizard → Email Configuration tab
- Test Endpoints: Use built-in connection tester

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ Microsoft Outlook → PoolSafe Portal Integration        │
├─────────────────────────────────────────────────────────┤
│ Method: Power Automate Flow                            │
│ Trigger: When a new email arrives (V3)                 │
│ Folder: support@yourcompany.com Inbox                  │
│                                                         │
│ New Ticket Endpoint:                                   │
│ POST /wp-json/poolsafe/v1/email-to-ticket?token=XXX   │
│                                                         │
│ Reply Tracking Endpoint:                               │
│ POST /wp-json/poolsafe/v1/email-response?token=XXX    │
│                                                         │
│ Test: Send email → Check Flow history → Verify ticket  │
└─────────────────────────────────────────────────────────┘
```

**Setup Time:** 15-20 minutes  
**Difficulty:** Easy (visual flow builder)  
**Cost:** Free (included with Microsoft 365)

---

**Next Steps:**
1. ✅ Create Power Automate flow (15 min)
2. ✅ Send test email
3. ✅ Verify ticket creation
4. ✅ Test reply tracking
5. ✅ Go live!
