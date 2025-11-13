# Pool Safe Portal v1.3.0 - Deployment Checklist

**Version:** 1.3.0  
**Date:** November 12, 2025  
**Status:** Production Ready

---

## 📦 Deployment Packages

Two clean, versioned archives are ready for deployment:

| Package | Filename | Purpose | Size |
|---------|----------|---------|------|
| **WordPress Plugin** | `wp-poolsafe-portal-plugin-v1.3.0.zip` | WordPress plugin (install via Plugins → Add New → Upload) | ~197 KB |
| **Frontend SPA** | `poolsafe-frontend-v1.3.0.zip` | Static frontend for cPanel/hosting (optional) | ~231 KB |

**Legacy ZIPs removed:** All outdated archives (v1.0.0, v1.1.0, PRODUCTION-READY, etc.) have been deleted to prevent confusion.

---

## ✅ Pre-Deployment Verification

### Plugin Package Contents
Confirm `wp-poolsafe-portal-plugin-v1.3.0.zip` contains:
- ✅ `wp-poolsafe-portal.php` (main plugin file, version 1.3.0)
- ✅ `includes/` directory with all class files:
  - `class-psp-company-users.php` (new: company-user linkage)
  - `class-psp-notifications.php` (enhanced: dispatch method)
  - `class-psp-rest.php` (extended: company-users, notification-prefs endpoints)
  - `class-psp-frontend.php` (updated: shortcode aliases, login UI)
- ✅ `assets/css/portal.css` (CSS variables for theming)
- ✅ `assets/js/portal.js` (company users management functions)
- ✅ `SHORTCODES-REFERENCE.md` (updated with aliases)

### Frontend Package Contents
Confirm `poolsafe-frontend-v1.3.0.zip` contains:
- ✅ `index.html`
- ✅ `assets/` folder (compiled CSS/JS)
- ✅ `.htaccess` (SPA routing)
- ✅ `manifest.json`, `sw.js` (PWA support)

---

## 🚀 WordPress Plugin Deployment

### Step 1: Upload & Activate
1. **Login to WordPress Admin** → Plugins → Add New → Upload Plugin
2. **Choose File:** `wp-poolsafe-portal-plugin-v1.3.0.zip`
3. **Click:** Install Now → Activate Plugin
4. **Verify Version:** Plugins page should show "Pool Safe Portal (PSP) **1.3.0**"

### Step 2: Verify Installation
```bash
# Check plugin is active
wp plugin list --status=active | grep poolsafe

# Verify shortcodes registered
wp eval 'echo shortcode_exists("poolsafe_support_tools") ? "✓ support_tools\n" : "✗ missing\n";'
wp eval 'echo shortcode_exists("poolsafe_user_management") ? "✓ user_management\n" : "✗ missing\n";'
```

### Step 3: Flush Permalinks
1. Navigate to **Settings → Permalinks**
2. Click **Save Changes** (no changes needed, just flush)
3. This ensures REST routes and rewrite rules initialize properly

### Step 4: Test Core Functionality

#### A. REST Endpoints (via browser or curl)
```bash
# Health check
curl -s https://yoursite.com/wp-json/poolsafe/v1/health

# Company users (replace 123 with actual partner ID)
curl -s https://yoursite.com/wp-json/poolsafe/v1/partners/123/company-users \
  -H "X-WP-Nonce: YOUR_NONCE"

# User notification preferences (replace 456 with user ID)
curl -s https://yoursite.com/wp-json/poolsafe/v1/users/456/notification-prefs \
  -H "X-WP-Nonce: YOUR_NONCE"
```

#### B. Shortcode Rendering
1. **Create Test Page:** Pages → Add New
2. **Add Shortcode Block** (not HTML block):
   ```
   [poolsafe_support_tools]
   ```
3. **Publish & View:** Should render Support Tools UI (colors, partner selector, branding controls)
4. **Test Alias:** Edit page, replace with `[poolsafe_tools]` → should render identically
5. **Test User Management:**
   ```
   [poolsafe_user_management]
   ```
   Should show "Create Partner User" form with email, partner dropdown, role selector

#### C. Login Page UI
1. **Create Login Page:** Pages → Add New
2. **Add Shortcode:**
   ```
   [poolsafe_login]
   ```
3. **View Page:** Should display two-column layout:
   - **Left:** Microsoft Sign-In (blue button, white Microsoft logo)
   - **Right:** Partner Login (username/password)
4. **Check Responsive:** Resize browser → should stack vertically on mobile

#### D. Theme Colors
1. **Inspect Page Elements:**
   - Primary buttons should use **#3AA6B9** (Calm Blue)
   - Hover state should use **#25D0EE** (Accent)
   - Navy elements should use **#000080**
2. **Browser DevTools:** Check computed styles reference `var(--psp-primary)`

---

## 🔧 Post-Deployment Configuration

### Company-User Linkage Setup
1. **Navigate to Partners:** PSP → Partners
2. **Edit Any Partner**
3. **Scroll to "Authorized Accounts" section** (new in v1.3.0)
4. **Link Existing User:** Enter username/email → click Add
5. **Set Primary User:** Click "Set Primary" next to preferred contact
6. **Notification Preferences:**
   - Toggle "Enable notifications" per user
   - Check categories (Tickets, Service Records, Alerts, Announcements)
   - Select channels (Portal, Email)
7. **Save Changes**

### Notification Dispatch Test
```php
// In WordPress admin or via wp-cli
$result = PSP_Notifications::dispatch(
    123,           // partner_id
    'tickets',     // category
    'Test Notification',
    'Testing fallback logic',
    []
);
// Check $result['delivery_targets'] for recipient list
// Should show subscribed users or fallback to primary user
```

### Migration Verification
The plugin auto-runs migration (once per hour via transient) to:
- Assign primary user if missing (uses first linked user)
- Initialize default notification preferences

**Manual trigger (if needed):**
```php
// wp-admin or wp shell
PSP_Company_Users::maybe_run_migration();
```

---

## 🐛 Troubleshooting

### Shortcodes Show Raw Text
**Symptom:** Page displays `[poolsafe_support_tools]` instead of rendering UI

**Solutions:**
1. ✅ Verify plugin is **active** (Plugins page)
2. ✅ Use **Shortcode block** in block editor (not HTML/Code block)
3. ✅ Check spelling: `poolsafe_support_tools` (underscores, all lowercase)
4. ✅ Flush permalinks: Settings → Permalinks → Save
5. ✅ Try alias: `[poolsafe_tools]` or `[psp_support_tools]`
6. ✅ Check PHP errors: Enable `WP_DEBUG` in `wp-config.php`

**Debug snippet:**
```php
// Add to theme functions.php temporarily
add_action('init', function() {
    error_log('Shortcode exists? ' . (shortcode_exists('poolsafe_support_tools') ? 'YES' : 'NO'));
}, 999);
```

### REST Endpoints Return 404
**Symptom:** `/wp-json/poolsafe/v1/partners/123/company-users` not found

**Solutions:**
1. ✅ Flush permalinks (Settings → Permalinks → Save)
2. ✅ Check `.htaccess` file is writable
3. ✅ Verify `rest_api_init` hook fired: check error logs
4. ✅ Test basic WP REST: visit `/wp-json/` (should show JSON)

### Company Users Section Missing
**Symptom:** Partner edit screen doesn't show "Authorized Accounts"

**Solutions:**
1. ✅ Confirm plugin version is 1.3.0 (Plugins page)
2. ✅ Clear browser cache + hard reload (Ctrl+Shift+R)
3. ✅ Check `portal.js` loaded: DevTools → Network tab → filter JS
4. ✅ Check console errors: DevTools → Console tab

### Colors Not Applying
**Symptom:** Buttons still show old colors

**Solutions:**
1. ✅ Hard refresh page: Ctrl+Shift+R (clear cached CSS)
2. ✅ Check CSS variables loaded:
   - DevTools → Elements → `:root` → Styles
   - Should see `--psp-primary: #3AA6B9;`
3. ✅ Clear CDN/caching plugin cache (if enabled)
4. ✅ Inspect button computed style: should reference `var(--psp-primary)`

---

## 📋 Feature Verification Checklist

### Core Features (v1.0-1.2)
- [ ] Tickets: Create, list, filter by status/priority
- [ ] Partners: Directory, map view (support only)
- [ ] Service Records: Timeline, load more pagination
- [ ] Knowledge Base: Search, category browse
- [ ] Calendar: Events display
- [ ] Notifications: Bell icon, unread count
- [ ] Login: Dual auth (Microsoft + username/password)
- [ ] User Management: Create partner/support users
- [ ] Support Tools: Branding colors, partner lock editing
- [ ] CSV Import: Bulk partner creation (company_name only)

### New Features (v1.3.0)
- [ ] **Company-User Linkage:**
  - [ ] Partner meta: `psp_primary_user_id`, `psp_user_ids`
  - [ ] Link/unlink users from partner profile
  - [ ] Set primary user designation
- [ ] **Notification Preferences:**
  - [ ] Per-user toggles (enable/disable)
  - [ ] Category subscriptions (tickets, service_records, alerts, announcements)
  - [ ] Channel selection (portal, email)
  - [ ] Save/load via REST endpoints
- [ ] **Fallback Dispatch:**
  - [ ] Notification respects user subscriptions
  - [ ] Falls back to primary user if no subscribers
  - [ ] Logs `delivery_targets` meta for audit
- [ ] **Migration Script:**
  - [ ] Auto-assigns primary user (first linked)
  - [ ] Initializes default notification prefs
  - [ ] Runs once per hour (transient-based)
- [ ] **UI Enhancements:**
  - [ ] Login page: Two-column responsive layout
  - [ ] Microsoft button: Brand-aligned styling
  - [ ] Partner profile: Authorized Accounts table
- [ ] **Theme Alignment:**
  - [ ] CSS variables: `--psp-primary`, `--psp-accent`, `--psp-navy`
  - [ ] Buttons use variable colors
  - [ ] Consistent branding across all UI
- [ ] **Shortcode Aliases:**
  - [ ] `[poolsafe_tools]` → support tools
  - [ ] `[poolsafe_users]` → user management
  - [ ] `[psp_support_tools]` → support tools
  - [ ] `[psp_user_management]` → user management

---

## 🎯 Quick Start Commands

### Local Test Environment
```powershell
# Start local WordPress (if using Local by Flywheel or similar)
cd "C:\Users\pools\Local Sites\poolsafe-test\app\public"

# Install plugin
wp plugin install wp-poolsafe-portal-plugin-v1.3.0.zip --activate

# Create test page with shortcode
wp post create --post_type=page --post_title="Portal Test" \
  --post_content='[poolsafe_support_tools]' --post_status=publish

# Check REST endpoints
wp eval 'print_r(rest_get_server()->get_routes());' | grep poolsafe
```

### Production WordPress
```bash
# Upload via WP-CLI (if SSH access available)
wp plugin install wp-poolsafe-portal-plugin-v1.3.0.zip --activate

# Verify activation
wp plugin list --status=active --format=table

# Flush permalinks
wp rewrite flush

# Check shortcodes
wp shell
> shortcode_exists('poolsafe_support_tools');
> shortcode_exists('poolsafe_user_management');
```

---

## 📞 Support & Troubleshooting

### Common Issues Reference
| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Raw shortcode visible | Wrong block type or spelling | Use Shortcode block; try alias |
| 404 on REST routes | Permalinks not flushed | Settings → Permalinks → Save |
| Colors not updated | CSS cache | Hard refresh (Ctrl+Shift+R) |
| Company users not loading | JS error or endpoint 404 | Check console; verify REST base |
| Migration not running | Transient not expired | Wait 1 hour or trigger manually |

### Debug Mode
Enable in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```
Check logs: `wp-content/debug.log`

### Contact
For issues not covered here:
1. Check plugin error logs
2. Review browser console (DevTools → Console)
3. Test REST endpoints directly
4. Verify plugin version matches 1.3.0
5. Confirm PHP 7.4+ and WordPress 6.0+

---

## 🎉 Deployment Complete

Once all checklist items pass:
- ✅ Plugin active and version confirmed (1.3.0)
- ✅ Shortcodes render (test page created)
- ✅ REST endpoints respond (curl tests pass)
- ✅ Theme colors applied (CSS variables loaded)
- ✅ Company-user UI loads (partner profile expanded)
- ✅ Notification preferences save (test user update)

**Your Pool Safe Portal v1.3.0 is production-ready!** 🏊‍♂️

---

**Next Steps:**
1. Train support staff on new user management UI
2. Document company-user workflow for partners
3. Monitor notification dispatch logs for first 24 hours
4. Collect feedback on new features
5. Plan v1.4.0 enhancements based on usage patterns
