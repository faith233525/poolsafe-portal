# Pool Safe Portal v1.3.0 - Complete Page Setup Guide

**Version:** 1.3.0  
**Date:** November 12, 2025  
**Purpose:** Reference guide for creating WordPress pages with proper shortcodes

---

## 📄 Required Pages & Shortcodes

Create the following pages in WordPress (Pages → Add New):

### 1. **Login** (Public Page)
- **Page Title:** `Login` or `Portal Login`
- **Page Slug:** `login` or `portal-login`
- **Shortcode:** `[poolsafe_login]`
- **Who sees it:** Public (not logged in users)
- **What it does:** Two-column login (Microsoft for Support, Username/Password for Partners)
- **Template:** Full Width (recommended)

---

### 2. **Dashboard** (After Login - Home)
- **Page Title:** `Dashboard` or `Portal Dashboard`
- **Page Slug:** `portal` or `dashboard`
- **Shortcode:** `[poolsafe_dashboard]`
- **Who sees it:** All logged-in users
- **What it does:** Overview with quick stats, recent activity, notifications widget
- **Set as:** Redirect target after login
- **Template:** Full Width

---

### 3. **Partners** (Tab 1)
- **Page Title:** `Partners` or `Partner Companies`
- **Page Slug:** `partners`
- **Shortcode:** `[poolsafe_partners]`
- **Who sees it:** All logged-in users
- **What it does:** List of all partner companies
- **Template:** Full Width

---

### 4. **Tickets** (Tab 2)
- **Page Title:** `Tickets` or `Support Tickets`
- **Page Slug:** `tickets`
- **Shortcode:** `[poolsafe_tickets]`
- **Who sees it:** All logged-in users
- **What it does:** Create and manage support tickets with filters
- **Template:** Full Width

---

### 5. **Service Records** (Tab 3)
- **Page Title:** `Service Records` or `Service History`
- **Page Slug:** `service-records`
- **Shortcode:** `[poolsafe_service_records]`
- **Who sees it:** All logged-in users
- **What it does:** Service timeline with load-more pagination
- **Template:** Full Width

---

### 6. **Knowledge Base** (Tab 4)
- **Page Title:** `Knowledge Base` or `Help Center`
- **Page Slug:** `knowledge-base` or `kb`
- **Shortcode:** `[poolsafe_kb]`
- **Who sees it:** All logged-in users
- **What it does:** Searchable articles and guides
- **Template:** Full Width

---

### 7. **Calendar** (Tab 5 - Optional)
- **Page Title:** `Calendar` or `Events`
- **Page Slug:** `calendar` or `events`
- **Shortcode:** `[poolsafe_calendar]`
- **Who sees it:** All logged-in users
- **What it does:** Scheduled events and appointments
- **Template:** Full Width

---

### 8. **Notifications** (Tab 6 - Optional)
- **Page Title:** `Notifications` or `Alerts`
- **Page Slug:** `notifications`
- **Shortcode:** `[poolsafe_notifications]`
- **Who sees it:** All logged-in users
- **What it does:** System notifications and updates
- **Template:** Full Width

---

### 9. **Support Tools** (Admin Only - Tab 7)
- **Page Title:** `Support Tools` or `Admin Tools`
- **Page Slug:** `admin-tools` or `support-tools`
- **Shortcode:** `[poolsafe_support_tools]` or `[poolsafe_tools]`
- **Who sees it:** Support/Admin only
- **What it does:** Branding colors, partner lock editing, CSV import
- **Template:** Full Width
- **Access Control:** Add this to page settings or use a membership plugin

---

### 10. **User Management** (Admin Only - Tab 8)
- **Page Title:** `User Management` or `Manage Users`
- **Page Slug:** `user-management` or `users`
- **Shortcode:** `[poolsafe_user_management]` or `[poolsafe_users]`
- **Who sees it:** Support/Admin only
- **What it does:** Create partner/support accounts, view existing users
- **Template:** Full Width
- **Access Control:** Add restriction to support/admin roles only

---

### 11. **Map** (Admin Only - Optional)
- **Page Title:** `Partner Map` or `Locations`
- **Page Slug:** `map` or `locations`
- **Shortcode:** `[poolsafe_map]`
- **Who sees it:** Support/Admin only
- **What it does:** Interactive map with partner markers
- **Template:** Full Width

---

## 🎯 Recommended Tab Structure

### **For Partner Users (8 Tabs):**
1. 📊 Dashboard
2. 🏢 Partners
3. 🎫 Tickets
4. 📋 Service Records
5. 📚 Knowledge Base
6. 📅 Calendar
7. 🔔 Notifications
8. 🔐 Logout

### **For Support/Admin Users (10 Tabs):**
1. 📊 Dashboard
2. 🏢 Partners
3. 🎫 Tickets
4. 📋 Service Records
5. 📚 Knowledge Base
6. 📅 Calendar
7. 🔔 Notifications
8. 🔧 Support Tools
9. 👥 User Management
10. 🗺️ Map

---

## 📝 Quick Page Creation Checklist

### Step 1: Create Login Page
```
Title: Login
Slug: login
Content: [poolsafe_login]
Template: Full Width
Publish
```

### Step 2: Create Dashboard
```
Title: Dashboard
Slug: portal
Content: [poolsafe_dashboard]
Template: Full Width
Publish
```

### Step 3: Create Partner Pages (Tabs)
For each tab, follow this pattern:

**Partners:**
```
Title: Partners
Slug: partners
Content: [poolsafe_partners]
Template: Full Width
Publish
```

**Tickets:**
```
Title: Tickets
Slug: tickets
Content: [poolsafe_tickets]
Template: Full Width
Publish
```

**Service Records:**
```
Title: Service Records
Slug: service-records
Content: [poolsafe_service_records]
Template: Full Width
Publish
```

**Knowledge Base:**
```
Title: Knowledge Base
Slug: knowledge-base
Content: [poolsafe_kb]
Template: Full Width
Publish
```

**Calendar:**
```
Title: Calendar
Slug: calendar
Content: [poolsafe_calendar]
Template: Full Width
Publish
```

**Notifications:**
```
Title: Notifications
Slug: notifications
Content: [poolsafe_notifications]
Template: Full Width
Publish
```

### Step 4: Create Admin-Only Pages

**Support Tools:**
```
Title: Support Tools
Slug: admin-tools
Content: [poolsafe_support_tools]
Template: Full Width
Publish
Set restriction to: Administrator, PSP Support roles only
```

**User Management:**
```
Title: User Management
Slug: user-management
Content: [poolsafe_user_management]
Template: Full Width
Publish
Set restriction to: Administrator, PSP Support roles only
```

**Map (Optional):**
```
Title: Partner Map
Slug: map
Content: [poolsafe_map]
Template: Full Width
Publish
Set restriction to: Administrator, PSP Support roles only
```

---

## 🔗 Page URLs Reference

After creating pages, your URLs will be:

| Page | URL | Shortcode |
|------|-----|-----------|
| Login | `https://yoursite.com/login` | `[poolsafe_login]` |
| Dashboard | `https://yoursite.com/portal` | `[poolsafe_dashboard]` |
| Partners | `https://yoursite.com/partners` | `[poolsafe_partners]` |
| Tickets | `https://yoursite.com/tickets` | `[poolsafe_tickets]` |
| Service Records | `https://yoursite.com/service-records` | `[poolsafe_service_records]` |
| Knowledge Base | `https://yoursite.com/knowledge-base` | `[poolsafe_kb]` |
| Calendar | `https://yoursite.com/calendar` | `[poolsafe_calendar]` |
| Notifications | `https://yoursite.com/notifications` | `[poolsafe_notifications]` |
| Support Tools | `https://yoursite.com/admin-tools` | `[poolsafe_support_tools]` |
| User Management | `https://yoursite.com/user-management` | `[poolsafe_user_management]` |
| Map | `https://yoursite.com/map` | `[poolsafe_map]` |

---

## 🎨 Tab Menu Configuration

If you're using a custom menu for tabs, create a WordPress menu with these items:

### Menu Name: `Portal Tabs` or `Main Navigation`

**Menu Items (in order):**
1. Dashboard → `/portal`
2. Partners → `/partners`
3. Tickets → `/tickets`
4. Service Records → `/service-records`
5. Knowledge Base → `/knowledge-base`
6. Calendar → `/calendar`
7. Notifications → `/notifications`
8. Support Tools → `/admin-tools` (conditional display for admin)
9. User Management → `/user-management` (conditional display for admin)
10. Map → `/map` (conditional display for admin)

### Menu Icons (Optional):
Use menu item CSS classes or icon plugins:
- Dashboard: `dashicons-dashboard` or 📊
- Partners: `dashicons-groups` or 🏢
- Tickets: `dashicons-tickets` or 🎫
- Service Records: `dashicons-clipboard` or 📋
- Knowledge Base: `dashicons-book` or 📚
- Calendar: `dashicons-calendar` or 📅
- Notifications: `dashicons-bell` or 🔔
- Support Tools: `dashicons-admin-tools` or 🔧
- User Management: `dashicons-admin-users` or 👥
- Map: `dashicons-location` or 🗺️

---

## 🔐 Access Control Setup

### Method 1: Using Shortcode Logic (Built-in)
The following shortcodes **automatically restrict** to Support/Admin:
- `[poolsafe_support_tools]`
- `[poolsafe_user_management]`
- `[poolsafe_map]`

Partners will see "Access restricted to support team" message.

### Method 2: Hide Pages from Menu (Recommended)
Use a menu visibility plugin like:
- **Nav Menu Roles** (free plugin)
- **Conditional Menus** (free plugin)

Set menu items to show only for:
- Support Tools: `Administrator`, `PSP Support`
- User Management: `Administrator`, `PSP Support`
- Map: `Administrator`, `PSP Support`

### Method 3: Page Restriction Plugin
Install a plugin like:
- **Members** (free, role-based content restriction)
- **PublishPress Capabilities** (free, advanced permissions)

Restrict pages to specific roles.

---

## ⚙️ Additional Configuration

### Login Redirect
Set login redirect in theme functions or use a redirect plugin:

**For Partners:**
Redirect to: `/portal` (Dashboard)

**For Support/Admin:**
Redirect to: `/wp-admin` (WordPress Admin) or `/portal`

### Logout Link
Add logout link to menu or footer:
```php
<?php echo wp_logout_url( home_url('/login') ); ?>
```

### Page Template Override (Optional)
If your theme adds sidebars, select **Full Width** template for all portal pages.

---

## 📱 Mobile Responsiveness

All shortcodes are mobile-responsive. For tab menus:
- Use a hamburger menu plugin for mobile
- Tabs auto-stack vertically on screens < 768px
- Touch-friendly button sizes (min 44×44px)

---

## 🧪 Testing Checklist

After creating all pages:

### As Partner User:
- [ ] Login page loads and form works
- [ ] Dashboard displays after login
- [ ] Can navigate to Partners, Tickets, Service Records, KB, Calendar, Notifications
- [ ] Cannot see Support Tools, User Management, or Map tabs/pages
- [ ] Can create tickets
- [ ] Can view service records

### As Support/Admin User:
- [ ] Login page offers Microsoft sign-in option (if configured)
- [ ] Dashboard displays after login
- [ ] Can access all tabs including Support Tools, User Management, Map
- [ ] Can edit branding colors in Support Tools
- [ ] Can create partner users in User Management
- [ ] Map displays partner locations
- [ ] Can manage all tickets and partners

### General:
- [ ] All pages load without errors
- [ ] Theme colors match (Calm Blue #3AA6B9, Accent #25D0EE, Navy #000080)
- [ ] No raw shortcode text visible (e.g., `[poolsafe_tickets]`)
- [ ] Responsive on mobile/tablet
- [ ] Navigation menu works
- [ ] Logout redirects to login page

---

## 🆘 Troubleshooting

### "Shortcode shows as text"
- Plugin not activated → Go to Plugins, activate Pool Safe Portal
- Wrong block type → Use **Shortcode block**, not HTML/Code block
- Typo in shortcode → Check spelling and underscores

### "Page not found (404)"
- Flush permalinks → Settings → Permalinks → Save Changes
- Check page is Published, not Draft

### "Access denied" on admin pages
- Verify user has `psp_support` or `administrator` role
- Check page restrictions if using a membership plugin

### Theme breaking layout
- Switch page template to Full Width
- Disable sidebars for portal pages
- Check theme CSS conflicts

---

## 📞 Support

**Issues?** Check:
1. Plugin version is 1.3.0 (Plugins page)
2. All pages are Published (not Draft)
3. Correct shortcode spelling
4. User has proper role assigned
5. Permalinks flushed

**Contact:** support@poolsafeinc.com

---

## 🎉 Quick Start Summary

**Minimum required pages for functioning portal:**

1. **Login** (`[poolsafe_login]`) - Entry point
2. **Dashboard** (`[poolsafe_dashboard]`) - Home after login
3. **Tickets** (`[poolsafe_tickets]`) - Create/view tickets
4. **Partners** (`[poolsafe_partners]`) - Company list
5. **Knowledge Base** (`[poolsafe_kb]`) - Help articles

**Add these for full experience:**
- Service Records, Calendar, Notifications (user-facing)
- Support Tools, User Management, Map (admin-only)

**Total pages:** 11 (8 user + 3 admin)

---

**All set! Your Pool Safe Portal v1.3.0 is ready for deployment.** 🏊‍♂️
