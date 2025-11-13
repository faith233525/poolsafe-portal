# Quick Deployment Guide - Production Ready

## ✅ Your Plugin is Pre-Configured and Ready!

All credentials have been prepared. Just follow these 3 simple steps:

---

## Step 1: Add Credentials to WordPress (2 minutes)

### Option A: wp-config.php (Recommended - Fully Automated)

1. **Access your WordPress site files** via FTP/cPanel File Manager
2. **Open `wp-config.php`** (in root directory)
3. **Find this line:**
   ```php
   /* That's all, stop editing! Happy publishing. */
   ```
4. **Add ABOVE that line:**
   ```php
   // PoolSafe Portal Auto-Configuration
   define('PSP_AZURE_CLIENT_ID', 'your-azure-client-id');
   define('PSP_AZURE_CLIENT_SECRET', 'your-azure-client-secret');
   define('PSP_AZURE_TENANT_ID', 'your-azure-tenant-id');
   define('PSP_HUBSPOT_API_KEY', 'pat-na1-your-hubspot-api-key');
   define('PSP_HUBSPOT_PORTAL_ID', 'your-portal-id');
   ```
5. **Save file**

**What happens:** Plugin auto-imports credentials on activation, encrypts them, stores in database.

**Security:** You can remove these constants after first activation (they'll already be encrypted in database).

### Option B: Manual Setup (No wp-config.php editing)

Skip to Step 2 and paste credentials manually in Setup Wizard.

---

## Step 2: Upload & Activate Plugin (1 minute)

### Download Plugin ZIP:

The plugin is in: `wordpress-plugin/wp-poolsafe-portal/`

**Create ZIP:**
```powershell
# Already in this directory
Compress-Archive -Path * -DestinationPath ../wp-poolsafe-portal.zip -Force
```

### Upload to WordPress:

1. **WordPress Admin** → Plugins → Add New
2. **Upload Plugin** button
3. **Choose File** → `wp-poolsafe-portal.zip`
4. **Install Now**
5. **Activate**

### What Happens:

✅ Auto-redirected to Setup Wizard  
✅ Credentials auto-imported (if using wp-config.php)  
✅ Email token auto-generated  
✅ Success notice displayed  

---

## Step 3: Complete Setup Wizard (5-10 minutes)

### Tab 1: Email Configuration

**Provider:** Microsoft Outlook (Power Automate)

1. **Copy webhook URLs** (click copy buttons)
2. **Follow:** `OUTLOOK-EMAIL-SETUP.md` (complete Power Automate flow setup)
3. **Save Settings**

### Tab 2: Azure AD

**If using wp-config.php:** Already filled! Just verify values.

**If manual setup:** Paste your credentials from Azure Portal

**Important:**
1. **Copy Redirect URI** from wizard
2. **Add to Azure Portal:**
   - Go to [Azure Portal](https://portal.azure.com)
   - App Registrations → Your App → Authentication
   - Add redirect URI (Web platform)
   - Save

3. **Test Connection** (click button in wizard)

### Tab 3: HubSpot

**If using wp-config.php:** Already filled!

**If manual setup:** Paste your credentials from HubSpot Settings

**Settings:**
- ✅ Enable Sync
- Frequency: Realtime

**Test Connection** (click button)

### Tab 4: Summary

Review status cards:
- ✅ Email Configured
- ✅ Azure AD Configured
- ✅ HubSpot Configured

**Mark Setup as Complete**

---

## Step 4: Configure External Systems

### A. Azure AD Redirect URI

**Already covered in Tab 2 above** ✓

### B. Power Automate Flow

**Complete guide:** `OUTLOOK-EMAIL-SETUP.md`

**Quick steps:**
1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Create flow: "When a new email arrives"
3. Add HTTP action with webhook URL from wizard
4. Save and test

**Time:** 15 minutes  
**Difficulty:** Easy (visual flow builder)

### C. HubSpot Custom Properties

**Auto-created on first sync!** Just enable sync and click "Sync Now" in WordPress.

---

## Step 5: Test Everything (10 minutes)

### Test 1: Azure AD Login
1. Open incognito browser
2. Go to: `https://yoursite.com/wp-login.php`
3. Should see "Login with Microsoft" button
4. Click → redirects to Microsoft → login → redirected back to WordPress
5. ✅ Logged in as support user

### Test 2: HubSpot Sync
1. WordPress Admin → Pool Safe → HubSpot Sync
2. Click "Pool Safe → HubSpot" (Sync Now)
3. Check HubSpot CRM → Companies
4. ✅ All companies synced with custom properties

### Test 3: Email-to-Ticket
1. Send email to support address
2. Check Power Automate flow history (should show success)
3. Check WordPress Admin → Tickets
4. ✅ Ticket created with correct partner

### Test 4: Email Response Tracking
1. Reply to ticket from Outlook
2. Check ticket in WordPress
3. ✅ Comment added with "via: outlook"

---

## Step 6: Import Partner Data

### Bulk Import (Recommended)

**File:** CSV or Excel with columns:
- `company_name` (required)
- `company_email` (required - for auto-matching)
- `psp_contact_name`
- `psp_address`
- `psp_phone`
- `user_login` (optional - creates user account)
- `user_email` (optional)
- `user_pass` (optional - plain text, will be hashed)

**Upload:**
1. WordPress Admin → Pool Safe → Import
2. Choose CSV/Excel file
3. Map columns
4. Import (creates companies + users in one go)

---

## Step 7: Go Live! 🚀

### Final Checklist:

- [ ] Plugin activated
- [ ] Setup wizard completed
- [ ] Azure AD login tested
- [ ] HubSpot sync tested
- [ ] Power Automate flow created and tested
- [ ] Email-to-ticket tested
- [ ] Email response tracking tested
- [ ] Partner companies imported
- [ ] Test user can login and create ticket
- [ ] Support user can login via Microsoft SSO
- [ ] Support user can respond via portal
- [ ] Support user can respond via Outlook (tracked)

### Monitor First 24 Hours:

- Check WordPress debug.log for PHP errors
- Check Power Automate flow history
- Check ticket creation and responses
- Check HubSpot sync logs

---

## Need Help?

### Documentation:
- **Setup Wizard:** `SETUP-WIZARD-GUIDE.md`
- **Azure AD:** `AZURE-AD-SETUP.md`
- **HubSpot:** `HUBSPOT-SETUP.md`
- **Outlook:** `OUTLOOK-EMAIL-SETUP.md`
- **Email-to-Ticket:** `EMAIL-TO-TICKET-SETUP.md`
- **Go-Live Checklist:** `GO-LIVE-CHECKLIST.md`

### Troubleshooting:

**Setup wizard not showing?**
- Clear browser cache
- Check WordPress → PoolSafe Setup menu

**Credentials not auto-imported?**
- Check wp-config.php (constants defined correctly?)
- Check WordPress error log
- Manually paste in Setup Wizard

**Azure AD login not working?**
- Verify redirect URI in Azure Portal
- Test connection in Setup Wizard
- Check Tenant ID is correct

**HubSpot sync failing?**
- Test connection in Setup Wizard
- Check API key has correct scopes (crm.objects.companies.write)
- Verify Portal ID is 8 digits

**Email-to-ticket not working?**
- Check Power Automate flow history (errors?)
- Verify webhook URL includes token
- Test webhook URL directly (Postman/curl)

---

## Summary

**Total Setup Time:** 20-30 minutes  
**Current Status:** ✅ Ready for deployment  
**Credentials:** ✅ Pre-configured  
**Documentation:** ✅ Complete  
**Testing:** Ready to test after activation  

**Next Action:** Upload plugin ZIP → Activate → Complete Setup Wizard → Go live!

🎉 **You're all set!**
