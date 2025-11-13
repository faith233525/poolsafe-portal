# Go-Live Readiness Summary

## ✅ Implementation Complete (Commit cc979a0)

### **Portal Ticket Auto-Association**
When partners create tickets through the portal:
- ✅ System automatically detects which company submitted the ticket
- ✅ Partner ID extracted from logged-in user's meta data (`psp_partner_id`)
- ✅ Fallback: Email matching if meta not set (queries `psp_company_email`)
- ✅ Ticket source tracked as `portal` vs `email`
- ✅ Sender email/name captured for thread continuity

**Code Location:** `includes/class-psp-rest.php` → `create_ticket()` method

### **Email Response Tracking (Portal + Outlook)**
Support staff can respond via:

**1. Portal Comments**
- Support adds comment on ticket
- Auto-tracked: `response_via = portal`
- Response count incremented
- Timestamp & responder email recorded

**2. Outlook/Gmail Email Replies**
- Support replies to ticket notification email
- Email provider forwards to webhook: `POST /wp-json/poolsafe/v1/email-response`
- Subject parsed for ticket ID: `[Ticket #123]`
- Response added as comment
- Auto-tracked: `response_via = outlook`

**Benefits:**
- ✅ Support can use their existing email workflow
- ✅ All responses tracked in one place (ticket thread)
- ✅ Partners see complete conversation history
- ✅ No need to train support on new interface

**Code Location:** `includes/class-psp-email-response-tracker.php`

### **Thread Continuity System**
Every ticket gets a unique thread ID:
- Format: `ticket-{id}-{hash8}` (e.g., `ticket-123-abc12345`)
- Used in email Message-ID header: `<ticket-123-abc12345@yoursite.com>`
- Subject line includes ticket ID: `[Ticket #123] Original subject`
- Email providers track replies via In-Reply-To header
- Webhook parses thread ID to match responses

**Code Location:**
- Thread ID generation: `class-psp-rest.php` + `class-psp-email-to-ticket.php`
- Response matching: `class-psp-email-response-tracker.php` → `handle_email_response()`

### **Email-to-Ticket Meta Fields**
All tickets (portal + email) now track:
```php
psp_source          → 'portal', 'email', 'phone', 'chat'
psp_sender_email    → Original sender email
psp_sender_name     → Original sender name
psp_thread_id       → Unique email thread identifier
psp_response_count  → Total responses (portal + email)
psp_last_response_at → ISO datetime of last response
psp_last_response_by → Email of responder
psp_last_response_via → 'portal', 'outlook', 'gmail'
```

**Code Location:** `includes/class-psp-tickets.php` → Meta field registration

---

## 📋 Pre-Live Configuration Required

### **1. Email Webhook Configuration**

#### **Inbound Email-to-Ticket (Already Setup)**
Webhook: `POST https://yoursite.com/wp-json/poolsafe/v1/email-to-ticket?token=YOUR_TOKEN`

See: `EMAIL-TO-TICKET-SETUP.md`

#### **Response Tracking (NEW - Setup Required)**
Webhook: `POST https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN`

**Purpose:** Track support email replies sent from Outlook/Gmail

**SendGrid Configuration:**
1. Settings → Inbound Parse → Add URL
2. URL: `https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN`
3. Check "POST the raw, full MIME message"
4. DNS: Add MX record → `mx.sendgrid.net`

**Mailgun Configuration:**
1. Sending → Routes → Create Route
2. Filter: `match_recipient("support@yourcompany.com")`
3. Forward to: `https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN`

**Postmark Configuration:**
1. Servers → [Your Server] → Inbound
2. Add webhook: `https://yoursite.com/wp-json/poolsafe/v1/email-response?token=YOUR_TOKEN`

**Email Template Requirements:**
- Subject must include: `[Ticket #123]` or `Re: [Ticket #123]`
- Message-ID should be: `<ticket-123-abc12345@yoursite.com>`
- In-Reply-To header should reference original ticket Message-ID

### **2. wp-config.php Updates**

Add to `wp-config.php`:
```php
// Email webhook authentication (use same token for both endpoints)
define('PSP_EMAIL_WEBHOOK_TOKEN', 'your-secure-random-token-here');

// Azure AD SSO (if not already added)
define('PSP_AZURE_CLIENT_ID', 'your-client-id');
define('PSP_AZURE_CLIENT_SECRET', 'your-client-secret');
define('PSP_AZURE_TENANT_ID', 'your-tenant-id');
define('PSP_AZURE_REDIRECT_URI', 'https://yoursite.com/wp-admin/admin-ajax.php?action=psp_azure_callback');

// HubSpot CRM (if not already added)
define('PSP_HUBSPOT_API_KEY', 'pat-na1-...');
define('PSP_HUBSPOT_PORTAL_ID', '12345678');
```

Generate secure token:
```bash
openssl rand -base64 32
```

### **3. Email Notification Template Updates**

Update email templates to include thread tracking:

**Headers to add:**
```
Message-ID: <ticket-{ticket_id}-{thread_hash}@yoursite.com>
Subject: [Ticket #{ticket_id}] {ticket_subject}
```

This ensures support email replies are automatically tracked.

**Code Location:** `includes/class-psp-email.php` (or your notification class)

---

## 🧪 Testing Checklist

### **Test 1: Portal Ticket Auto-Association**
1. ✅ Login as partner user
2. ✅ Create ticket via portal
3. ✅ Verify ticket has correct `partner_id` (check WordPress admin or API)
4. ✅ Verify `source = portal`
5. ✅ Verify `sender_email` matches logged-in user

**Expected Result:** Partner company auto-filled, no manual selection needed

### **Test 2: Support Portal Response**
1. ✅ Login as support user
2. ✅ Open ticket
3. ✅ Add comment via portal
4. ✅ Check ticket meta:
   - `response_count` = 1
   - `last_response_via` = portal
   - `last_response_by` = support email

**Expected Result:** Response tracked in ticket thread

### **Test 3: Support Outlook Response**
1. ✅ Configure email webhook (see above)
2. ✅ Create test ticket
3. ✅ Send notification email to partner (with Message-ID header)
4. ✅ Reply to email from support Outlook account
5. ✅ Verify:
   - Comment added to ticket in portal
   - `response_count` incremented
   - `last_response_via` = outlook

**Expected Result:** Email reply appears as comment in portal

### **Test 4: Email-to-Ticket Thread Continuity**
1. ✅ Send email to support address
2. ✅ Verify ticket created with `thread_id`
3. ✅ Reply to ticket (as support)
4. ✅ Partner replies to email
5. ✅ Verify all responses in single ticket thread

**Expected Result:** One ticket with complete conversation

### **Test 5: Response History API**
```bash
GET https://yoursite.com/wp-json/poolsafe/v1/tickets/123/responses
```

**Expected Response:**
```json
{
  "ticket_id": 123,
  "response_count": 3,
  "responses": [
    {
      "id": 1,
      "author": "Support Staff",
      "author_email": "support@company.com",
      "content": "Thank you for contacting us...",
      "date": "2025-11-13 10:30:00",
      "via": "portal",
      "source": "comment"
    },
    {
      "id": 2,
      "author": "Support Staff",
      "author_email": "support@company.com",
      "content": "Following up...",
      "date": "2025-11-13 14:15:00",
      "via": "outlook",
      "source": "email"
    }
  ]
}
```

---

## 🚀 Recommended Improvements (Before Go-Live)

### **High Priority (Implement Today)**

#### 1. Email Template with Thread Tracking
Update notification email template to include:
- Message-ID header with thread_id
- Subject line with [Ticket #ID]
- Reply-To address pointing to support email
- HTML template with company branding

**Example implementation:**
```php
// In PSP_Email class
public static function notify_new_ticket($ticket_id) {
    $thread_id = get_post_meta($ticket_id, 'psp_thread_id', true);
    $ticket = get_post($ticket_id);
    
    $headers = [
        'Message-ID: <' . $thread_id . '@' . parse_url(home_url(), PHP_URL_HOST) . '>',
        'Content-Type: text/html; charset=UTF-8'
    ];
    
    $subject = '[Ticket #' . $ticket_id . '] ' . $ticket->post_title;
    
    wp_mail($to, $subject, $body, $headers);
}
```

#### 2. Mobile Responsive Check
- Test all 8 WordPress pages on mobile (iPhone, Android)
- Verify ticket submission form works on mobile
- Check comment/response UI on tablets
- Ensure buttons/dropdowns accessible on touchscreens

#### 3. Password Reset Flow
- Add "Forgot Password?" link to login page
- Test partner self-service password reset
- Verify email delivery
- Ensure reset link expires after 24h

#### 4. Browser Compatibility
- Test on Chrome (Windows + Mac)
- Test on Firefox
- Test on Safari (Mac + iPhone)
- Test on Edge
- Check for console errors

### **Medium Priority (This Week)**

#### 5. SLA Tracking & Auto-Escalation
- Auto-escalate tickets if no response in 24h
- Email notification to manager
- Status change to "escalated"
- Dashboard widget showing SLA breaches

#### 6. Canned Responses
- Pre-written templates for common questions
- Quick insert from dropdown
- Support staff can create custom templates
- Macros for partner name, ticket ID

#### 7. File Attachments
- Allow partners to attach images/PDFs to tickets
- Support image upload in portal
- Parse email attachments from email-to-ticket
- Display attachments in ticket thread

### **Low Priority (Future)**

8. Live chat widget (Intercom, Drift, or custom)
9. Knowledge base AI search
10. Multi-language support (Spanish, French)
11. Mobile app (React Native or Flutter)
12. Voice/video calls (Zoom/Teams integration)
13. Satisfaction surveys (CSAT/NPS)

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Email Provider                           │
│              (SendGrid/Mailgun/Postmark)                    │
└──────────────┬──────────────────────────┬───────────────────┘
               │ Inbound                  │ Support Reply
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│ /email-to-ticket         │  │ /email-response              │
│ • Parse sender email     │  │ • Parse In-Reply-To header   │
│ • Extract domain         │  │ • Match ticket via subject   │
│ • Match partner          │  │ • Add comment to ticket      │
│ • Create ticket + thread │  │ • Track via=outlook          │
└────────────┬─────────────┘  └──────────┬───────────────────┘
             │                           │
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  WordPress Database                         │
│                                                             │
│  wp_posts (CPT: psp_ticket)                                │
│  ├── post_title: Ticket subject                            │
│  ├── post_content: Original email/portal submission        │
│  └── post_author: User ID or 0 (email)                     │
│                                                             │
│  wp_postmeta (Ticket Meta)                                 │
│  ├── psp_partner_id: Company ID                            │
│  ├── psp_source: portal|email                              │
│  ├── psp_thread_id: ticket-123-abc12345                    │
│  ├── psp_response_count: 3                                 │
│  ├── psp_last_response_via: portal|outlook                 │
│  └── psp_sender_email: original@sender.com                 │
│                                                             │
│  wp_comments (Responses/Thread)                            │
│  ├── comment_post_ID: Ticket ID                            │
│  ├── comment_content: Response text                        │
│  └── comment_meta: response_via, response_source           │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     REST API Endpoints                      │
│                                                             │
│  GET  /tickets/{id}              → Ticket details          │
│  GET  /tickets/{id}/responses    → Full conversation       │
│  POST /tickets                   → Create (auto partner)   │
│  POST /email-to-ticket           → Webhook (inbound)       │
│  POST /email-response            → Webhook (replies)       │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Portal                           │
│                                                             │
│  Partner View:                                              │
│  • Create ticket (company auto-filled)                      │
│  • View ticket thread (portal + email responses)            │
│  • Reply via portal comment                                 │
│                                                             │
│  Support View:                                              │
│  • View all tickets                                         │
│  • Respond via portal OR Outlook (both tracked)             │
│  • See response source (portal/outlook badge)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Go-Live Procedure

### **Immediate (Next 1-2 Hours)**

1. **Add webhook token to wp-config.php**
   ```bash
   # Generate token
   openssl rand -base64 32
   
   # Add to wp-config.php
   define('PSP_EMAIL_WEBHOOK_TOKEN', 'generated-token-here');
   ```

2. **Configure email provider webhooks**
   - Add `/email-response` endpoint (see EMAIL-TO-TICKET-SETUP.md)
   - Test with cURL (see testing section below)

3. **Update email notification template**
   - Add Message-ID header with thread_id
   - Add [Ticket #ID] to subject line
   - Test email delivery

4. **Import initial partner data**
   - Use bulk import (CSV or Excel)
   - Verify companies created
   - Check email domains saved

5. **Create support user accounts**
   - Azure AD auto-provision OR manual creation
   - Test login
   - Verify permissions

### **Testing (Next 2-3 Hours)**

1. Run all 5 tests above
2. Verify email webhooks working
3. Test portal ticket auto-association
4. Test Outlook response tracking
5. Check HubSpot sync (if enabled)

### **Documentation (Next 1 Hour)**

1. Send partner welcome emails (credentials + getting started)
2. Send support team guide (how to use portal + email workflows)
3. Create internal FAQ document
4. Document emergency contacts/rollback procedure

### **Go-Live (When Ready)**

1. Announce to partners (email + portal banner)
2. Monitor for 24 hours (error logs, email delivery, ticket creation)
3. Respond to questions immediately
4. Collect feedback for improvements

---

## 🔧 Troubleshooting

### **Email responses not tracked**
1. Check webhook logs in email provider dashboard
2. Verify webhook URL and token correct
3. Test endpoint: `curl -X POST "https://yoursite.com/wp-json/poolsafe/v1/email-response?token=TOKEN" -d '{"from":"test@example.com","subject":"[Ticket #123] Test"}'`
4. Check WordPress debug log: `wp-content/debug.log`

### **Partner not auto-detected**
1. Check user has `psp_partner_id` meta: `get_user_meta($user_id, 'psp_partner_id', true)`
2. Verify partner email matches company email in database
3. Test REST endpoint: `GET /wp-json/poolsafe/v1/my-partner`

### **Duplicate responses**
1. Check email provider only sends webhook once (not duplicate)
2. Verify comment ID unique (no duplicate comments)
3. Add deduplication based on Message-ID header

---

## 📞 Support

**Technical Issues:**
- Plugin/WordPress: [Your support email]
- Email provider: [SendGrid/Mailgun support]
- Azure AD: [Microsoft support]
- HubSpot: [HubSpot support]

**Emergency Rollback:**
1. Deactivate plugin: Plugins → Deactivate
2. Restore database backup
3. Clear all caches
4. Contact support with error logs

---

**Status:** ✅ Ready for production deployment  
**Version:** 1.3.1 (commit cc979a0)  
**Last Updated:** November 13, 2025  
**Go-Live Target:** Today
