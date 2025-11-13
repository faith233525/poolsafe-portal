# Azure AD / Outlook SSO Setup Guide

## Overview
Configure single sign-on (SSO) for support staff using Microsoft Azure AD (Entra ID) and Outlook accounts.

## Prerequisites
- Microsoft 365 Business or Enterprise subscription
- Azure AD (Entra ID) admin access
- WordPress site with SSL (HTTPS required)

## Step 1: Register Azure AD Application

### 1.1 Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Select **App registrations** → **New registration**

### 1.2 Configure Application
- **Name:** PoolSafe Portal SSO
- **Supported account types:** 
  - Single tenant (if only your organization)
  - Multitenant (if supporting multiple customer organizations)
- **Redirect URI:**
  - Platform: **Web**
  - URL: `https://yoursite.com/wp-admin/admin-ajax.php?action=psp_azure_callback`
- Click **Register**

### 1.3 Note Application Details
Copy these values (you'll need them later):
- **Application (client) ID**: `abc12345-1234-5678-90ab-cdef12345678`
- **Directory (tenant) ID**: `def67890-5678-1234-56ab-cdef67890123`

## Step 2: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `PoolSafe Portal Production`
4. Expires: **24 months** (recommended)
5. Click **Add**
6. **Copy the secret value immediately** (you can't view it again)
   - Example: `abc~XyZ123...`

## Step 3: Configure API Permissions

1. Go to **API permissions** in your app registration
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `User.Read` (basic profile)
   - `email` (email address)
   - `profile` (display name, photo)
   - `openid` (sign in)
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Confirm consent

## Step 4: Configure WordPress

### 4.1 Add Credentials to wp-config.php
```php
// Azure AD SSO Configuration
define('PSP_AZURE_CLIENT_ID', 'abc12345-1234-5678-90ab-cdef12345678');
define('PSP_AZURE_CLIENT_SECRET', 'abc~XyZ123...');
define('PSP_AZURE_TENANT_ID', 'def67890-5678-1234-56ab-cdef67890123');
define('PSP_AZURE_REDIRECT_URI', 'https://yoursite.com/wp-admin/admin-ajax.php?action=psp_azure_callback');
```

### 4.2 Enable SSO in Plugin Settings
1. Go to **WordPress Admin** → Pool Safe → **Settings**
2. Navigate to **Authentication** tab
3. Check **Enable Azure AD SSO**
4. Save changes

## Step 5: User Provisioning

### Option A: Automatic Provisioning (Recommended)
Users are created on first SSO login:
1. User logs in with Outlook account
2. Plugin checks if email exists in WordPress
3. If not, creates user with `psp_support` role
4. User is logged in

Configure auto-provisioning:
```php
// In wp-config.php
define('PSP_AZURE_AUTO_PROVISION', true); // Default: true
define('PSP_AZURE_DEFAULT_ROLE', 'psp_support'); // Default role for new users
```

### Option B: Manual Provisioning
Pre-create support users:
1. Go to **Users** → **Add New**
2. Email must match Outlook email exactly
3. Assign role: **Support Staff**
4. No password needed (SSO only)

## Step 6: Customize Login Page

### Add SSO Button to Login Page
The plugin automatically adds "Sign in with Microsoft" button to:
- `/wp-login.php`
- Custom login shortcode `[poolsafe_login]`

### Button Customization (Optional)
```css
/* In your theme's custom CSS */
.psp-azure-login-button {
    background-color: #0078d4 !important;
    border-color: #0078d4 !important;
}
```

## Step 7: Testing

### 7.1 Test SSO Login
1. Go to your login page
2. Click **Sign in with Microsoft**
3. Enter Outlook credentials
4. Grant consent (first time only)
5. Should redirect to WordPress dashboard

### 7.2 Verify User Creation
1. Go to **Users** → **All Users**
2. Find user created from SSO
3. Check role is `psp_support`
4. Verify email matches Outlook account

### 7.3 Test Role-Based Access
Log in as SSO user and verify:
- Can access support dashboard
- Can view all partners
- Can create/edit tickets
- Cannot access WordPress admin settings (unless admin)

## Advanced Configuration

### Multi-Tenant Support
If supporting multiple customer organizations:

1. **Azure App Registration:**
   - Supported account types: **Multitenant**
   - Tenant ID: `common` (instead of specific tenant)

2. **wp-config.php:**
   ```php
   define('PSP_AZURE_TENANT_ID', 'common');
   define('PSP_AZURE_MULTITENANT', true);
   ```

### Custom Claims / Groups
Map Azure AD groups to WordPress roles:

```php
// In wp-config.php
define('PSP_AZURE_ROLE_MAPPING', json_encode([
    'Support Team' => 'psp_support',
    'Admin Team' => 'administrator',
    'Partner Managers' => 'psp_partner_manager'
]));
```

### Session Timeout
Configure SSO session duration:
```php
define('PSP_AZURE_SESSION_TIMEOUT', 8 * HOUR_IN_SECONDS); // 8 hours
```

## Troubleshooting

### Error: "Redirect URI mismatch"
**Solution:**
1. Go to Azure app registration → **Authentication**
2. Verify redirect URI exactly matches:
   ```
   https://yoursite.com/wp-admin/admin-ajax.php?action=psp_azure_callback
   ```
3. Must be HTTPS (not HTTP)
4. Must include `admin-ajax.php?action=psp_azure_callback`

### Error: "Invalid client secret"
**Solution:**
1. Client secret may have expired
2. Go to **Certificates & secrets**
3. Create new secret
4. Update `PSP_AZURE_CLIENT_SECRET` in `wp-config.php`

### Error: "User not authorized"
**Solution:**
1. User's email must match Outlook account
2. If auto-provision disabled, create user manually first
3. Enable auto-provision:
   ```php
   define('PSP_AZURE_AUTO_PROVISION', true);
   ```

### Error: "Insufficient permissions"
**Solution:**
1. Go to Azure app **API permissions**
2. Verify `User.Read`, `email`, `profile`, `openid` are added
3. Click **Grant admin consent**
4. Wait 5-10 minutes for propagation

### SSO button not showing
**Solution:**
1. Verify credentials in `wp-config.php`
2. Check plugin settings: **Enable Azure AD SSO** is checked
3. Clear browser cache
4. Check for JavaScript errors in browser console

### Users can't access dashboard after login
**Solution:**
1. Check user role is `psp_support` or higher
2. Go to **Settings** → **General** → verify default role
3. Manually assign role in **Users** → [User] → **Role**

## Security Best Practices

1. **Rotate client secrets every 12-24 months**
2. **Use HTTPS only** (enforce with redirect)
3. **Limit API permissions** to minimum required
4. **Monitor sign-in logs** in Azure AD
5. **Enable conditional access** (IP restrictions, MFA)
6. **Never commit secrets** to Git (use `wp-config.php` only)

## Conditional Access Policies (Optional)

### Require MFA for Support Staff
1. Go to **Azure AD** → **Security** → **Conditional Access**
2. Create new policy:
   - Users: Support Team group
   - Cloud apps: PoolSafe Portal SSO
   - Grant: Require multi-factor authentication
3. Enable policy

### IP Restrictions
Limit SSO to office/VPN IPs:
1. Conditional Access → **Locations**
2. Add trusted IPs
3. Policy: Block if not in trusted location

## Monitoring

### View Sign-In Logs
1. **Azure AD** → **Monitoring** → **Sign-in logs**
2. Filter by application: PoolSafe Portal SSO
3. Review failed sign-ins
4. Check user locations/devices

### WordPress Activity Log
Plugin logs SSO events:
- Go to **Pool Safe** → **Activity Log**
- Filter by action: `azure_sso_login`, `azure_sso_error`

## Migration from Password to SSO

1. **Enable SSO** (keep password login enabled)
2. **Communicate to support team** (send setup instructions)
3. **Monitor adoption** (check sign-in logs)
4. **After 100% adoption,** disable password login:
   ```php
   define('PSP_DISABLE_PASSWORD_LOGIN', true);
   ```

## Next Steps

1. ✅ Register Azure AD app
2. ✅ Configure API permissions
3. ✅ Add credentials to `wp-config.php`
4. ✅ Enable SSO in plugin settings
5. ✅ Test login with support account
6. ✅ Configure auto-provisioning
7. ✅ Train support team
8. ✅ Monitor sign-in logs for 1 week

---

**Support Resources:**
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/)
- [Azure AD B2C vs B2B](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)
- PoolSafe Portal SSO troubleshooting: `TROUBLESHOOTING.md`
