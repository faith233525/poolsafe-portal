# Email-to-Ticket Setup Guide

## Overview
The email-to-ticket system automatically converts incoming support emails into tickets. Partners are matched by email domain, and unmatched emails are stored for manual linking.

## Webhook Endpoint
```
POST https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket
```

## Authentication
Add webhook authentication token to `wp-config.php`:
```php
define('PSP_EMAIL_WEBHOOK_TOKEN', 'your-random-secure-token-here');
```

Generate secure token:
```bash
openssl rand -base64 32
```

## Email Provider Configuration

### SendGrid Inbound Parse

1. **Go to SendGrid** → Settings → Inbound Parse
2. **Add Host & URL**
   - Hostname: `support.yourcompany.com` (or subdomain)
   - URL: `https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN`
   - Check "POST the raw, full MIME message"
3. **DNS Setup** (at your domain registrar)
   - Type: MX
   - Host: `support` (or your subdomain)
   - Points to: `mx.sendgrid.net`
   - Priority: 10
4. **Field Mapping** (SendGrid format)
   ```json
   {
     "from": "sender@example.com",
     "to": "support@yourcompany.com",
     "subject": "Help needed",
     "text": "Plain text body",
     "html": "<p>HTML body</p>"
   }
   ```

### Mailgun Routes

1. **Go to Mailgun** → Sending → Routes
2. **Create Route**
   - Priority: 0
   - Filter Expression: `match_recipient("support@yourcompany.com")`
   - Actions:
     - Forward: `https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN`
     - Stop processing routes
3. **Domain Verification**
   - Add MX records to your DNS
   - Verify SPF and DKIM
4. **Field Mapping** (Mailgun format)
   ```json
   {
     "sender": "sender@example.com",
     "recipient": "support@yourcompany.com",
     "subject": "Help needed",
     "body-plain": "Plain text body",
     "body-html": "<p>HTML body</p>"
   }
   ```

### Postmark Inbound

1. **Go to Postmark** → Servers → [Your Server] → Inbound
2. **Add Inbound Domain**
   - Domain: `yourcompany.com`
3. **Configure Webhook**
   - URL: `https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN`
   - Include raw email JSON: ✓
4. **DNS Setup**
   - Add MX record pointing to `inbound.postmarkapp.com`
5. **Field Mapping** (Postmark format)
   ```json
   {
     "From": "sender@example.com",
     "To": "support@yourcompany.com",
     "Subject": "Help needed",
     "TextBody": "Plain text body",
     "HtmlBody": "<p>HTML body</p>"
   }
   ```

### Custom SMTP (Zapier/Make.com)

If using your own email server:

1. **Create Zapier Zap** or **Make.com Scenario**
   - Trigger: Email Received (Gmail/Outlook/IMAP)
   - Action: Webhook POST
2. **Webhook Configuration**
   ```
   URL: https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN
   Method: POST
   Headers: Content-Type: application/json
   Body:
   {
     "from": "{{sender_email}}",
     "from_name": "{{sender_name}}",
     "to": "{{recipient}}",
     "subject": "{{subject}}",
     "text": "{{body_plain}}",
     "html": "{{body_html}}"
   }
   ```

## How It Works

### 1. Domain Matching
- Extracts domain from sender email (e.g., `acmepool.com` from `john@acmepool.com`)
- Searches partner records for matching `psp_email_domain` meta field
- If found, creates ticket automatically and links to partner

### 2. Pending Emails
- Unmatched emails are stored in `wp_psp_pending_emails` table
- Support staff can manually link emails to partners via admin UI
- Manual linking saves domain to partner for future auto-matching

### 3. Ticket Creation
- Created tickets have:
  - Status: `open`
  - Priority: `medium`
  - Source: `email`
  - Meta: `sender_email`, `sender_name`
  - Title: Email subject
  - Content: Email body (HTML if available, otherwise plain text)

## Admin Interface

Access pending emails:
1. Go to **WordPress Admin** → Tickets → **Pending Emails**
2. View unmatched emails with sender domain/subject
3. Select partner from dropdown
4. Click "Link & Create Ticket"
5. Domain is saved to partner for future auto-matching

## Partner Email Domain Setup

### For Support Staff
When creating/editing a partner:
1. Edit partner in WordPress admin
2. Add **Email Domain** custom field
3. Value: `acmepool.com` (without @ or www)
4. Save partner

### Bulk Import
CSV/Excel column: `email_domain`
```csv
company_name,company_email,email_domain
Acme Pool,info@acmepool.com,acmepool.com
```

### REST API
```bash
curl -X POST https://yoursite.com/wp-json/poolsafe/v1/partners \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Pool",
    "company_email": "info@acmepool.com",
    "email_domain": "acmepool.com"
  }'
```

## Testing

### Send Test Email
1. Send email to your configured address (e.g., `support@yourcompany.com`)
2. Check webhook logs in your email provider dashboard
3. Verify ticket created in WordPress → Tickets
4. If not auto-matched, check Tickets → Pending Emails

### Webhook Test (cURL)
```bash
curl -X POST "https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "john@acmepool.com",
    "from_name": "John Doe",
    "to": "support@yourcompany.com",
    "subject": "Test ticket",
    "text": "This is a test email",
    "html": "<p>This is a test email</p>"
  }'
```

Expected response:
```json
{
  "success": true,
  "ticket_id": 123,
  "message": "Ticket created from email",
  "partner_id": 45
}
```

Or for unmatched:
```json
{
  "success": true,
  "pending_id": 7,
  "message": "Email stored for manual linking"
}
```

## Troubleshooting

### Email not creating ticket
1. Check webhook logs in email provider dashboard
2. Verify webhook URL and token are correct
3. Test endpoint directly with cURL (see above)
4. Check WordPress error log: `wp-content/debug.log`
5. Enable debug mode in `wp-config.php`:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```

### Domain not matching
1. Go to partner edit screen
2. Check **Email Domain** field value
3. Should be domain only: `acmepool.com` (not `@acmepool.com` or `https://acmepool.com`)
4. Save partner and resend test email

### Webhook authentication failing
1. Verify `PSP_EMAIL_WEBHOOK_TOKEN` is defined in `wp-config.php`
2. Ensure token matches URL parameter: `?token=YOUR_TOKEN`
3. Check for URL encoding issues (use exact token)

### Pending emails not showing
1. Reactivate plugin to create database table
2. Check table exists: `SELECT * FROM wp_psp_pending_emails`
3. Verify user has `psp_support` or `administrator` role

## Security Notes

- **Never expose webhook token** in public repositories
- Use HTTPS for webhook URL
- Restrict webhook endpoint to email provider IPs (optional)
- Rotate webhook token periodically
- Validate webhook signatures if provider supports (SendGrid Event Webhook, Mailgun signatures)

## Next Steps

1. ✅ Configure email provider webhook
2. ✅ Add webhook token to `wp-config.php`
3. ✅ Add email domains to partner records
4. ✅ Send test email
5. ✅ Verify ticket creation
6. ✅ Test manual linking for unmatched email
7. ✅ Monitor for 24-48 hours
8. ✅ Document partner email domains

---

**Support:** If issues persist, contact PoolSafe Portal support with:
- Email provider name
- Webhook logs
- WordPress debug.log excerpt
- Partner email domain configuration
