# Microsoft Outlook Login Troubleshooting

## ❌ Problem: "I tried to login with company email - it didn't work"

---

## ✅ Solution: Azure AD Setup Required (100% FREE)

The Microsoft/Outlook authentication is **completely free** - no API costs. However, it requires a **one-time Azure AD configuration**.

---

## 🎯 Current Status Check

### Is Microsoft OAuth Configured?

**Option 1: Check in WordPress**
1. Login to WordPress admin
2. Go to **Pool Safe → Email → Microsoft Graph**
3. Check if these fields have values:
   - Tenant ID: `________` (should be filled)
   - Client ID: `________` (should be filled)
   - Client Secret: `********` (should be filled)

**Option 2: Run Configuration Checker**
```powershell
cd wordpress-plugin/wp-poolsafe-portal
php check-config.php
```

Look for this section:
```
1. Microsoft Graph (Outlook) Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Azure AD Tenant ID configured
✓ Client ID configured  
✓ Client Secret configured
```

---

## 🔧 What You Need to Do

### If Microsoft OAuth is NOT Configured:

The "Sign in with Microsoft" button **won't work** until you complete these steps:

### Step 1: Set Up Azure AD (One-Time, FREE)

**Required:** Microsoft 365 Business account (you already have this for your company email)

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com
   - Sign in with your Microsoft 365 admin account

2. **Create App Registration**
   - Click **Azure Active Directory** (left menu)
   - Click **App registrations**
   - Click **+ New registration**
   
3. **Fill in Details:**
   ```
   Name: Pool Safe Portal
   
   Supported account types: 
   ● Accounts in this organizational directory only
   
   Redirect URI:
   Platform: Web
   URL: https://your-wordpress-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback
   ```
   
   ⚠️ **IMPORTANT:** Replace `your-wordpress-site.com` with your actual domain!
   
4. **Click "Register"**

### Step 2: Get Your Credentials

After registration, you'll see the **Overview** page:

1. **Copy Application (client) ID**
   ```
   Example: a1b2c3d4-e5f6-7890-abcd-1234567890ab
   ```

2. **Copy Directory (tenant) ID**
   ```
   Example: 9876fedc-ba09-8765-4321-0fedcba98765
   ```

### Step 3: Create Client Secret

1. Click **Certificates & secrets** (left menu)
2. Click **+ New client secret**
3. Description: `Pool Safe Portal Secret`
4. Expires: **24 months** (or Never)
5. Click **Add**
6. **⚠️ COPY THE VALUE IMMEDIATELY** (you won't see it again!)
   ```
   Example: abc123def456ghi789jkl012mno345pqr678stu~901
   ```

### Step 4: Set API Permissions

1. Click **API permissions** (left menu)
2. Click **+ Add a permission**
3. Click **Microsoft Graph**
4. Click **Delegated permissions**
5. Search and check these permissions:
   - ☑ `Mail.Send`
   - ☑ `offline_access`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Click **Yes** to confirm

### Step 5: Configure in WordPress

1. Login to WordPress admin
2. Go to **Pool Safe → Email → Microsoft Graph**
3. Paste the values you copied:
   ```
   Tenant ID: [paste Directory tenant ID]
   Client ID: [paste Application client ID]
   Client Secret: [paste secret value]
   ```
4. Click **Save Settings**

### Step 6: Test the Login

1. Go to your login page: `https://your-site.com/portal-login`
2. You should now see the **"Sign in with Microsoft"** button
3. Click it
4. Sign in with your company email (e.g., `you@poolsafeinc.com`)
5. Grant permissions
6. You'll be redirected back and logged in!

---

## 💡 Understanding the Two Login Methods

### Method 1: Microsoft/Outlook (For Support Staff)
- **Requires:** Azure AD setup (above steps)
- **Uses:** Company email (@poolsafeinc.com)
- **Purpose:** Support agents can use their work email
- **Cost:** FREE (included with Microsoft 365)

### Method 2: Username/Password (For Partners)
- **Requires:** WordPress user account
- **Uses:** Username or email + password
- **Purpose:** Partner companies use their credentials
- **Cost:** FREE (built into WordPress)

---

## 🚨 Common Issues

### Issue 1: "Sign in with Microsoft" button doesn't appear

**Cause:** Azure AD not configured in WordPress

**Fix:** Complete Steps 1-5 above

---

### Issue 2: Button appears but clicking gives error

**Cause:** Redirect URI mismatch

**Fix:**
1. Go to Azure Portal → App registrations → Your app
2. Click **Authentication** (left menu)
3. Check redirect URI **exactly matches**:
   ```
   https://yoursite.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback
   ```
4. No extra slashes or spaces
5. Must use HTTPS (not HTTP)

---

### Issue 3: "AADSTS50011: The redirect URI does not match"

**Fix:**
1. Check for www vs non-www:
   - If your site is `www.poolsafeinc.com`, use that
   - If your site is `poolsafeinc.com`, use that (without www)
2. Update redirect URI in Azure AD to match exactly

---

### Issue 4: Can't access Azure Portal

**Cause:** You need admin rights on Microsoft 365

**Fix:**
- Ask your IT administrator to:
  - Give you "Application Administrator" role, OR
  - Complete the Azure AD setup for you

---

### Issue 5: Partner login doesn't work

**Cause:** Different issue - partners use username/password

**Fix:**
1. Go to **Users → All Users** in WordPress
2. Check if user exists
3. Check user role is `psp_partner`
4. Click **Edit** → **Generate password** → Send to partner
5. Partner uses that username + password on login page

---

## 📊 Quick Decision Tree

```
❓ What type of user are you?

├─ 👨‍💼 Support Staff (work email @poolsafeinc.com)
│   │
│   ├─ Want to use Microsoft SSO?
│   │   └─ YES → Set up Azure AD (Steps 1-5 above)
│   │
│   └─ Want to use username/password?
│       └─ Use WordPress account (no Azure setup needed)
│
└─ 🏢 Partner (company credentials)
    └─ Always use username/password
        └─ Get credentials from Pool Safe admin
```

---

## ✅ Checklist: Before Testing Login

- [ ] Azure AD app created in Azure Portal
- [ ] Redirect URI configured (exact match)
- [ ] API permissions granted (Mail.Send, offline_access)
- [ ] Admin consent clicked
- [ ] Tenant ID copied to WordPress
- [ ] Client ID copied to WordPress
- [ ] Client Secret copied to WordPress
- [ ] Settings saved in WordPress
- [ ] Login page exists (`/portal-login`)
- [ ] Site uses HTTPS (SSL certificate installed)

---

## 🎓 Video Tutorial Alternative

If you prefer visual instructions:

1. **Search YouTube:** "Azure AD app registration tutorial"
2. **Look for:** Microsoft 365 SSO setup guides
3. **Follow along** using the values above

---

## 💰 Cost Breakdown

| Item | Cost |
|------|------|
| Azure AD App Registration | **FREE** |
| Microsoft Graph API | **FREE** |
| OAuth 2.0 Authentication | **FREE** |
| Mail.Send permission | **FREE** |
| WordPress Plugin | **FREE** |

**Total: $0.00** - No API fees, no subscription required!

(You only need your existing Microsoft 365 subscription)

---

## 🆘 Still Not Working?

### Option 1: Use Configuration Checker
```powershell
cd wordpress-plugin/wp-poolsafe-portal
php check-config.php
```

This will tell you exactly what's missing.

### Option 2: Check Debug Log

1. Enable WordPress debugging:
   ```php
   // In wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```

2. Try logging in again

3. Check log file:
   ```
   wp-content/debug.log
   ```

### Option 3: Contact Support

If you're stuck, share these details:
- What error message you see (screenshot)
- Output from `php check-config.php`
- Which login method you're trying (Microsoft or username/password)

---

## 📚 Related Guides

- **Full Azure AD Setup:** See `UPDATE-GUIDE.md` section 2.A
- **Login Page Setup:** See `LOGIN-PAGE-SETUP.md`
- **All Integrations:** See `INTEGRATION-TEST-PLAN.md`

---

**Last Updated:** November 12, 2025  
**Plugin Version:** 1.3.0
