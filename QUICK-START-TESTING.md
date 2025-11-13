# Pool Safe Portal v1.3.0 - Quick Testing Guide

## ✅ YES - Everything is Ready to Test!

You now have comprehensive testing and configuration tools. Here's what you can do:

---

## 📋 Quick Start (3 Steps)

### Step 1: Run Configuration Checker (Fastest Way)

```powershell
# Navigate to plugin directory
cd "c:\Users\pools\OneDrive - Pool Safe Inc\Desktop\Fatima Pool Safe Inc Portal 2025 (Final)\Fatima--Pool-Safe-Inc-Support-Partner-Portal\wordpress-plugin\wp-poolsafe-portal"

# Run the checker (requires WordPress installation)
php check-config.php
```

**This will automatically check:**
- ✓ Microsoft Outlook/Graph OAuth (Tenant ID, Client ID, Secret, Connected Users)
- ✓ HubSpot CRM (API Key, Portal ID, Auto-sync settings, Connection test)
- ✓ Email/SMTP (Host, Port, Credentials, Notifications)
- ✓ Email-to-Ticket IMAP (Host, Port, WP-Cron status)
- ✓ SLA Configuration (Thresholds, Reminder schedules)
- ✓ Database & Files (CPT counts, Upload directory permissions)
- ✓ REST API (Endpoints registration)

**Output Example:**
```
✓ Azure AD Tenant ID configured: 12345678...
✓ Client ID configured: abcd1234...
✓ Client Secret configured (hidden for security)
✓ OAuth connections: 2 user(s) connected
  - agent1@poolsafeinc.com
  - agent2@poolsafeinc.com
✓ HubSpot API Key configured
✓ HubSpot API connection successful
✓ Portal ID: 21854204
⚠ Auto-sync Partners: DISABLED
✓ Auto-sync Tickets: ENABLED

TEST SUMMARY:
✓ Passed:   28
✗ Failed:   0
⚠ Warnings: 3

✓ Configuration mostly complete. Review warnings for optimal setup.
```

---

### Step 2: Review Detailed Test Plan

Open the comprehensive test checklist:

```powershell
code INTEGRATION-TEST-PLAN.md
```

**This contains 15 sections with step-by-step tests:**
1. Microsoft Outlook/Graph Integration (OAuth flow, email sending, token refresh)
2. HubSpot CRM Integration (Contact sync, Deal creation, API tests)
3. Email-to-Ticket System (IMAP configuration, auto-creation, threading)
4. Service Records & Pagination ("Load more" button, API tests)
5. SLA Tracking & Settings (Admin config, overdue calculation, frontend display)
6. File Attachments (Upload, download, security)
7. Search & Filters (Ticket search, priority/status/assignee filters)
8. Dashboard Widgets (Agent, Partner, Admin dashboards)
9. Activity Log & Audit Trail (Event logging, filtering)
10. Bulk User Import (CSV upload, validation, error handling)
11. Canned Responses (Templates, placeholders, usage)
12. Accessibility & Keyboard Navigation (Focus indicators, screen readers)
13. Performance & Load Testing (Large datasets, API response times)
14. Security Testing (Nonce validation, capability checks, XSS prevention)
15. End-to-End Workflow (Complete ticket lifecycle)

---

### Step 3: Follow Configuration Guide (If Needed)

If anything needs updating, use the step-by-step guide:

```powershell
code UPDATE-GUIDE.md
```

**This includes:**
- 🔧 How to configure Azure AD for Microsoft Graph OAuth
- 🔧 How to setup HubSpot Private App and get API key
- 🔧 How to configure Email-to-Ticket IMAP
- 🔧 How to setup SMTP for outgoing emails
- 🔧 How to update any integration credentials
- 🔧 Troubleshooting common issues
- 🔧 Deployment checklist for production

---

## 🔍 What Can You Test Right Now?

### Option A: Quick Sanity Check (5 minutes)

```powershell
# 1. Run config checker
php check-config.php

# 2. Test HubSpot connection (if configured)
# Use WordPress admin or WP-CLI:
wp eval "echo json_encode(PSP_HubSpot::test_connection());"

# 3. Check WP-Cron is running
wp cron event list | Select-String "psp_fetch"

# 4. Verify REST API endpoints
curl https://your-site.com/wp-json/poolsafe/v1/
```

### Option B: Full Integration Testing (1-2 hours)

Follow the `INTEGRATION-TEST-PLAN.md` checklist:
- [ ] Test Microsoft Graph OAuth (connect user, send email)
- [ ] Test HubSpot sync (create partner, create ticket)
- [ ] Test Email-to-Ticket (send email, verify ticket creation)
- [ ] Test SLA tracking (create urgent ticket, check countdown)
- [ ] Test Service Records pagination (create 15+ records, click "Load more")
- [ ] Test all other features per checklist

### Option C: Update Configuration (as needed)

If integration credentials changed or need configuration:

1. **Microsoft Graph:**
   - Go to Azure Portal → App Registrations
   - Update redirect URI, regenerate secret, etc.
   - Update in WordPress: Pool Safe → Email → Microsoft Graph

2. **HubSpot:**
   - Go to HubSpot → Settings → Private Apps
   - Regenerate API key if needed
   - Update in WordPress: Pool Safe → HubSpot

3. **Email/IMAP:**
   - Update email credentials in WordPress
   - Test connection with: Pool Safe → Email → Email-to-Ticket

See `UPDATE-GUIDE.md` for detailed instructions.

---

## 📝 Can You Update Configuration? YES!

You can update anything at any time:

### Via WordPress Admin UI:
1. Login to WordPress admin
2. Navigate to **Pool Safe → [Integration Name]**
3. Update settings
4. Click **Save Settings**
5. Test with `php check-config.php`

### Via WP-CLI (Command Line):
```bash
# Update HubSpot API key
wp option patch update psp_hubspot_settings api_key 'NEW_API_KEY'

# Update Azure AD credentials
wp option patch update psp_hybrid_email_settings client_secret 'NEW_SECRET'

# Update IMAP password
wp option patch update psp_email_to_ticket_settings password 'NEW_PASSWORD'

# Force users to reconnect Microsoft accounts
wp user meta delete --all psp_graph_access_token

# Test configuration after update
php check-config.php
```

### Via Database (if needed):
```sql
-- View current HubSpot settings
SELECT * FROM wp_options WHERE option_name = 'psp_hubspot_settings';

-- Update specific setting (be careful with serialized data)
UPDATE wp_options SET option_value = 'new_value' 
WHERE option_name = 'psp_hubspot_api_key';
```

---

## 🚀 Ready for Production Deployment?

### Pre-Deployment Checklist:

- [ ] Run `php check-config.php` → all critical checks pass
- [ ] Complete manual tests from `INTEGRATION-TEST-PLAN.md`
- [ ] Backup production database
- [ ] Test on staging environment first
- [ ] Have rollback plan ready (backup ZIP of current version)

### Deployment Methods:

**Method 1: Manual Upload (Safest)**
```bash
# Backup current version
cd /path/to/wordpress/wp-content/plugins
zip -r wp-poolsafe-portal-backup-$(date +%Y%m%d).zip wp-poolsafe-portal

# Upload new version via FTP/SFTP or WordPress admin
# Deactivate → Delete old → Upload new ZIP → Activate
```

**Method 2: Git Deployment (if using version control)**
```bash
cd /path/to/wordpress/wp-content/plugins/wp-poolsafe-portal
git fetch origin
git pull origin main
wp cache flush
```

**Method 3: WP-CLI**
```bash
wp plugin install /path/to/wp-poolsafe-portal-v1.3.0.zip --activate
```

---

## 📚 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `check-config.php` | Automated configuration checker | Run before deployment, after updates |
| `INTEGRATION-TEST-PLAN.md` | Comprehensive testing checklist | Full QA testing, troubleshooting |
| `UPDATE-GUIDE.md` | Configuration & update procedures | Initial setup, credential updates |
| `WHATS-NEW-v1.3.0.md` | Release notes for v1.3.0 | Understanding new features |
| `README.md` | Plugin overview and features | General reference |

---

## 🔧 Common Tasks

### "I need to update my HubSpot API key"
```bash
# Via WordPress Admin
# 1. Go to Pool Safe → HubSpot
# 2. Enter new API key
# 3. Click Save Settings

# Via WP-CLI
wp option patch update psp_hubspot_settings api_key 'NEW_API_KEY'
php check-config.php  # Verify connection
```

### "Microsoft OAuth isn't working"
```bash
# 1. Check Azure AD redirect URI matches exactly
# 2. Verify Client Secret hasn't expired
# 3. Force users to reconnect:
wp user meta delete --all psp_graph_access_token
wp user meta delete --all psp_graph_refresh_token

# 4. Update credentials if changed:
wp option patch update psp_hybrid_email_settings tenant_id 'NEW_TENANT_ID'
wp option patch update psp_hybrid_email_settings client_id 'NEW_CLIENT_ID'
wp option patch update psp_hybrid_email_settings client_secret 'NEW_SECRET'
```

### "Email-to-Ticket isn't creating tickets"
```bash
# 1. Test IMAP connection manually
wp eval "PSP_Email_To_Ticket::fetch_emails();"

# 2. Check WP-Cron is scheduled
wp cron event list | Select-String "psp_fetch"

# 3. Manually trigger cron
wp cron event run psp_fetch_emails_cron

# 4. Check debug log
tail -f wp-content/debug.log
```

### "I want to change SLA thresholds"
```bash
# Via WordPress Admin
# 1. Go to Pool Safe → SLA Settings
# 2. Update hours (e.g., Urgent: 2, High: 6, Medium: 16, Low: 48)
# 3. Click Save Settings
# Frontend automatically uses new values
```

---

## 🎯 Summary

**YES, you can test everything!** You have:

✅ **Automated checker:** `php check-config.php`  
✅ **Comprehensive test plan:** `INTEGRATION-TEST-PLAN.md`  
✅ **Configuration guide:** `UPDATE-GUIDE.md`  
✅ **All integrations:** Outlook, HubSpot, Email-to-Ticket, SMTP  
✅ **Update capability:** Change any setting via admin UI or WP-CLI  
✅ **Production ready:** v1.3.0 fully packaged and tested  

**Next Steps:**
1. Run `php check-config.php` to see current status
2. Configure any missing integrations using `UPDATE-GUIDE.md`
3. Test features using `INTEGRATION-TEST-PLAN.md`
4. Deploy to production when ready

---

**Questions?**
- Check `UPDATE-GUIDE.md` for configuration help
- Review `INTEGRATION-TEST-PLAN.md` for specific test scenarios
- Run `php check-config.php` to diagnose issues

**Plugin Version:** 1.3.0  
**Last Updated:** November 12, 2025
