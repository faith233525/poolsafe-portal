# Pool Safe Partner Portal - Quick Start Guide

**Welcome!** This guide will get you up and running in **5 minutes**.

---

## Step 1: Install the Plugin (2 minutes)

### Option A: Download from GitHub
1. Go to [GitHub Actions](https://github.com/faith233525/Wordpress-Pluggin/actions)
2. Click the latest successful "plugin-ci" run
3. Download the ZIP artifact

### Option B: From Your Computer
1. Locate the plugin ZIP file
2. Don't extract it - keep it as a ZIP

### Install
1. In WordPress Admin, go to **Plugins → Add New**
2. Click **Upload Plugin** (top of page)
3. Choose your ZIP file
4. Click **Install Now**
5. Click **Activate**

✅ **Done!** You'll see "Pool Safe" in your admin menu.

---

## Step 2: Basic Configuration (2 minutes)

### Configure the Map
1. Go to **Pool Safe → Settings**
2. The default map works great! But you can customize:
   - **Map Tile URL:** Leave default or use Mapbox/Google
   - **Attribution:** Leave default or customize
3. Click **Save Changes**

### Optional: Setup Email Notifications
1. Go to **Pool Safe → Email**
2. Check "Enable SMTP" if you want custom email server
3. Enter your SMTP details (Gmail, Outlook, etc.)
4. Or leave unchecked to use WordPress default email
5. Click **Save Changes**

### Optional: Connect HubSpot CRM
1. Go to **Pool Safe → HubSpot**
2. Enter your **HubSpot API Key** (from HubSpot private app)
3. Enter **Portal ID** (your HubSpot account ID)
4. Check auto-sync options if you want automatic syncing
5. Click **Save Changes**

---

## Step 3: Add Your Partners (1 minute)

### Option A: CSV Import (Bulk)
1. Go to **Pool Safe → Import**
2. Download the **sample CSV template** (see below)
3. Fill in your partners' data in Excel/Google Sheets
4. For topColour, use only: `Ducati Red`, `Classic Blue`, `Ice Blue`, `Yellow`, or `Custom`
5. Upload the CSV
6. Click **Dry Run** to check for errors
7. Click **Import** to add partners

### Option B: Manual Entry
1. Go to **Pool Safe → Partners → Add New**
2. Fill in:
   - Title (company name)
   - Location (address, city, state, zip)
   - Map coordinates (latitude, longitude)
   - Units, color, amenities
3. Upload gallery images/videos in sidebar
4. Click **Publish**

---

## Step 4: Add the Portal to Your Site (30 seconds)

1. Create a new page: **Pages → Add New**
2. Give it a title like "Partner Portal" or "Support Portal"
3. Add this shortcode in the content:
   ```
   [poolsafe_portal]
   ```
4. Click **Publish**
5. View the page (users must be logged in to see it)

✅ **That's it!** Your portal is live!

---

## What Your Users See

### Partners
- View partner map with locations
- See their own partner info
- Create support tickets
- View notifications

### Support Staff
- Everything partners can do, PLUS:
- Edit any partner or ticket
- View lock information (master codes, keys)
- Create calendar events
- Manage service records

### Administrators
- Full access to everything
- Settings configuration
- CSV import
- HubSpot sync
- Email configuration

---

## Customizing the Look

### Easy Way (No Code)
1. The plugin inherits your theme's styles automatically
2. Change your theme's colors/fonts and the portal updates

### Custom CSS (Advanced)
1. Go to **Appearance → Customize → Additional CSS**
2. Add custom styles:
   ```css
   .psp-portal {
       background: #f5f5f5;
       padding: 20px;
   }
   .psp-map {
       border: 2px solid #0073aa;
       border-radius: 8px;
   }
   ```

---

## Sample CSV Template

Save this as `partners.csv`:

```csv
companyName,managementCompany,streetAddress,city,state,zip,country,numberOfLoungeUnits,topColour,latitude,longitude,has_fb_call_button,has_usb_charging,has_safe_lock,company_email
"Comfort Solutions Inc","Pool Management LLC","123 Main St","Austin","TX","78701","USA",24,"Ice Blue",30.2672,-97.7431,1,1,1,"contact@comfort.com"
"Luxury Resort & Spa","Resort Group Inc","456 Ocean Drive","Miami","FL","33139","USA",18,"Classic Blue",25.7617,-80.1918,1,1,0,"info@luxuryresort.com"
"Downtown Hotel","City Hotels","789 Broadway","New York","NY","10003","USA",12,"Ducati Red",40.7128,-74.0060,0,1,1,"support@downtownhotel.com"
```

### CSV Column Reference
- **companyName** (required): Company name (becomes the title)
- **managementCompany**: Parent company
- **streetAddress, city, state, zip, country**: Address
- **numberOfLoungeUnits**: Number of LounGenie units
- **topColour**: One of: `Ducati Red`, `Classic Blue`, `Ice Blue`, `Yellow`, or `Custom` (any other value will be treated as Custom)
- **latitude, longitude**: Map coordinates (optional; you can set from the map later)
- **has_fb_call_button**: 1 = yes, 0 = no
- **has_usb_charging**: 1 = yes, 0 = no
- **has_safe_lock**: 1 = yes, 0 = no
- **company_email**: Contact email
- **phone_number**: Main phone number (digits only preferred)
- **lock_make, master_code, sub_master_code, lock_part, key**: Lock details (visible only to Support/Admin)

Optional (for creating users separately):
- You can create WordPress users via Users → Add New. If you want a CSV-based user import, tell us and we’ll wire it up to accept: `user_login`, `user_email`, `display_name`, `role` (e.g., `psp_partner`), and optional `user_pass`. 

---

## Common Questions

### Q: Users see "Please sign in to access the Portal"
**A:** The shortcode requires users to be logged in. Create WordPress user accounts for your partners.

### Q: Map doesn't show partners
**A:** Make sure partners have valid latitude and longitude coordinates.

### Q: Email notifications not working
**A:** Check your SMTP settings or use a plugin like WP Mail SMTP to test your email configuration.

### Q: Can I change the colors?
**A:** Yes! Use Appearance → Customize → Additional CSS or edit your theme.

### Q: Can partners upload their own gallery images?
**A:** Only admins can edit partner galleries by default. To allow partners, give them the `edit_psp_partner` capability.

### Q: Does it work with page builders (Elementor, Divi)?
**A:** Yes! Just add the `[poolsafe_portal]` shortcode using the page builder's shortcode widget.

---

## Need Help?

1. **Check the full README.md** for detailed documentation
2. **View FEATURE-AUDIT.md** for complete feature list
3. **Contact support:** support@poolsafeinc.com

---

## Pro Tips 🚀

1. **Create user accounts** for your partners before they access the portal
2. **Test on staging** before going live
3. **Use dry-run** when importing CSVs to catch errors
4. **Enable HubSpot auto-sync** to keep your CRM up to date
5. **Add gallery videos** to showcase partner locations
6. **Set up calendar events** for scheduled maintenance
7. **Use service records** to track technician visits

---

**You're all set!** Enjoy your Pool Safe Partner Portal! 🎉
