# 🚀 Quick Setup After Upload - Pool Safe Portal v1.3.0

## ⚠️ IMPORTANT: Auto-Configuration Available!

This plugin includes an **automatic configuration script** that will set up your Azure AD credentials with just a few clicks!

**What's pre-configured:**
- ✅ **Client ID:** Already included in the script
- ✅ **Client Secret:** Already included in the script  
- ✅ **Tenant ID:** Set to `common` (multi-tenant - works with any Microsoft account)

---

## 🎯 Option 1: Automatic Configuration (Recommended - 2 minutes)

### Step 1: Upload & Activate

1. Upload `wp-poolsafe-portal-v1.3.0.zip` to WordPress
2. Activate the plugin

### Step 2: Run Auto-Configuration

1. Visit: `https://your-site.com/wp-content/plugins/wp-poolsafe-portal/configure-azure.php`
2. The script will automatically configure Azure AD
3. Follow the on-screen instructions
4. **Delete `configure-azure.php` after setup** (for security)

That's it! The script includes your credentials and will configure everything automatically.

---

## 🎯 Option 2: Manual Configuration (If you prefer manual setup)

### Step 1: Upload Plugin

1. Upload `wp-poolsafe-portal-v1.3.0.zip` to WordPress
2. Activate the plugin

### Step 2: Configure Microsoft Graph

1. Login to WordPress admin
2. Go to **Pool Safe → Email → Microsoft Graph**
3. Enter your Azure AD credentials:
   - **Tenant ID:** `common` (or your specific tenant ID from Azure Portal)
   - **Client ID:** `[From your .env file: AZURE_CLIENT_ID]`
   - **Client Secret:** `[From your .env file: AZURE_CLIENT_SECRET]`
4. Click **Save Settings**

### Step 3: Configure HubSpot (Optional)

1. Go to **Pool Safe → HubSpot**
2. Enter:
   - **API Key:** `[From your .env file: HUBSPOT_API_KEY]`
   - **Portal ID:** `[Optional - get from HubSpot settings]`
3. Enable checkboxes if you want auto-sync
4. Click **Save Settings**

---

## 🔧 Configure Azure AD Redirect URI

**This is CRITICAL for Microsoft login to work!**

1. Go to https://portal.azure.com
2. Navigate to **Azure AD → App registrations**
3. Click your app (the one with Client ID from your .env)
4. Click **Authentication** (left menu)
5. Under **Redirect URIs**, click **+ Add a platform**
6. Select **Web**
7. Enter redirect URI:
   ```
   https://your-wordpress-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback
   ```
   ⚠️ Replace `your-wordpress-site.com` with your actual domain!
   ⚠️ Must be **HTTPS** (not HTTP)
8. Click **Configure**

---

## ✅ Testing

### Test Microsoft Login

1. Go to: `https://your-site.com/portal-login`
2. You should see **"Sign in with Microsoft"** button
3. Click it
4. Sign in with your company email (@poolsafeinc.com or any Microsoft account)
5. Grant permissions
6. You should be logged in and redirected to the portal!

### Test Partner Login

1. Go to: `https://your-site.com/portal-login`
2. Use the **Partners** section (username/password)
3. Enter credentials
4. Click **Sign In**
5. Should redirect to `/portal`

---

## 📍 Site Protection and Menus

This plugin protects all WordPress pages by default:

- Non-logged-in visitors are redirected to your login page (default: `/login`).
- Theme navigation menus are hidden for non-logged-in users.
- WordPress admin bar is hidden for non-logged-in users.

Allowed without login:
- The login page (`/login` or `/portal-login`)
- Microsoft OAuth start/callback for sign-in
- REST API, AJAX, cron, and public assets (uploads, plugin/theme assets)

### Customizing the Login Page Slug

You can configure which page guests are redirected to:

1. Go to **Pool Safe → Settings**
2. Find **Access Control Settings** section
3. Set **Login Page Slug** (default: `login`)
4. Create a WordPress page with that slug and add the `[poolsafe_login]` shortcode

The system accepts both `/login` and `/portal-login` for backward compatibility.

---

## 🗺️ Partner Map Geocoding

Partners are automatically placed on the map based on their address—no manual latitude/longitude entry needed!

**How it works:**
- When you save a Partner with address fields (street, city, state, zip, country), coordinates are auto-generated
- Existing partners without coordinates can be batch-processed via **Partners → Geocode from Address**
- The Partners admin list shows a ✓/✗ status for each partner's geocode status
- Filter the list to show only partners missing coordinates

**See full documentation:** `wp-content/plugins/wp-poolsafe-portal/docs/MAP-GEOCODING.md`

---

## �📋 What Gets Configured

After using the auto-configuration script:

### Microsoft OAuth (Support Staff Login)
- ✅ Tenant ID: `common` (multi-tenant)
- ✅ Client ID: Configured from .env
- ✅ Client Secret: Configured from .env
- ✅ "Sign in with Microsoft" button enabled
- ✅ Auto-redirect: Support → Admin Dashboard, Partners → Portal

### Dual Authentication
- **Support Staff:** Sign in with Microsoft (any @poolsafeinc.com or Microsoft account)
- **Partners:** Username + Password (traditional WordPress login)
- Both methods shown on same page with clear visual separation

---

## 🔒 Security Notes

1. **Delete `configure-azure.php`** after running it (script reminds you)
2. **Use HTTPS** - Microsoft OAuth requires SSL
3. **Redirect URI must match exactly** in Azure AD
4. **Client Secret is sensitive** - keep it secure

---

## 📚 Documentation Files

All in `wp-content/plugins/wp-poolsafe-portal/`:

- **MICROSOFT-LOGIN-TROUBLESHOOTING.md** - Detailed Azure AD setup and troubleshooting
- **LOGIN-PAGE-SETUP.md** - Login page configuration guide
- **UPDATE-GUIDE.md** - Complete integration and configuration guide
- **SHORTCODES-REFERENCE.md** - All 11 shortcodes with examples
- **INTEGRATION-TEST-PLAN.md** - Comprehensive testing checklist
- **check-config.php** - Automated configuration verification

---

## 🆘 Troubleshooting

### "Sign in with Microsoft" button doesn't appear

**Cause:** Azure AD not configured yet  
**Solution:** Run `configure-azure.php` or configure manually in WP Admin

### "Redirect URI mismatch" error when clicking Microsoft login

**Cause:** Redirect URI not configured in Azure AD  
**Solution:** 
1. Azure Portal → App registrations → Your app → Authentication
2. Add redirect URI: `https://your-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback`
3. Must match your site URL **exactly** (including https://)

### Login works but redirects to wrong page

**Cause:** Role-based redirect logic  
**Expected behavior:**
- Users with `psp_support` or `administrator` role → `/wp-admin` (dashboard)
- Users with `psp_partner` role → `/portal` (partner portal)

### Microsoft login shows "permissions requested" screen every time

**Cause:** Normal behavior for first login  
**Solution:** Users need to grant permissions once (Mail.Send, offline_access)

---

## 🚀 Quick Start Checklist

- [ ] Upload `wp-poolsafe-portal-v1.3.0.zip` to WordPress
- [ ] Activate plugin
- [ ] Run `configure-azure.php` (visit in browser)
- [ ] Configure redirect URI in Azure AD
- [ ] Test Microsoft login
- [ ] **Delete `configure-azure.php`** (important!)
- [ ] Configure HubSpot (optional)
- [ ] Create login page: Add `[poolsafe_login]` shortcode
- [ ] Create portal page: Add tabbed interface (see SHORTCODES-REFERENCE.md)
- [ ] Test both login methods (Microsoft + username/password)
- [ ] Verify role-based redirects work correctly

---

## 💡 Pro Tips

1. **Tenant ID `common`:** Works with any Microsoft account (personal or work)
2. **Specific tenant:** If you want to restrict to only @poolsafeinc.com accounts, use your specific tenant ID from Azure Portal
3. **Testing locally:** You can test with `http://localhost` but production **must** use HTTPS
4. **Credentials from .env:** All Azure/HubSpot credentials are in your `backend/.env` file

---

**Plugin Version:** 1.3.0  
**Last Updated:** November 12, 2025  
**Support:** See documentation files above  
**Credentials:** See `backend/.env` file for your API keys
