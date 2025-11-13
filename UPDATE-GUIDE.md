# Pool Safe Portal - Update & Configuration Guide

## Quick Start: Testing Everything

### Step 1: Run Configuration Checker

```bash
# Navigate to plugin directory
cd wordpress-plugin/wp-poolsafe-portal

# Run configuration checker (requires WordPress installation)
php check-config.php
```

This will verify:
- ✓ Microsoft Graph OAuth settings
- ✓ HubSpot API configuration
- ✓ Email/SMTP settings
- ✓ Email-to-Ticket IMAP setup
- ✓ SLA thresholds
- ✓ Database and file permissions
- ✓ REST API endpoints

---

## Step 2: Configure Integrations

### A. Microsoft Outlook (Graph API)

#### 1. Azure AD App Setup
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory → App Registrations**
3. Click **New registration**
4. Enter:
   - **Name:** Pool Safe Portal
   - **Redirect URI:** `https://your-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback`
5. Click **Register**

#### 2. Configure API Permissions
1. Go to **API Permissions**
2. Click **Add a permission → Microsoft Graph → Delegated permissions**
3. Add these permissions:
   - `Mail.Send`
   - `offline_access`
4. Click **Grant admin consent** (requires admin)

#### 3. Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Enter description: "Pool Safe Portal Secret"
4. Set expiration: 24 months (or Never)
5. **Copy the secret value immediately** (it won't show again)

#### 4. Get Tenant ID and Client ID
1. Go to **Overview** tab
2. Copy **Application (client) ID**
3. Copy **Directory (tenant) ID**

#### 5. Configure in WordPress
1. Login to WordPress admin
2. Go to **Pool Safe → Email → Microsoft Graph**
3. Enter:
   - **Tenant ID:** `[your-tenant-id]`
   - **Client ID:** `[your-client-id]`
   - **Client Secret:** `[your-client-secret]`
4. Click **Save Changes**

#### 6. Connect User Accounts
1. Each support agent goes to **Users → Profile**
2. Scroll to **Microsoft Email** section
3. Click **"Connect Microsoft"**
4. Login with their Outlook account (e.g., `agent@poolsafeinc.com`)
5. Grant permissions
6. Verify connection shows as active

**Test:** Create ticket reply → should send from agent's Outlook address

---

### B. HubSpot CRM Integration

#### 1. Create Private App in HubSpot
1. Go to [HubSpot Settings](https://app.hubspot.com/settings)
2. Navigate to **Integrations → Private Apps**
3. Click **Create a private app**
4. Enter:
   - **Name:** Pool Safe Portal
   - **Description:** WordPress integration for partners and tickets

#### 2. Configure Scopes
Under **Scopes** tab, enable:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.deals.read`
- `crm.objects.deals.write`
- `crm.objects.companies.read` (optional)

#### 3. Generate API Token
1. Click **Show token**
2. **Copy the token** (starts with `pat-...`)
3. Store securely

#### 4. Get Portal ID
1. Go to HubSpot **Settings**
2. Navigate to **Account Defaults**
3. Copy **Hub ID** (e.g., `21854204`)

#### 5. Configure in WordPress
1. Go to **Pool Safe → HubSpot**
2. Enter:
   - **API Key:** `[your-private-app-token]`
   - **Portal ID:** `[your-hub-id]`
3. Enable checkboxes:
   - ☑ **Auto-sync Partners** (creates/updates HubSpot contacts)
   - ☑ **Auto-sync Tickets** (creates HubSpot deals)
4. Click **Save Settings**

#### 6. Test Connection
```bash
# Using WP-CLI
wp eval "echo json_encode(PSP_HubSpot::test_connection());"
```

Or use REST API:
```bash
curl https://your-site.com/wp-json/poolsafe/v1/hubspot/test-connection
```

**Test:** Create new partner → should appear in HubSpot Contacts within 30 seconds

---

### C. Email-to-Ticket (IMAP)

#### 1. Setup Dedicated Email Inbox
Create dedicated mailbox: `support@poolsafeinc.com`

For **Microsoft 365/Outlook:**
1. Go to [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Create shared mailbox: `support@poolsafeinc.com`
3. Grant access to admin/service account

#### 2. Generate App Password (if using 2FA)
For Outlook.com / Microsoft 365:
1. Go to [Security Settings](https://account.microsoft.com/security)
2. Navigate to **Advanced security options**
3. Under **App passwords**, click **Create new app password**
4. Copy the generated password

For Gmail:
1. Enable 2-Step Verification
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate password for "Mail"

#### 3. Configure in WordPress
1. Go to **Pool Safe → Email → Email-to-Ticket**
2. Enter:
   - **IMAP Host:** `outlook.office365.com` (or `imap.gmail.com`)
   - **IMAP Port:** `993` (SSL) or `143` (TLS)
   - **Email Address:** `support@poolsafeinc.com`
   - **Password:** `[app-password]`
   - **Encryption:** SSL
3. Enable:
   - ☑ **Enable Email-to-Ticket**
   - ☑ **Auto-create Tickets from Emails**
4. Click **Save Settings**

#### 4. Test IMAP Connection
```bash
# Manual test using WP-CLI
wp eval "PSP_Email_To_Ticket::fetch_emails();"
```

#### 5. Setup WP-Cron
Verify cron is running:
```bash
wp cron event list
# Look for: psp_fetch_emails_cron

# Manually trigger for testing
wp cron event run psp_fetch_emails_cron
```

If cron isn't working, add to server crontab:
```bash
*/5 * * * * php /path/to/wordpress/wp-cron.php > /dev/null 2>&1
```

**Test:** Send email to `support@poolsafeinc.com` → check Tickets within 5 minutes

---

### D. SMTP Configuration (Optional)

For sending emails via SMTP instead of PHP mail():

#### 1. Choose SMTP Provider
- **Microsoft 365:** `smtp.office365.com:587` (TLS)
- **Gmail:** `smtp.gmail.com:587` (TLS)
- **SendGrid:** `smtp.sendgrid.net:587` (API key as password)
- **Mailgun:** `smtp.mailgun.org:587`

#### 2. Configure in WordPress
1. Go to **Pool Safe → Email**
2. Enable: ☑ **Enable SMTP**
3. Enter:
   - **SMTP Host:** `smtp.office365.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** `noreply@poolsafeinc.com`
   - **SMTP Password:** `[password or app password]`
   - **From Email:** `noreply@poolsafeinc.com`
   - **From Name:** `Pool Safe Support`
4. Save Settings

#### 3. Send Test Email
```bash
wp eval "wp_mail('test@example.com', 'Test', 'SMTP test email');"
```

---

## Step 3: Verify All Features

### Run Complete Test Suite

Use the checklist in `INTEGRATION-TEST-PLAN.md`:

```bash
# Open test plan
code INTEGRATION-TEST-PLAN.md
```

### Critical Tests to Perform

1. **Microsoft Graph OAuth:**
   - ✓ Connect user account
   - ✓ Send ticket reply via Outlook
   - ✓ Verify email received

2. **HubSpot Sync:**
   - ✓ Create partner → check HubSpot Contacts
   - ✓ Create ticket → check HubSpot Deals
   - ✓ Update partner → verify sync

3. **Email-to-Ticket:**
   - ✓ Send email to support inbox
   - ✓ Verify ticket auto-created
   - ✓ Reply to ticket via email
   - ✓ Check threading works

4. **SLA Tracking:**
   - ✓ Create urgent ticket
   - ✓ Verify countdown timer
   - ✓ Check overdue notifications

5. **Service Records Pagination:**
   - ✓ Create 15+ service records
   - ✓ Check "Load more" button works
   - ✓ Verify no duplicates

---

## Step 4: Update Configuration (If Needed)

### Updating Azure AD Settings

**Scenario:** Client secret expired or wrong tenant

```php
// Via WP-CLI
wp option patch update psp_hybrid_email_settings tenant_id 'new-tenant-id'
wp option patch update psp_hybrid_email_settings client_id 'new-client-id'
wp option patch update psp_hybrid_email_settings client_secret 'new-client-secret'

// Disconnect all users (forces re-authentication)
wp user meta delete $(wp user list --role=psp_support --field=ID) psp_graph_access_token
wp user meta delete $(wp user list --role=psp_support --field=ID) psp_graph_refresh_token
```

### Updating HubSpot API Key

**Scenario:** API key regenerated or different portal

```php
wp option patch update psp_hubspot_settings api_key 'new-api-key'
wp option patch update psp_hubspot_settings portal_id 'new-portal-id'

// Test connection after update
wp eval "var_dump(PSP_HubSpot::test_connection());"
```

### Updating Email/IMAP Settings

**Scenario:** Changed support email or password

1. Go to **Pool Safe → Email → Email-to-Ticket**
2. Update credentials
3. Click **Test Connection** button
4. Manually trigger: `wp cron event run psp_fetch_emails_cron`

### Updating SLA Thresholds

**Scenario:** Business requirements changed

1. Go to **Pool Safe → SLA Settings**
2. Update hours:
   - Urgent: 2 hours (was 4)
   - High: 6 hours (was 8)
   - Medium: 16 hours (was 24)
   - Low: 48 hours (was 72)
3. Save Settings
4. Frontend automatically uses new thresholds (via `PSP_PORTAL.sla`)

---

## Step 5: Troubleshooting Common Issues

### Issue: OAuth Redirect Fails

**Symptoms:** After clicking "Connect Microsoft", get error or blank page

**Solutions:**
1. Verify redirect URI matches exactly in Azure AD:
   ```
   https://your-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback
   ```
2. Check for trailing slashes or www vs non-www
3. Ensure HTTPS is enabled (OAuth requires SSL)
4. Clear browser cache and cookies

### Issue: HubSpot Sync Returns 401

**Symptoms:** `Unauthorized` error when syncing partners/tickets

**Solutions:**
1. Regenerate API key in HubSpot (Settings → Integrations → Private Apps)
2. Verify scopes include `crm.objects.contacts.write` and `crm.objects.deals.write`
3. Check API key wasn't revoked or expired
4. Test with curl:
   ```bash
   curl -H "Authorization: Bearer your-api-key" \
        https://api.hubapi.com/crm/v3/objects/contacts?limit=1
   ```

### Issue: Email-to-Ticket Not Creating Tickets

**Symptoms:** Emails sent to support inbox, but no tickets appear

**Solutions:**
1. Check WP-Cron is running:
   ```bash
   wp cron event list | grep psp_fetch_emails
   ```
2. Manually trigger fetch:
   ```bash
   wp cron event run psp_fetch_emails_cron
   ```
3. Enable debug logging:
   ```php
   // In wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   
   // Check wp-content/debug.log for IMAP errors
   ```
4. Test IMAP credentials with email client (Thunderbird, Outlook)
5. Check firewall isn't blocking port 993/143

### Issue: SMTP Emails Not Sending

**Symptoms:** Ticket notifications not received

**Solutions:**
1. Send test email via WP-CLI:
   ```bash
   wp eval "var_dump(wp_mail('test@example.com', 'Test', 'Test message'));"
   ```
2. Check SMTP credentials are correct
3. Verify port 587 is open (telnet test):
   ```bash
   telnet smtp.office365.com 587
   ```
4. For Gmail, ensure "Less secure app access" is enabled or use App Password
5. Check spam folder for test emails

### Issue: SLA Countdown Not Updating

**Symptoms:** Frontend shows wrong time remaining

**Solutions:**
1. Clear browser cache (Ctrl+Shift+R)
2. Verify `PSP_PORTAL.sla` is defined:
   ```javascript
   // In browser console
   console.log(PSP_PORTAL.sla);
   ```
3. Check SLA settings saved correctly:
   ```bash
   wp option get psp_sla_urgent
   wp option get psp_sla_high
   ```
4. Verify JavaScript isn't blocked by ad blocker

### Issue: Service Records Pagination Broken

**Symptoms:** "Load more" button doesn't work or shows duplicates

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify REST API endpoint works:
   ```bash
   curl https://your-site.com/wp-json/poolsafe/v1/service-records?partner_id=1&page=2&per_page=10
   ```
3. Check `data-partner-id` attribute exists on service records container
4. Clear site cache (if using caching plugin)

---

## Step 6: Deploy Updates to Production

### Before Deployment Checklist

- [ ] Run `php check-config.php` - all checks pass
- [ ] Complete manual tests from `INTEGRATION-TEST-PLAN.md`
- [ ] Backup production database
- [ ] Test on staging environment first
- [ ] Notify users of scheduled maintenance (if needed)

### Deployment Process

#### Option A: Manual Upload (Recommended for First Time)

1. **Backup current version:**
   ```bash
   # On production server
   cd /path/to/wordpress/wp-content/plugins
   zip -r wp-poolsafe-portal-backup-$(date +%Y%m%d).zip wp-poolsafe-portal
   ```

2. **Upload new version:**
   - Deactivate current plugin in WordPress admin
   - Delete old `wp-poolsafe-portal` folder via FTP/SSH
   - Upload `wp-poolsafe-portal-v1.3.0.zip`
   - Extract ZIP
   - Activate plugin

3. **Verify activation:**
   - Check **Plugins** page for errors
   - Visit **Pool Safe → Settings**
   - Confirm version shows 1.3.0

#### Option B: Git Deployment

```bash
# On production server
cd /path/to/wordpress/wp-content/plugins/wp-poolsafe-portal
git fetch origin
git checkout main
git pull origin main

# Clear cache if using object cache
wp cache flush
```

#### Option C: WP-CLI Install

```bash
# From ZIP file
wp plugin install /path/to/wp-poolsafe-portal-v1.3.0.zip --activate

# Or from GitHub
wp plugin install https://github.com/faith233525/Wordpress-Pluggin/archive/refs/heads/main.zip --activate
```

### Post-Deployment Verification

1. **Run configuration checker:**
   ```bash
   cd wp-content/plugins/wp-poolsafe-portal
   php check-config.php
   ```

2. **Test critical paths:**
   - Login as partner → create ticket
   - Login as agent → reply to ticket
   - Check email notification received
   - Verify HubSpot sync (check Contacts/Deals)

3. **Monitor error logs:**
   ```bash
   tail -f wp-content/debug.log
   ```

4. **Check WP-Cron:**
   ```bash
   wp cron event list
   # Verify psp_fetch_emails_cron is scheduled
   ```

---

## Step 7: Reconfigure After Updates

### Updating Integration Credentials

If you need to change any integration settings after deployment:

#### Microsoft Graph (Outlook)

```bash
# Update settings
wp option patch update psp_hybrid_email_settings tenant_id 'NEW_TENANT_ID'
wp option patch update psp_hybrid_email_settings client_id 'NEW_CLIENT_ID'
wp option patch update psp_hybrid_email_settings client_secret 'NEW_CLIENT_SECRET'

# Force users to reconnect (clears tokens)
wp user meta delete --all psp_graph_access_token
wp user meta delete --all psp_graph_refresh_token
wp user meta delete --all psp_graph_expires_at
```

#### HubSpot CRM

```bash
# Update API key
wp option patch update psp_hubspot_settings api_key 'NEW_API_KEY'

# Toggle auto-sync
wp option patch update psp_hubspot_settings auto_sync_partners 1
wp option patch update psp_hubspot_settings auto_sync_tickets 1

# Test connection
wp eval "echo json_encode(PSP_HubSpot::test_connection(), JSON_PRETTY_PRINT);"
```

#### Email-to-Ticket (IMAP)

```bash
# Update IMAP settings
wp option patch update psp_email_to_ticket_settings imap_host 'outlook.office365.com'
wp option patch update psp_email_to_ticket_settings imap_port '993'
wp option patch update psp_email_to_ticket_settings email 'support@poolsafeinc.com'
wp option patch update psp_email_to_ticket_settings password 'NEW_PASSWORD'

# Test fetch manually
wp eval "PSP_Email_To_Ticket::fetch_emails();"
```

#### SMTP Settings

```bash
# Update SMTP config
wp option patch update psp_email_settings smtp_enabled 1
wp option patch update psp_email_settings smtp_host 'smtp.office365.com'
wp option patch update psp_email_settings smtp_port '587'
wp option patch update psp_email_settings smtp_user 'noreply@poolsafeinc.com'
wp option patch update psp_email_settings smtp_password 'NEW_PASSWORD'

# Send test email
wp eval "wp_mail('test@example.com', 'SMTP Test', 'Test after config update');"
```

---

## Quick Reference: WP-CLI Commands

### Check Configuration Status
```bash
# Run full configuration check
php wp-poolsafe-portal/check-config.php

# Check specific option
wp option get psp_hubspot_settings
wp option get psp_hybrid_email_settings
```

### Manage Integrations
```bash
# Test HubSpot connection
wp eval "var_dump(PSP_HubSpot::test_connection());"

# Manually sync partner to HubSpot
wp eval "PSP_HubSpot::sync_partner(123);"

# Fetch emails manually
wp eval "PSP_Email_To_Ticket::fetch_emails();"
```

### User Management
```bash
# List connected OAuth users
wp user list --meta_key=psp_graph_access_token --format=table

# Disconnect specific user from Microsoft
wp user meta delete 5 psp_graph_access_token
wp user meta delete 5 psp_graph_refresh_token
```

### WP-Cron Management
```bash
# List all cron jobs
wp cron event list

# Run email fetch cron manually
wp cron event run psp_fetch_emails_cron

# Schedule next run (if missing)
wp cron event schedule psp_fetch_emails_cron now 'every_5_minutes'
```

---

## Support & Documentation

- **Integration Test Plan:** `INTEGRATION-TEST-PLAN.md`
- **Configuration Checker:** `check-config.php`
- **Release Notes:** `WHATS-NEW-v1.3.0.md`
- **Main README:** `README.md`

For issues or questions:
1. Check `wp-content/debug.log` with WP_DEBUG enabled
2. Run `php check-config.php` to identify configuration problems
3. Review `INTEGRATION-TEST-PLAN.md` for specific test scenarios

---

**Last Updated:** November 12, 2025  
**Plugin Version:** 1.3.0  
**WordPress Requirement:** 6.0+  
**PHP Requirement:** 7.4+
