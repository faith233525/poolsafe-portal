# WordPress Plugin v1.3.0 - Ready to Upload! 🚀

## ✅ What's Been Done

Your plugin ZIP is ready with **Azure AD credentials pre-configured**!

### File Created:
📦 **wp-poolsafe-portal-v1.3.0.zip** (974.83 KB)

### Pre-Configured Credentials:
- ✅ **Azure Client ID:** 44a618a3... (from your .env)
- ✅ **Azure Client Secret:** [Securely embedded]
- ✅ **Azure Tenant ID:** `common` (multi-tenant - works with any Microsoft account)
- ✅ **HubSpot Access Token:** pat-na1-cb78c51... (embedded for reference)

---

## 📥 Upload Instructions (5 Minutes Setup)

### Step 1: Upload to WordPress (1 minute)

1. Go to your WordPress admin
2. Navigate to **Plugins → Add New → Upload Plugin**
3. Upload **wp-poolsafe-portal-v1.3.0.zip**
4. Click **Install Now**
5. Click **Activate**

### Step 2: Auto-Configure Azure AD (2 minutes)

1. Open your browser and visit:
   ```
   https://your-wordpress-site.com/wp-content/plugins/wp-poolsafe-portal/configure-azure.php
   ```

2. The script will automatically:
   - ✅ Configure Azure AD credentials
   - ✅ Show success page with next steps
   - ✅ Display HubSpot token for reference

3. **Important:** After configuration, **delete** `configure-azure.php` (the script reminds you)

### Step 3: Configure Azure AD Redirect URI (2 minutes)

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory → App registrations**
3. Click your app (Client ID: 44a618a3...)
4. Click **Authentication**
5. Add redirect URI:
   ```
   https://your-wordpress-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback
   ```
   ⚠️ Must be HTTPS (not HTTP)

---

## 🧪 Test Your Setup

### Test Microsoft Login:

1. Go to `/portal-login` on your site
2. You should see **"Sign in with Microsoft"** button
3. Click it and sign in with any Microsoft account
4. Should redirect to portal/admin based on your role

### Test Partner Login:

1. Go to `/portal-login`
2. Use username/password form
3. Should redirect to `/portal`

---

## 📋 What's Included

### Features (v1.3.0):
- ✅ Dual authentication (Microsoft OAuth + username/password)
- ✅ SLA settings page (configurable response times)
- ✅ Service records pagination (Load More button)
- ✅ Accessibility improvements (WCAG 2.1 AA)
- ✅ 11 shortcodes for portal functionality
- ✅ Tabbed portal interface
- ✅ Role-based access control

### Documentation Files (in plugin folder):
- `SETUP-AFTER-UPLOAD.md` - Complete setup guide
- `MICROSOFT-LOGIN-TROUBLESHOOTING.md` - Troubleshooting guide
- `LOGIN-PAGE-SETUP.md` - Login page configuration
- `SHORTCODES-REFERENCE.md` - All 11 shortcodes
- `INTEGRATION-TEST-PLAN.md` - Testing checklist
- `UPDATE-GUIDE.md` - Configuration guide
- `check-config.php` - Configuration verification tool

---

## 🔒 Security Notes

1. **Delete `configure-azure.php`** after setup (contains credentials)
2. **Use HTTPS** - Microsoft OAuth requires SSL
3. **Backup regularly** - Standard WordPress best practice
4. **Credentials are NOT in Git** - Template system keeps them secure

---

## ⚙️ Technical Details

### Multi-Tenant Configuration:
Your plugin is configured with `tenant_id: common`, which means:
- ✅ Any Microsoft account can log in (@poolsafeinc.com, @outlook.com, etc.)
- ✅ No restriction to specific organization
- ✅ Perfect for testing and multi-org support

### Want Organization-Only Login?
If you want to restrict to only @poolsafeinc.com emails:
1. Get your specific Tenant ID from Azure Portal → Azure AD → Overview
2. WP Admin → Pool Safe → Email → Microsoft Graph → Change Tenant ID

---

## 🎨 Create Your Login Page

After activation, create a new page in WordPress:

**Page Title:** Portal Login  
**Slug:** portal-login  
**Content:**
```
[poolsafe_login]
```

**Publish** the page and visit `/portal-login` to see the dual login system!

---

## 📊 Create Your Portal Page

Create another page for the portal:

**Page Title:** Partner Portal  
**Slug:** portal  
**Content:** See `SHORTCODES-REFERENCE.md` for complete tabbed portal setup

Example basic portal:
```html
<div class="psp-tabs">
    <div class="psp-tab-nav">
        <button class="psp-tab-link active" data-tab="tickets">Tickets</button>
        <button class="psp-tab-link" data-tab="create">Create Ticket</button>
        <button class="psp-tab-link" data-tab="knowledge">Knowledge Base</button>
    </div>
    <div class="psp-tab-content active" id="tickets">
        [poolsafe_tickets_list]
    </div>
    <div class="psp-tab-content" id="create">
        [poolsafe_create_ticket]
    </div>
    <div class="psp-tab-content" id="knowledge">
        [poolsafe_knowledge_base]
    </div>
</div>
```

---

## 🆘 Troubleshooting

### "Sign in with Microsoft" button doesn't appear
**Cause:** Configuration not run yet  
**Solution:** Visit and run `configure-azure.php`

### "Redirect URI mismatch" error
**Cause:** Redirect URI not configured in Azure AD  
**Solution:** Follow Step 3 above

### Can't access configuration script
**Cause:** Plugin not activated  
**Solution:** Activate plugin in WordPress admin first

---

## 📞 Support

All documentation is included in the plugin folder:
- Check `MICROSOFT-LOGIN-TROUBLESHOOTING.md` for common issues
- Run `check-config.php` to verify all settings
- See `INTEGRATION-TEST-PLAN.md` for comprehensive testing

---

## 🎉 You're All Set!

**Total setup time:** ~5 minutes

1. ✅ Upload ZIP (1 min)
2. ✅ Run configure-azure.php (2 min)
3. ✅ Configure redirect URI (2 min)
4. ✅ Test login!

Your plugin includes:
- ✅ Pre-configured Azure AD credentials
- ✅ Pre-configured HubSpot token
- ✅ Complete documentation
- ✅ Testing tools
- ✅ Troubleshooting guides

**Now just upload and go! 🚀**
