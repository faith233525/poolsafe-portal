# 🚀 Setup Wizard User Guide

## Overview
The PoolSafe Portal Setup Wizard makes it easy to configure your email, Azure AD/Outlook SSO, and HubSpot CRM integrations—all from a user-friendly admin interface. **No manual editing of `wp-config.php` required!**

## Accessing the Setup Wizard

### First-Time Activation
After activating the PoolSafe Portal plugin, you'll be automatically redirected to the setup wizard.

### Access Anytime
Go to **WordPress Admin** → **PoolSafe Setup** (in the main menu)

---

## Step-by-Step Configuration

### 📧 Tab 1: Email Configuration

#### 1. Generate Webhook Token
1. Click **"🔄 Generate New Token"** button
2. A secure random token will be generated automatically
3. Token is encrypted and stored in your WordPress database

#### 2. Copy Webhook URLs
Two webhook URLs are provided:
- **Email-to-Ticket Webhook:** Converts incoming emails to tickets
- **Response Tracking Webhook:** Tracks support replies from Outlook

Click **📋 Copy** button next to each URL.

#### 3. Configure Your Email Provider

**SendGrid:**
1. Go to SendGrid → Settings → Inbound Parse
2. Add both webhook URLs
3. Configure DNS MX record

**Mailgun:**
1. Go to Mailgun → Sending → Routes
2. Create route for each webhook URL
3. Set filter: `match_recipient("support@yourdomain.com")`

**Postmark:**
1. Go to Postmark → Servers → Inbound
2. Add webhook URLs
3. Configure inbound domain

#### 4. Save Settings
Click **💾 Save Settings** at the bottom

---

### 🔐 Tab 2: Azure AD / Outlook SSO

#### Prerequisites
You need to create an Azure AD app registration first:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**

#### Configuration Steps

**1. Enter Application Credentials:**
- **Client ID:** Found in Azure Portal → App registrations → Overview
- **Client Secret:** Created in Certificates & secrets → New client secret
- **Tenant ID:** Found in Azure Active Directory → Overview

**2. Copy Redirect URI:**
- Click **📋 Copy** button next to the auto-generated redirect URI
- Add this to your Azure AD app:
  - Azure Portal → App registrations → Authentication
  - Add redirect URI under "Web" platform

**3. Verify API Permissions:**
Ensure your Azure app has these Microsoft Graph permissions:
- ✓ User.Read
- ✓ email
- ✓ profile
- ✓ openid

Then click "Grant admin consent"

**4. Test Connection:**
- Click **🧪 Test Azure AD Connection**
- If successful, you'll see: ✅ "Azure AD tenant found! Configuration valid."
- If error, double-check Client ID and Tenant ID

**5. Save Settings**

---

### 📊 Tab 3: HubSpot CRM

#### Prerequisites
Create a HubSpot private app:
1. Go to [HubSpot](https://app.hubspot.com) → Settings
2. Navigate to Integrations → Private Apps
3. Click **Create a private app**

#### Configuration Steps

**1. Enter Credentials:**
- **Access Token:** Copy from your private app (starts with `pat-na1-`)
- **Portal ID:** Found in Settings → Account Setup → Account Defaults

**2. Verify Scopes:**
Ensure your private app has these scopes:
- ✓ crm.objects.companies.read/write
- ✓ crm.objects.contacts.read/write
- ✓ crm.objects.deals.read/write

**3. Configure Sync Options:**
- ☑ **Enable HubSpot Sync** (checkbox)
- **Sync Frequency:**
  - Real-time (recommended for live updates)
  - Hourly (scheduled batch sync)
  - Daily (off-peak sync)

**4. Test Connection:**
- Click **🧪 Test HubSpot Connection**
- If successful: ✅ "HubSpot connected successfully! (Portal ID: 12345678)"
- Portal ID will auto-fill if not already entered

**5. Save Settings**

---

### ✅ Tab 4: Summary

View configuration status at a glance:

**📧 Email Configuration**
- ✅ Token Generated (green) or ⚠️ Token Not Generated (yellow)

**🔐 Azure AD SSO**
- ✅ Configured (all fields filled) or ⚠️ Not Configured

**📊 HubSpot CRM**
- ✅ Configured (API key entered) or ⚠️ Not Configured

**Next Steps Checklist:**
1. Copy webhook URLs → add to email provider
2. Add redirect URI → Azure AD app
3. Test Azure AD login → support account
4. Test HubSpot connection → run initial sync
5. Import partners → CSV/Excel bulk import
6. Create support users
7. Test ticket creation → portal + email
8. Verify email response tracking

**Mark Setup as Complete:**
Click **✅ Mark Setup as Complete** when done. You can always reconfigure settings later.

---

## Settings Storage

### Where Are Settings Stored?
All settings are stored in the WordPress `wp_options` table with the prefix `psp_setting_*`:

```
psp_setting_email_token
psp_setting_azure_client_id
psp_setting_azure_client_secret (encrypted)
psp_setting_azure_tenant_id
psp_setting_hubspot_api_key (encrypted)
psp_setting_hubspot_portal_id
psp_setting_hubspot_sync_enabled
psp_setting_hubspot_sync_frequency
psp_setting_setup_completed
```

### Security - Encryption
Sensitive credentials are **automatically encrypted** using WordPress salts:
- ✓ Azure Client Secret
- ✓ HubSpot API Key  
- ✓ Email Webhook Token

Encryption uses AES-256-CBC with your site's unique auth salt.

### Backward Compatibility
The plugin still supports old configuration methods:
1. **Setup Wizard settings** (preferred - stored in database)
2. **wp-config.php constants** (legacy fallback)

If you have existing `PSP_AZURE_CLIENT_ID`, `PSP_HUBSPOT_API_KEY`, or `PSP_EMAIL_WEBHOOK_TOKEN` constants in `wp-config.php`, the setup wizard will use those as defaults.

---

## Testing Connections

### Test Azure AD
**What it checks:**
- Validates Tenant ID exists
- Queries Microsoft Graph metadata endpoint
- Confirms Azure AD configuration is reachable

**Response:**
- ✅ Success: "Azure AD tenant found! Configuration valid."
- ❌ Error: "Invalid Tenant ID or connection failed"

**Note:** This does NOT test Client Secret. Full SSO test requires attempting login.

### Test HubSpot
**What it checks:**
- Validates API Key
- Queries HubSpot account info endpoint
- Retrieves Portal ID

**Response:**
- ✅ Success: "HubSpot connected successfully! (Portal ID: 12345678)"
- ❌ Error: "Invalid API key or connection failed"

**Auto-fill:** If Portal ID is not entered, it will be automatically filled from API response.

---

## Troubleshooting

### Setup Wizard Not Showing
**Cause:** Activation redirect transient expired or was skipped  
**Solution:** Manually navigate to **WordPress Admin → PoolSafe Setup**

### Token Not Generating
**Cause:** Browser JavaScript error or AJAX permission issue  
**Solution:**
1. Check browser console for errors (F12)
2. Ensure you're logged in as Administrator
3. Try refreshing the page

### "Insufficient permissions" Error
**Cause:** User doesn't have admin capabilities  
**Solution:** Only administrators can access setup wizard

### Azure AD Test Failing
**Possible causes:**
- Incorrect Tenant ID (check Azure Portal → Overview)
- Network/firewall blocking Microsoft endpoints
- Typo in Client ID

**Solution:** Double-check all values from Azure Portal

### HubSpot Test Failing
**Possible causes:**
- Invalid API Key (expired or revoked)
- Missing required scopes (check private app settings)
- Incorrect Portal ID

**Solution:**
1. Regenerate API key in HubSpot
2. Verify all required scopes are enabled
3. Click "Grant admin consent" if needed

### Settings Not Saving
**Cause:** AJAX error or database write failure  
**Solution:**
1. Check browser console (F12) for JavaScript errors
2. Verify WordPress database connection
3. Check file permissions on uploads folder
4. Disable caching plugins temporarily

---

## Updating Settings Later

You can update settings anytime:
1. Go to **PoolSafe Setup** in admin menu
2. Make changes to any tab
3. Click **💾 Save Settings**

**Note:** Changing the webhook token will require updating URLs in your email provider.

---

## Exporting Configuration (Manual Backup)

To backup your settings manually:

```sql
-- WordPress database query
SELECT option_name, option_value 
FROM wp_options 
WHERE option_name LIKE 'psp_setting_%';
```

**Important:** Encrypted values cannot be transferred between sites (they use site-specific salts).

---

## Migrating to Setup Wizard from wp-config.php

If you previously used `wp-config.php` constants:

### Option 1: Automatic Migration (Recommended)
1. Open setup wizard
2. Constants will be detected and pre-filled
3. Click **💾 Save Settings**
4. Settings are now in database (you can remove constants from wp-config.php)

### Option 2: Manual Entry
1. Copy values from `wp-config.php`
2. Paste into setup wizard fields
3. Save settings
4. Test connections
5. Remove old constants

**Example:**
```php
// OLD (wp-config.php) - can remove after migration
define('PSP_AZURE_CLIENT_ID', 'abc-123');
define('PSP_HUBSPOT_API_KEY', 'pat-na1-xyz');

// NEW - now stored in database via setup wizard ✅
```

---

## Advanced: Programmatic Access

### Read Settings in Code
```php
// Get any setting
$api_key = PSP_Setup_Wizard::get_setting('hubspot_api_key');
$client_id = PSP_Setup_Wizard::get_setting('azure_client_id');

// Sensitive fields are automatically decrypted
```

### Save Settings in Code
```php
// Save any setting
PSP_Setup_Wizard::save_setting('hubspot_sync_enabled', '1');

// Sensitive fields are automatically encrypted
PSP_Setup_Wizard::save_setting('azure_client_secret', 'new-secret');
```

---

## Support

### Documentation
- Email Setup: `EMAIL-TO-TICKET-SETUP.md`
- Azure AD Setup: `AZURE-AD-SETUP.md`
- HubSpot Setup: `HUBSPOT-SETUP.md`
- Go-Live Checklist: `GO-LIVE-CHECKLIST.md`

### Getting Help
If you encounter issues:
1. Check browser console (F12) for errors
2. Check WordPress debug log: `wp-content/debug.log`
3. Enable debug mode in `wp-config.php`:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
4. Contact support with error logs

---

**Version:** 1.3.1  
**Last Updated:** November 13, 2025  
**Status:** ✅ Production Ready
