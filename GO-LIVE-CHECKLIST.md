# Pre-Live Deployment Checklist

## Critical Go-Live Checks

### 1. **Environment Configuration**

#### Email Configuration
- [ ] Add `PSP_EMAIL_WEBHOOK_TOKEN` to `wp-config.php`
  ```php
  define('PSP_EMAIL_WEBHOOK_TOKEN', 'your-secure-random-token');
  ```
- [ ] Configure email provider webhook (SendGrid/Mailgun/Postmark)
  - Inbound: `POST /wp-json/poolsafe/v1/email-to-ticket?token=TOKEN`
  - Response tracking: `POST /wp-json/poolsafe/v1/email-response?token=TOKEN`
- [ ] Test email-to-ticket: Send email → verify ticket created
- [ ] Test Outlook response tracking: Reply to ticket email → verify comment added
- [ ] Verify SMTP outbound configured for notifications

#### Azure AD SSO (Support Staff Login)
- [ ] Create Azure AD app registration (see `AZURE-AD-SETUP.md`)
- [ ] Add credentials to `wp-config.php`:
  ```php
  define('PSP_AZURE_CLIENT_ID', 'your-client-id');
  define('PSP_AZURE_CLIENT_SECRET', 'your-client-secret');
  define('PSP_AZURE_TENANT_ID', 'your-tenant-id');
  define('PSP_AZURE_REDIRECT_URI', 'https://yoursite.com/wp-admin/admin-ajax.php?action=psp_azure_callback');
  ```
- [ ] Grant API permissions (User.Read, email, profile, openid)
- [ ] Test support login with Microsoft account
- [ ] Verify user auto-provisioning with `psp_support` role

#### HubSpot CRM Integration
- [ ] Create HubSpot private app (see `HUBSPOT-SETUP.md`)
- [ ] Add credentials to `wp-config.php`:
  ```php
  define('PSP_HUBSPOT_API_KEY', 'pat-na1-...');
  define('PSP_HUBSPOT_PORTAL_ID', '12345678');
  ```
- [ ] Create custom properties in HubSpot (poolsafe_partner_id, poolsafe_units, etc.)
- [ ] Enable sync in plugin settings
- [ ] Run initial full sync (Pool Safe → HubSpot Sync)
- [ ] Verify companies/contacts synced
- [ ] Test real-time sync: Create partner → verify appears in HubSpot

### 2. **WordPress Configuration**

#### Plugin Settings
- [ ] Activate PoolSafe Portal plugin
- [ ] Verify version 1.3.1 or later
- [ ] Check plugin settings: Pool Safe → Settings
  - Enable email notifications ✓
  - Enable Azure AD SSO ✓
  - Enable HubSpot sync ✓
- [ ] Verify permalink structure: Settings → Permalinks (use "Post name")

#### User Roles & Permissions
- [ ] Create support staff users (or enable Azure AD auto-provision)
- [ ] Verify roles: administrator, psp_support, psp_partner
- [ ] Test permissions:
  - Support can view all partners ✓
  - Support can edit lock info ✓
  - Partners can only view own company ✓

#### WordPress Pages (8 required)
- [ ] **Home** → Shortcode: `[poolsafe_portal]`
- [ ] **Login/Logout** → Shortcode: `[poolsafe_login]`
- [ ] **Tickets** → Shortcode: `[poolsafe_tickets]`
- [ ] **Service History** → Shortcode: `[poolsafe_service_records]`
- [ ] **Admin Tools** → Shortcode: `[poolsafe_support_tools]` (support only)
- [ ] **Partners** → Shortcode: `[poolsafe_partners]` (support only)
- [ ] **User Management** → Shortcode: `[poolsafe_user_management]` (support only)
- [ ] **Training Videos** → Shortcode: `[poolsafe_kb category="training"]`

Verify each page:
- [ ] Page exists and is published
- [ ] Shortcode renders correctly
- [ ] No PHP errors in debug log
- [ ] CSS/theme inheritance working

### 3. **Data Readiness**

#### Partner Companies
- [ ] Import existing partners (CSV or Excel bulk import)
  - Template: 19 columns (company_name, email, phone, management_company, units, lock_make, etc.)
  - Test import: Upload sample CSV → verify partner created
- [ ] Verify email domains saved (for email-to-ticket auto-matching)
- [ ] Check partner email addresses are correct
- [ ] Verify geocoding (lat/lng) populated for map

#### Users & Login Credentials
- [ ] Create partner login accounts (Quick Create or bulk import)
- [ ] Test partner login:
  - Go to login page
  - Enter partner credentials
  - Verify redirects to dashboard
  - Check welcome banner shows: Company / Management Company / X Units
- [ ] Send password reset emails to partners
- [ ] Verify partner can change password

#### Support Staff Accounts
- [ ] Create support users (or Azure AD auto-provision)
- [ ] Test support login (Azure AD SSO or WordPress login)
- [ ] Verify support dashboard access
- [ ] Test support tools: bulk import, quick create, lock info edit

### 4. **Feature Testing**

#### Ticket System
- [ ] **Partner creates ticket**:
  - Login as partner
  - Go to Tickets page
  - Create new ticket
  - **VERIFY: partner_id auto-populated from logged-in user** ✓
  - **VERIFY: source = "portal"** ✓
  - **VERIFY: thread_id generated** ✓
- [ ] **Support responds via portal**:
  - Login as support
  - View ticket
  - Add comment
  - **VERIFY: response_count incremented** ✓
  - **VERIFY: last_response_via = "portal"** ✓
- [ ] **Support responds via Outlook**:
  - Reply to ticket notification email
  - **VERIFY: Comment added to ticket** ✓
  - **VERIFY: last_response_via = "outlook"** ✓
- [ ] **Email-to-ticket (inbound)**:
  - Send email to support address
  - **VERIFY: Ticket created** ✓
  - **VERIFY: Partner matched by email domain** ✓
  - If unmatched:
    - Check Tickets → Pending Emails
    - Manually link to partner
    - **VERIFY: Domain saved for future** ✓

#### Bulk Import (CSV & Excel)
- [ ] Prepare test file (5-10 companies)
- [ ] Upload CSV: Verify import succeeds
- [ ] Upload Excel (.xlsx): Verify import succeeds
- [ ] Check:
  - Partners created ✓
  - User accounts created (if user_login/user_pass provided) ✓
  - Lock info saved ✓
  - Phone/email/management company populated ✓

#### Quick Create (Company + User)
- [ ] Go to Admin Tools
- [ ] Click "Quick Create Company & User"
- [ ] Fill form:
  - Company name
  - Email
  - Phone
  - Username
  - Password
- [ ] Submit
- [ ] **VERIFY: Partner created** ✓
- [ ] **VERIFY: User account created and linked** ✓
- [ ] Test login with new credentials ✓

#### Service Records & History
- [ ] Create test service record
- [ ] View partner profile
- [ ] **VERIFY: Full ticket history (no 10-item limit)** ✓
- [ ] **VERIFY: Full service history (no pagination)** ✓

#### Map Visibility
- [ ] Login as partner
- [ ] **VERIFY: Map NOT visible** ✓
- [ ] Login as support
- [ ] **VERIFY: Map visible with all partners** ✓

#### Color Palette & Theme
- [ ] Edit partner → Top Colour
- [ ] **VERIFY: Dropdown shows: Ice Blue, Classic Blue, Ducati Red, Yellow, Custom** ✓
- [ ] Select color → save
- [ ] View partner portal
- [ ] **VERIFY: Theme color applied** ✓
- [ ] **VERIFY: Buttons/fonts follow theme** ✓

### 5. **Email Notifications**

#### Outbound Emails
- [ ] SMTP configured in WordPress (WP Mail SMTP plugin or SMTP settings)
- [ ] Test email: Pool Safe → Email Test → Send Test Email
- [ ] Verify email received
- [ ] Check sender address/name correct
- [ ] Verify email not in spam

#### Notification Triggers
- [ ] New ticket created → Partner receives email ✓
- [ ] Ticket status changed → Partner receives email ✓
- [ ] Support responds → Partner receives email ✓
- [ ] Partner responds → Support receives email ✓

Subject line format should include:
```
[Ticket #123] Ticket subject here
```

Message-ID should include thread_id:
```
<ticket-123-abc12345@yoursite.com>
```

### 6. **Security & Performance**

#### Security
- [ ] Force HTTPS (SSL certificate installed)
- [ ] Disable WordPress XML-RPC (Security → Settings)
- [ ] Hide WordPress version
- [ ] Limit login attempts (plugin or WAF)
- [ ] Strong passwords enforced
- [ ] Webhook tokens never committed to Git
- [ ] `wp-config.php` not publicly accessible
- [ ] Database backups enabled (daily)

#### Performance
- [ ] Install caching plugin (WP Super Cache, W3 Total Cache, or LiteSpeed)
- [ ] Enable object caching (Redis or Memcached)
- [ ] Optimize images (Smush, ShortPixel, or EWWW)
- [ ] Minify CSS/JS (Autoptimize or WP Rocket)
- [ ] CDN configured (Cloudflare recommended)
- [ ] Test page load speed: <3 seconds
- [ ] Run Lighthouse audit: Score >80

#### Monitoring
- [ ] Enable WordPress debug log (disable on production after testing)
- [ ] Set up error monitoring (Sentry, Rollbar, or New Relic)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up email alerts for:
  - Plugin errors
  - Failed logins
  - Email delivery failures
  - HubSpot sync errors

### 7. **Documentation & Training**

#### For Support Team
- [ ] Email-to-ticket setup guide (EMAIL-TO-TICKET-SETUP.md)
- [ ] Azure AD SSO guide (AZURE-AD-SETUP.md)
- [ ] HubSpot integration guide (HUBSPOT-SETUP.md)
- [ ] Bulk import template & instructions
- [ ] Quick Create walkthrough
- [ ] Pending emails linking procedure
- [ ] How to respond to tickets (portal vs. Outlook)

#### For Partners
- [ ] Login credentials email template
- [ ] How to create a ticket
- [ ] How to view service history
- [ ] How to update contact info
- [ ] FAQs

### 8. **Final Pre-Live Tests**

#### End-to-End Partner Flow
1. [ ] Partner receives login credentials email
2. [ ] Partner logs in successfully
3. [ ] Partner sees welcome banner (Company / Management / Units)
4. [ ] Partner creates ticket with correct company auto-filled
5. [ ] Partner receives ticket confirmation email
6. [ ] Partner views service history (full list)
7. [ ] Partner logs out

#### End-to-End Support Flow
1. [ ] Support logs in via Azure AD (Outlook)
2. [ ] Support sees dashboard with all partners
3. [ ] Support views map with partner locations
4. [ ] Support creates company via Quick Create
5. [ ] Support imports 5 companies via CSV
6. [ ] Support edits lock info for partner
7. [ ] Support responds to ticket via portal
8. [ ] Support responds to ticket via Outlook email
9. [ ] Support links pending email to partner
10. [ ] Support verifies HubSpot sync (checks HubSpot CRM)

#### Email Flow
1. [ ] Customer sends email to support address
2. [ ] Email-to-ticket creates ticket (auto-matches domain)
3. [ ] Partner receives notification
4. [ ] Support responds via Outlook
5. [ ] Response tracked in portal (comment added)
6. [ ] Partner replies via portal
7. [ ] Support receives notification
8. [ ] Thread continuity maintained (all responses in one ticket)

### 9. **Go-Live Procedure**

1. [ ] **Backup everything**:
   - Database export
   - Full file backup (plugins, themes, uploads)
   - Store backup offsite

2. [ ] **Final sync**:
   - Run HubSpot full sync
   - Verify all partners in CRM
   - Check for sync errors

3. [ ] **DNS & Domain**:
   - Update DNS if needed (propagation: 24-48h)
   - Verify SSL certificate valid
   - Test HTTPS redirect

4. [ ] **Disable maintenance mode** (if enabled)

5. [ ] **Send go-live announcement**:
   - To support team (with login links)
   - To partners (with credentials & getting started guide)

6. [ ] **Monitor for 24 hours**:
   - Check error logs every 2 hours
   - Verify email delivery
   - Monitor HubSpot sync
   - Test ticket creation
   - Respond to support requests immediately

### 10. **Post-Live (First Week)**

- [ ] **Day 1**: Monitor error logs, verify email notifications working
- [ ] **Day 2**: Check HubSpot sync completed, respond to user questions
- [ ] **Day 3**: Review email-to-ticket auto-matching accuracy
- [ ] **Day 4**: Audit pending emails, link any unmatched
- [ ] **Day 7**: Full system health check:
  - API health: `/wp-json/poolsafe/v1/health`
  - Database queries performance
  - Email delivery rate
  - HubSpot sync status
  - User login success rate
  - Ticket response time (SLA tracking)

---

## Recommended Improvements Before Go-Live

### High Priority (Implement Today)
1. ✅ **Email response tracking** - Support Outlook replies tracked (IMPLEMENTED)
2. ✅ **Auto partner detection** - Tickets auto-link to company from login (IMPLEMENTED)
3. ✅ **Thread continuity** - Email thread_id for conversation tracking (IMPLEMENTED)
4. [ ] **Email template branding** - Add company logo to notification emails
5. [ ] **Password reset flow** - Partner self-service password reset page
6. [ ] **Mobile responsive check** - Test all pages on mobile/tablet
7. [ ] **Browser compatibility** - Test on Chrome, Firefox, Safari, Edge

### Medium Priority (This Week)
1. [ ] **SLA tracking** - Auto-escalate tickets if no response in 24h
2. [ ] **Canned responses** - Quick replies for common support questions
3. [ ] **File attachments** - Allow partners to attach images to tickets
4. [ ] **Push notifications** - Browser push for new ticket responses (PWA)
5. [ ] **Analytics dashboard** - Support staff see ticket volume, response time
6. [ ] **Email signature** - Standardize support email signatures with portal link

### Low Priority (Future Enhancements)
1. [ ] **Live chat widget** - Real-time chat for urgent issues
2. [ ] **Knowledge base search** - AI-powered article search
3. [ ] **Multi-language support** - Spanish, French translations
4. [ ] **Mobile app** - Native iOS/Android apps
5. [ ] **Voice/video calls** - Integrated Zoom/Teams calls from tickets
6. [ ] **Satisfaction surveys** - CSAT rating after ticket resolution

---

## Emergency Contacts

**Technical Issues:**
- WordPress/Plugin: [Your support email]
- Hosting: [HostPapa support]
- Email provider: [SendGrid/Mailgun support]
- Azure AD: [Microsoft support]

**Rollback Plan:**
1. Disable plugin (Plugins → Deactivate)
2. Restore database from backup
3. Restore files from backup
4. Clear cache (hosting + WordPress + browser)
5. Test basic WordPress functionality
6. Contact support with error logs

---

**Last Updated:** v1.3.1  
**Go-Live Target:** Today  
**Status:** ✅ Ready for production
