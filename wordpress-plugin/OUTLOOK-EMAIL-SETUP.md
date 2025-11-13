# Outlook Email-to-Ticket Setup Guide

This guide walks you through setting up **automatic email-to-ticket conversion** from your Outlook/Microsoft 365 account using the Microsoft Graph API.

## ✅ What This Does

- **Polls your Outlook inbox every 5 minutes** for new emails
- **Automatically creates support tickets** from incoming emails
- **Links emails to companies** by matching email domain or contact email
- **Marks processed emails as read** and optionally moves them to a folder
- **Stores unmatched emails** for manual company assignment

---

## 📋 Prerequisites

- Microsoft 365 or Outlook.com account
- Access to Azure Portal (for app registration)
- WordPress site with Pool Safe Portal plugin installed

---

## Step 1: Create Azure AD App Registration

### 1.1 Go to Azure Portal
Visit [https://portal.azure.com](https://portal.azure.com) and sign in.

### 1.2 Register New Application
1. Navigate to **Azure Active Directory** > **App registrations**
2. Click **"New registration"**
3. Fill in:
   - **Name**: `Pool Safe Portal Email Integration`
   - **Supported account types**: 
     - Choose **"Accounts in this organizational directory only"** (for M365 work account)
     - OR **"Accounts in any organizational directory and personal Microsoft accounts"** (for Outlook.com)
   - **Redirect URI**: Leave blank for now
4. Click **"Register"**

### 1.3 Copy Application Details
After registration, copy these values (you'll need them later):
- **Application (client) ID** - e.g., `a1b2c3d4-e5f6-1234-5678-90abcdef1234`
- **Directory (tenant) ID** - e.g., `f9e8d7c6-b5a4-3210-9876-543210fedcba`
  - For personal Microsoft accounts, use `common` instead

### 1.4 Create Client Secret
1. Go to **Certificates & secrets** > **Client secrets**
2. Click **"New client secret"**
3. Description: `PSP Email Polling`
4. Expires: Choose **24 months** (or custom)
5. Click **"Add"**
6. **IMPORTANT**: Copy the **Value** immediately (it won't show again)
   - Example: `AbC123~XyZ456-PqR789_MnO012`

---

## Step 2: Configure API Permissions

### 2.1 Add Required Permissions
1. Go to **API permissions**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"** > **"Delegated permissions"**
4. Search and add:
   - ✅ `Mail.Read` - Read user mail
   - ✅ `Mail.ReadWrite` - Mark as read and move emails
   - ✅ `offline_access` - Maintain access when user not present
5. Click **"Add permissions"**

### 2.2 Grant Admin Consent (Optional)
- If using work/school account: Click **"Grant admin consent for [Your Organization]"**
- If using personal account: Skip this step

---

## Step 3: Get Refresh Token

You need to perform OAuth authentication once to get a **refresh token** that the plugin will use automatically.

### 3.1 Build Authorization URL

Replace `{CLIENT_ID}` and `{TENANT_ID}` with your values:

```
https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize?client_id={CLIENT_ID}&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&response_mode=query&scope=https://graph.microsoft.com/Mail.Read%20https://graph.microsoft.com/Mail.ReadWrite%20offline_access&state=12345
```

**Example**:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=a1b2c3d4-e5f6-1234-5678-90abcdef1234&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&response_mode=query&scope=https://graph.microsoft.com/Mail.Read%20https://graph.microsoft.com/Mail.ReadWrite%20offline_access&state=12345
```

### 3.2 Get Authorization Code
1. Paste the URL into your browser
2. Sign in with your Outlook account
3. Accept the permissions
4. You'll be redirected to a page like:
   ```
   https://login.microsoftonline.com/common/oauth2/nativeclient?code=M.C123_ABC...xyz&state=12345
   ```
5. **Copy the `code` parameter value** - e.g., `M.C123_ABC...xyz`

### 3.3 Exchange Code for Refresh Token

Use PowerShell, Postman, or curl to exchange the code for tokens:

**PowerShell**:
```powershell
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_CLIENT_SECRET"
$tenantId = "common"  # or your tenant ID
$code = "AUTHORIZATION_CODE_FROM_STEP_3.2"

$body = @{
    client_id     = $clientId
    client_secret = $clientSecret
    code          = $code
    redirect_uri  = "https://login.microsoftonline.com/common/oauth2/nativeclient"
    grant_type    = "authorization_code"
    scope         = "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access"
}

$response = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $body

Write-Host "Access Token: " $response.access_token
Write-Host "`nRefresh Token: " $response.refresh_token
```

**curl**:
```bash
curl -X POST \
  https://login.microsoftonline.com/common/oauth2/v2.0/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient" \
  -d "grant_type=authorization_code" \
  -d "scope=https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access"
```

### 3.4 Save the Refresh Token
Copy the **`refresh_token`** from the response. It looks like:
```
0.AXoAeNrVZwJzSE...very_long_string...xyz
```

---

## Step 4: Configure WordPress Plugin

### 4.1 Go to Settings Page
1. Log in to WordPress admin
2. Navigate to **Pool Safe Portal** > **Outlook Emails**

### 4.2 Enter Configuration
Fill in the form with your Azure AD values:

| Field | Value | Example |
|-------|-------|---------|
| **Enable Email Polling** | ✅ Check this | |
| **Azure AD Client ID** | From Step 1.3 | `a1b2c3d4-e5f6-1234-5678-90abcdef1234` |
| **Client Secret** | From Step 1.4 | `AbC123~XyZ456-PqR789_MnO012` |
| **Tenant ID** | From Step 1.3 or "common" | `common` or `f9e8d7c6-b5a4-3210-9876-543210fedcba` |
| **Refresh Token** | From Step 3.4 | `0.AXoAeNrVZwJzSE...` |

### 4.3 Save Settings
Click **"Save Changes"**

---

## Step 5: Test the Integration

### 5.1 Manual Poll
1. On the **Outlook Emails** settings page, scroll to **"Test Connection"**
2. Click **"Poll Emails Now"**
3. Check if any new tickets were created

### 5.2 Send Test Email
1. Send an email to your configured Outlook inbox from a known company contact
2. Wait up to 5 minutes (automatic polling interval)
3. Check **Tickets** > **All Tickets** for the new ticket

---

## 🔧 How It Works

### Email Processing Flow
```
1. WP Cron runs every 5 minutes
2. Plugin calls Microsoft Graph API to get new emails
3. For each email:
   a. Extract sender, subject, body
   b. Try to match sender to company (by email domain or contact)
   c. If match found: Create ticket, mark email as read
   d. If no match: Store in "pending emails" for manual assignment
4. Update last poll timestamp
```

### Company Matching Logic
The plugin matches emails to companies by:
1. **Exact email match**: Company contact email = sender email
2. **Domain match**: Company has `psp_email_domain` meta matching sender's domain

**Example**:
- Email from `john@poolsafeinc.com`
- Company has meta `psp_email_domain = poolsafeinc.com`
- ✅ Match! Ticket created for this company

---

## 📊 Monitoring & Troubleshooting

### Check Last Poll Time
On **Pool Safe Portal** > **Outlook Emails**, see **"Last Poll"** timestamp.

### View Pending Emails
Emails that couldn't be matched to a company are stored in the database:
```php
$pending = get_option('psp_pending_outlook_emails', []);
print_r($pending);
```

### Enable Debug Logging
Check `wp-content/debug.log` for errors:
- "PSP: Failed to get Outlook access token" - Check credentials
- "PSP: Outlook API error: ..." - Check permissions or network

### Common Issues

| Problem | Solution |
|---------|----------|
| No tickets created | Check refresh token is valid; re-do OAuth flow |
| "Failed to get access token" | Verify Client ID, Secret, Tenant ID are correct |
| "Unauthorized" API errors | Ensure Mail.Read and Mail.ReadWrite permissions are granted |
| Refresh token expires | Re-do Step 3 to get new refresh token |

---

## ⚙️ Advanced Configuration

### Change Polling Interval
Edit `class-psp-outlook-email-polling.php`:
```php
const POLL_INTERVAL = 600; // 10 minutes (in seconds)
```

### Add Email Domain to Company
To enable domain-based matching:
```php
update_post_meta($company_id, 'psp_email_domain', 'poolsafeinc.com');
```

### Move Processed Emails to Folder
Uncomment the folder move code in `process_email()`:
```php
self::move_email_to_folder($email['id'], 'PSP Tickets', $access_token);
```

---

## 🔐 Security Notes

- **Never share** your Client Secret or Refresh Token
- Store tokens in WordPress database (secured by WordPress file permissions)
- Use HTTPS for your WordPress site
- Refresh tokens can expire - monitor for auth errors
- Consider using Azure Key Vault for production secrets

---

## 📞 Support

For issues or questions:
1. Check WordPress debug log: `wp-content/debug.log`
2. Verify Azure AD permissions in Azure Portal
3. Test manually using "Poll Emails Now" button
4. Contact Pool Safe Portal support

---

## ✅ Checklist

- [ ] Azure AD app registered
- [ ] Client ID and Secret copied
- [ ] API permissions added (Mail.Read, Mail.ReadWrite, offline_access)
- [ ] Authorization code obtained
- [ ] Refresh token received from token endpoint
- [ ] WordPress settings configured
- [ ] Email polling enabled
- [ ] Test email processed successfully
- [ ] Companies have email domains configured

**Once complete, your Outlook inbox will automatically create support tickets! 🎉**
