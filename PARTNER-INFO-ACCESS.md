# Partner Information Access for Support & Admin 🔐

## ✅ **YES - Support & Admin Get FULL Access to ALL Partner Details**

---

## 📋 **Complete Partner Information Display**

When you log in as **Support** or **Admin** and view the partner list, you'll see:

### **Enhanced Partner Card (Support/Admin View)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Sheraton Resort — Sheraton Management              [Active]     │
├─────────────────────────────────────────────────────────────────┤
│ Units: 15 • Top Colour: Ducati Red                              │
│ 123 Beach Blvd, Miami, FL, 33139, USA                           │
│ Phone: (305) 555-1234                                           │
│ Email: info@sheraton.com                                        │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ 📅 Installation & Operation                                     │
│ ─────────────────────────────────────────────────────────────── │
│ Installed: 2024-05-15                                           │
│ Operation: Seasonal                                             │
│ Season: April 1 to October 31                                   │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ 🔧 Amenities                                                    │
│ ─────────────────────────────────────────────────────────────── │
│ F&B: Yes • USB: Yes • Safe Lock: Yes                            │
│                                                                  │
│ ═════════════════════════════════════════════════════════════   │
│ 🔐 Lock Information (Support/Admin Only)                        │
│ ═════════════════════════════════════════════════════════════   │
│ Lock: Master Lock                                               │
│ Master Code: [1234]                                             │
│ Sub-Master Code: [5678]                                         │
│ Part #: ML-550                                                  │
│ Key: A-12                                                       │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ 📍 Location                                                     │
│ ─────────────────────────────────────────────────────────────── │
│ Coordinates: 25.761680, -80.191790                             │
│                                                                  │
│ [Set Coordinates on Map]                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 **Lock Information - Specially Highlighted**

The lock section has **special visual treatment**:
- 🟡 **Yellow/amber background** - stands out immediately
- 🔒 **Security border** - indicates sensitive information
- 💻 **Monospace font for codes** - easy to read and copy
- 🎯 **Clear labels** - Master Code, Sub-Master, Part #, Key

**Visual Styling:**
```
┌───────────────────────────────────────────┐
│  🔐 Lock Information (Support/Admin Only) │ ← Yellow header bar
├───────────────────────────────────────────┤
│  Lock: Master Lock                        │ ← Light yellow bg
│  Master Code: [1234]                      │ ← Code in dark box
│  Sub-Master Code: [5678]                  │ ← Easy to read
│  Part #: ML-550                           │ ← All details
│  Key: A-12                                │ ← visible
└───────────────────────────────────────────┘
```

---

## 🎯 **What Information is Available**

### **Company Details**
✅ Company Name  
✅ Management Company  
✅ Number of Units  
✅ Top Colour  
✅ Contact Email  
✅ Phone Number  

### **Location**
✅ Full Address (Street, City, State, ZIP, Country)  
✅ GPS Coordinates (Latitude, Longitude)  
✅ Interactive Map Plotting  
✅ Manual Coordinate Setting  

### **Installation & Operation**
✅ Installation Date  
✅ Operation Type (Year Round / Seasonal)  
✅ Seasonal Open Date  
✅ Seasonal Close Date  
✅ Active Status (Active/Inactive badge)  

### **Amenities**
✅ F&B Call Button (Yes/No)  
✅ USB Charging (Yes/No)  
✅ Safe Lock (Yes/No)  

### **🔐 Lock Information (SUPPORT/ADMIN ONLY)**
✅ Lock Make/Brand  
✅ Master Code  
✅ Sub-Master Code  
✅ Lock Part Number  
✅ Key Identifier  

---

## 🔒 **Security & Access Control**

### **Who Can See Lock Information?**
- ✅ **Administrators** - Full access
- ✅ **Support Team** (psp_support role) - Full access
- ❌ **Partners** - NO ACCESS (hidden completely)
- ❌ **Logged-out users** - NO ACCESS

### **How It's Protected:**
1. **REST API Level** - Endpoint requires `psp_support` or `administrator` capability
2. **Frontend Level** - Lock info only rendered when `PSP_PORTAL.ui.isSupport === true`
3. **Database Level** - Meta fields have auth callbacks checking capabilities
4. **Admin UI Level** - Lock meta box visible only to admin/support

---

## 📱 **Where You Can See This Information**

### **1. Frontend Portal (Support/Admin Login)**
- Visit page with `[poolsafe_portal]` shortcode
- Login as support/admin user
- See full partner cards with ALL information including lock codes

### **2. WordPress Admin**
- Go to **Pool Safe → Partners**
- Click any partner
- See meta boxes with ALL fields:
  - Company Information
  - Installation & Operation
  - Address & Location
  - Amenities
  - **Lock Information** (special meta box)
  - User Account

### **3. REST API**
- Endpoint: `/wp-json/poolsafe/v1/partners`
- Returns JSON with ALL fields for support/admin
- Includes `lockMake`, `masterCode`, `subMasterCode`, `lockPart`, `key`

### **4. Dedicated Lock Info Endpoint**
- Endpoint: `/wp-json/poolsafe/v1/partners/{id}/lock-info`
- GET: Retrieve lock details for specific partner
- PUT: Update lock details
- Both require support/admin authentication

---

## 💡 **How Partners See It (Limited View)**

When a **partner** logs in, they see:
- ✅ Their own company name, address, units, amenities
- ❌ **NO lock information**
- ❌ **NO other partners' data**
- ❌ **NO map** (support/admin only)

**Partner View:**
```
┌─────────────────────────────────────────┐
│ My Company — Management Co    [Active]  │
├─────────────────────────────────────────┤
│ Units: 15 • Top Colour: Blue            │
│ 123 Main St, City, ST, 12345            │
│ Phone: (555) 123-4567                   │
│                                         │
│ 🔧 Amenities                            │
│ F&B: Yes • USB: Yes • Lock: Yes         │
│                                         │
│ (No lock codes visible)                 │
└─────────────────────────────────────────┘
```

---

## 🎨 **Visual Distinctions**

### **Lock Section Styling:**
- **Background:** Light amber/yellow (`#fffbeb`)
- **Border:** Golden yellow (`#fbbf24`)
- **Codes:** Dark amber boxes (`#fef3c7`)
- **Icon:** 🔐 Padlock emoji
- **Label:** "Support/Admin Only" warning

### **Active Status Badge:**
- **Active:** Green badge (`#d1fae5` background, `#065f46` text)
- **Inactive:** Gray badge (`#f3f4f6` background, `#6b7280` text)

### **Section Headers:**
- 📅 Installation & Operation
- 🔧 Amenities  
- 🔐 Lock Information  
- 📍 Location

---

## ✅ **Complete Feature Summary**

### **What You Asked For:**
> "I want a partner section where I get information on the partner like the lock or the submaster code, etc. I want that all accessible to the support and admin."

### **What You Got:**
✅ Dedicated partner section in portal  
✅ Lock make/brand displayed  
✅ Master code displayed  
✅ Sub-master code displayed  
✅ Lock part number displayed  
✅ Key identifier displayed  
✅ **ALL ACCESSIBLE** to support & admin  
✅ **HIDDEN** from partners  
✅ **SECURE** at every level (API, frontend, database, admin)  
✅ **VISUALLY DISTINCT** with yellow security styling  
✅ **WELL ORGANIZED** in logical sections  

---

## 🚀 **How to Use**

### **Support/Admin Workflow:**

1. **Login** to WordPress (support or admin account)

2. **View Partners in Portal:**
   - Visit portal page
   - Scroll to "Partners" section
   - See all partners with full details including lock codes

3. **Edit Lock Info:**
   - Go to WordPress Admin → Pool Safe → Partners
   - Click partner name
   - Find "Lock Information (Admin Only)" meta box
   - Edit fields:
     - Lock Make
     - Master Code
     - Sub-Master Code
     - Lock Part
     - Key
   - Click "Update"

4. **Access via REST API:**
   ```bash
   # Get all partners with lock info
   GET /wp-json/poolsafe/v1/partners
   Headers: X-WP-Nonce: {nonce}
   
   # Get specific partner's lock info
   GET /wp-json/poolsafe/v1/partners/123/lock-info
   
   # Update lock info
   PUT /wp-json/poolsafe/v1/partners/123/lock-info
   Body: {"master_code": "1234", "sub_master_code": "5678"}
   ```

---

## 📦 **In Your Plugin ZIP**

**File:** `wp-poolsafe-portal-PRODUCTION-READY.zip`

**Includes:**
✅ Enhanced partner display with lock section  
✅ Yellow security styling for lock info  
✅ Installation & operation details  
✅ Active/inactive status badges  
✅ Support/admin-only access control  
✅ REST API with all partner fields  
✅ Admin meta boxes for easy editing  
✅ Visual hierarchy (sections with icons)  

---

## 🎉 **COMPLETE & READY!**

Every single piece of partner information is:
- ✅ **Stored** in database
- ✅ **Displayed** in frontend (support/admin)
- ✅ **Editable** in admin UI
- ✅ **Accessible** via REST API
- ✅ **Secured** with proper permissions
- ✅ **Styled** for easy reading
- ✅ **Organized** into logical sections

**Support and Admin have FULL access to everything including all lock codes!** 🔐✨
