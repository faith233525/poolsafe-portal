# Pool Safe Portal - Login Page Setup Guide

**Plugin Version:** 1.3.0  
**Last Updated:** November 12, 2025

---

## 🔐 Dual Authentication System

The login page supports **two authentication methods** based on user type:

### 👨‍💼 Support Staff → Microsoft/Outlook SSO
- Sign in with Microsoft work account
- OAuth 2.0 authentication via Azure AD
- Automatic redirect to WordPress admin dashboard

### 🏢 Partners → Username & Password
- Sign in with company credentials
- Traditional WordPress authentication  
- Automatic redirect to portal page

---

## 📋 Quick Setup

### Step 1: Create Login Page

1. Go to **Pages → Add New** in WordPress
2. **Title:** Portal Login
3. **Slug:** `portal-login`
4. **Content:**
   ```
   [poolsafe_login]
   ```
5. **Template:** Full Width (recommended)
6. **Publish**

### Step 2: Configure Microsoft OAuth (Optional for Support Staff)

**If you want Support Staff to use Microsoft/Outlook SSO:**

1. Go to **Pool Safe → Email → Microsoft Graph**
2. Enter Azure AD credentials:
   - **Tenant ID:** `[your-tenant-id]`
   - **Client ID:** `[your-client-id]`
   - **Client Secret:** `[your-client-secret]`
3. **Save Settings**

**Result:** Login page will show both Microsoft button AND username/password form

**If you skip this step:** Login page will ONLY show username/password form

See `UPDATE-GUIDE.md` for detailed Azure AD setup instructions.

---

## 🎨 What Users See

### Scenario A: Microsoft OAuth Configured

```
┌─────────────────────────────────────────┐
│        Pool Safe Portal                 │
│        Sign in to your account          │
├─────────────────────────────────────────┤
│                                         │
│  👨‍💼 Support Staff                      │
│  Sign in with your Microsoft Outlook    │
│  account                                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [MS] Sign in with Microsoft     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────── OR ───────────────      │
│                                         │
│  🏢 Partners                            │
│  Sign in with your company credentials │
│                                         │
│  Username or Email                      │
│  [___________________________]          │
│                                         │
│  Password                               │
│  [___________________________]          │
│                                         │
│  ☐ Remember me                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        Sign In                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Need help? Contact your administrator.│
└─────────────────────────────────────────┘
```

### Scenario B: Microsoft OAuth NOT Configured

```
┌─────────────────────────────────────────┐
│        Pool Safe Portal                 │
│        Sign in to your account          │
├─────────────────────────────────────────┤
│                                         │
│  Username or Email                      │
│  [___________________________]          │
│                                         │
│  Password                               │
│  [___________________________]          │
│                                         │
│  ☐ Remember me                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        Sign In                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Need help? Contact your administrator.│
└─────────────────────────────────────────┘
```

---

## 🔄 Login Flow

### For Support Staff (Microsoft SSO)

1. User clicks **"Sign in with Microsoft"** button
2. Redirects to Microsoft login page
3. User enters Outlook credentials (e.g., `agent@poolsafeinc.com`)
4. Microsoft authenticates and grants permission
5. Redirects back to WordPress
6. User automatically logged in
7. **Redirects to:** WordPress Admin Dashboard (`/wp-admin/`)

### For Partners (Username/Password)

1. User enters username (or email) and password
2. Clicks **"Sign In"** button
3. WordPress validates credentials
4. User logged in with `psp_partner` role
5. **Redirects to:** Portal page (`/portal/`)

---

## 🎯 User Roles & Redirects

| User Role | Authentication Method | Redirect After Login |
|-----------|----------------------|---------------------|
| `psp_support` | Microsoft SSO OR Username/Password | `/wp-admin/` (Admin Dashboard) |
| `administrator` | Microsoft SSO OR Username/Password | `/wp-admin/` (Admin Dashboard) |
| `psp_partner` | Username/Password only | `/portal/` (Portal Page) |

---

## 🔧 Customization

### Change Redirect URLs

Edit `class-psp-frontend.php` line ~320:

```php
// For Microsoft OAuth redirect
if (current_user_can('psp_support') || current_user_can('administrator')) {
    $redirect_url = admin_url(); // Change to: home_url('/custom-page')
}

// For Partners redirect
$redirect_url = home_url('/portal'); // Change to: home_url('/dashboard')
```

### Change Portal URL in "Already Logged In" Message

Edit `class-psp-frontend.php` line ~282:

```php
$portal_url = home_url('/portal'); // Change to your portal page slug
```

### Customize Login Box Width

Edit `assets/css/portal.css`:

```css
.psp-login-box {
    max-width: 480px; /* Change to 600px for wider box */
}
```

### Add Company Logo

Add this to your login page above the shortcode:

```html
<div style="text-align:center; margin-bottom:20px;">
    <img src="/path/to/logo.png" alt="Pool Safe Inc" style="max-width:200px;">
</div>
[poolsafe_login]
```

---

## 🛡️ Security Features

- ✅ **Nonce validation** on all form submissions
- ✅ **HTTPS required** for Microsoft OAuth
- ✅ **Sanitized inputs** (username, password)
- ✅ **WordPress core authentication** (wp_signon)
- ✅ **Role-based access control**
- ✅ **OAuth 2.0 PKCE flow** for Microsoft
- ✅ **Remember me** uses secure cookies
- ✅ **CSRF protection** via WordPress nonces

---

## 🎨 Styling Details

### Colors

- **Microsoft Button:** #fff background, #5e5e5e text, #8c8c8c border
- **Microsoft Hover:** #f3f2f1 background
- **Primary Button:** #3b82f6 background
- **Primary Hover:** #2563eb background
- **Error Box:** #fee background, #c00 text

### Typography

- **Main Title:** 28px, bold
- **Section Titles:** 16px, semibold
- **Body Text:** 14px
- **Help Text:** 13px

### Spacing

- **Login Box Padding:** 40px
- **Section Margins:** 24px
- **Form Field Margins:** 16px

---

## 📱 Responsive Design

### Desktop (> 640px)
- Login box: 480px max-width
- Full padding: 40px
- Standard font sizes

### Mobile (≤ 640px)
- Login box: 100% width
- Reduced padding: 24px
- Slightly smaller fonts
- Stacked layout

---

## ✅ Testing Checklist

### Before Going Live

- [ ] Create login page with `[poolsafe_login]` shortcode
- [ ] Test Microsoft SSO (if configured):
  - [ ] Click "Sign in with Microsoft"
  - [ ] Authenticate with Outlook account
  - [ ] Verify redirect to admin dashboard
- [ ] Test Partner login:
  - [ ] Enter username and password
  - [ ] Click "Sign In"
  - [ ] Verify redirect to portal page
- [ ] Test "Remember me" checkbox
- [ ] Test error messages (wrong password)
- [ ] Test "Already logged in" message
- [ ] Test logout and re-login
- [ ] Test on mobile device
- [ ] Test with screen reader (accessibility)

### Configuration Tests

**If Microsoft OAuth configured:**
```bash
# Verify settings exist
wp option get psp_hybrid_email_settings

# Check for tenant_id, client_id, client_secret
```

**Check login page exists:**
```bash
# Via WordPress admin
Pages → All Pages → Look for "Portal Login"

# Via WP-CLI
wp post list --post_type=page --name=portal-login
```

---

## 🚀 Deployment

### Option 1: Manual Setup

1. Upload plugin ZIP to WordPress
2. Activate plugin
3. Create login page with shortcode
4. Configure Microsoft OAuth (optional)
5. Test both authentication methods
6. Update menu links to point to `/portal-login`

### Option 2: Programmatic Setup

```php
// Add to theme's functions.php or custom plugin

// Create login page programmatically
function create_portal_login_page() {
    // Check if page already exists
    $page = get_page_by_path('portal-login');
    
    if (!$page) {
        wp_insert_post([
            'post_title' => 'Portal Login',
            'post_name' => 'portal-login',
            'post_content' => '[poolsafe_login]',
            'post_status' => 'publish',
            'post_type' => 'page',
            'post_author' => 1,
        ]);
    }
}
add_action('after_switch_theme', 'create_portal_login_page');
```

---

## 🔍 Troubleshooting

### Issue: Microsoft button not showing

**Cause:** Microsoft Graph OAuth not configured

**Solution:**
1. Go to Pool Safe → Email → Microsoft Graph
2. Enter Tenant ID, Client ID, Client Secret
3. Save settings
4. Reload login page

### Issue: Microsoft login fails with "Invalid redirect URI"

**Cause:** Redirect URI mismatch in Azure AD

**Solution:**
1. Go to Azure Portal → App Registrations
2. Check redirect URI matches exactly:
   ```
   https://yoursite.com/wp-admin/admin-post.php?action=psp_graph_oauth_start
   ```
3. Remove trailing slashes
4. Ensure HTTPS (not HTTP)

### Issue: Partners can't login

**Cause:** User account doesn't exist or wrong role

**Solution:**
1. Go to Users → All Users
2. Check user exists
3. Check user role is `psp_partner`
4. Reset password if needed

### Issue: Redirect goes to wrong page

**Cause:** Hardcoded redirect URLs

**Solution:**
1. Check line ~320 in `class-psp-frontend.php`
2. Update `home_url('/portal')` to your portal page slug
3. Clear cache

---

## 📚 Related Documentation

- **Azure AD Setup:** See `UPDATE-GUIDE.md` section 2.A
- **All Shortcodes:** See `SHORTCODES-REFERENCE.md`
- **Testing Guide:** See `INTEGRATION-TEST-PLAN.md` section 1
- **Configuration Check:** Run `php check-config.php`

---

## 💡 Tips & Best Practices

1. **Use HTTPS:** Microsoft OAuth requires SSL/TLS
2. **Test Both Methods:** Verify Microsoft SSO and username/password work
3. **Clear Cache:** After configuration changes, clear browser cache
4. **Mobile Testing:** Test login page on phones/tablets
5. **Accessibility:** Ensure keyboard navigation works (Tab through forms)
6. **Error Handling:** Test invalid credentials to verify error messages
7. **Session Management:** Test "Remember me" and logout functionality
8. **Role Assignment:** Ensure partners have `psp_partner` role, not `subscriber`

---

## 🎓 Example Login Page Content

### Full-Width Page with Logo

```html
<!-- Add to Portal Login page content -->

<div style="max-width:500px; margin:0 auto;">
    <div style="text-align:center; margin-bottom:30px;">
        <img src="/wp-content/uploads/2025/11/poolsafe-logo.png" 
             alt="Pool Safe Inc" 
             style="max-width:250px; height:auto;">
    </div>
    
    [poolsafe_login]
    
    <div style="text-align:center; margin-top:30px; color:#6b7280; font-size:13px;">
        <p><strong>Need an account?</strong><br>
        Contact your Pool Safe representative.</p>
        
        <p><strong>Forgot your password?</strong><br>
        <a href="/wp-login.php?action=lostpassword" style="color:#3b82f6;">Reset Password</a></p>
    </div>
</div>
```

---

**Plugin Version:** 1.3.0  
**Shortcode:** `[poolsafe_login]`  
**File:** `includes/class-psp-frontend.php` (lines 274-412)  
**CSS:** `assets/css/portal.css` (lines 48-111)
