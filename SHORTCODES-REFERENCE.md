# Pool Safe Portal - Shortcodes & Tabs Reference

**Plugin Version:** 1.3.1  
**Last Updated:** November 12, 2025

---

## 📋 Available Shortcodes

The Pool Safe Portal plugin provides **11 primary shortcodes** for building flexible portal pages.

### 🔁 Alias Shortcodes (Convenience)
To reduce errors from mis-typing, the following aliases map to existing shortcodes:

| Alias | Resolves To | Purpose |
|-------|-------------|---------|
| `[poolsafe_tools]` | `[poolsafe_support_tools]` | Support tools panel |
| `[poolsafe_users]` | `[poolsafe_user_management]` | Partner user management UI |
| `[psp_support_tools]` | `[poolsafe_support_tools]` | Support tools panel (psp prefix) |
| `[psp_user_management]` | `[poolsafe_user_management]` | Partner user management UI (psp prefix) |

Use any alias interchangeably; output is identical. Aliases are added to prevent seeing the raw shortcode when a slightly different name is used.

### 1. Main Portal Shortcode

#### `[poolsafe_portal]`
**Description:** Complete portal interface with partners, tickets, and map (all-in-one)

**Usage:**
```
[poolsafe_portal]
```

**Shows:**
- Partners section (list of all partners)
- Tickets section (create + list tickets)
- Map section (partner locations - Support/Admin only)
- Support Tools (Support/Admin): colors, lock editor, bulk CSV/Excel import, Quick Create company + user

**Access:** Requires login

---

### 2. Tickets Shortcode

#### `[poolsafe_tickets]`
**Description:** Ticket management interface with create form, filters, and ticket list

**Usage:**
```
[poolsafe_tickets]
```

**With Attributes:**
```
[poolsafe_tickets view="both"]     <!-- Default: shows create form + list -->
[poolsafe_tickets view="create"]   <!-- Only shows create form -->
[poolsafe_tickets view="list"]     <!-- Only shows ticket list -->
```

**Features:**
- ✅ Create new tickets
- ✅ Upload attachments (images, videos, documents)
- ✅ Search tickets
- ✅ Filter by status (Open, In Progress, Pending, Resolved, Closed)
- ✅ Filter by priority (Urgent, High, Medium, Low)
- ✅ SLA countdown timers
- ✅ Priority badges

**Access:** Requires login

---

### 3. Partners Shortcode

#### `[poolsafe_partners]`
**Description:** Partner directory with lock codes (Support/Admin view)

**Usage:**
```
[poolsafe_partners]
```

**Shows:**
- Partner company names
- Contact information (includes phone if provided)
- Lock codes (Support/Admin only)
- Address & units
- Top Colour branding

**Access:** Requires login

---

### 4. Map Shortcode

#### `[poolsafe_map]`
**Description:** Interactive map showing partner locations

**Usage:**
```
[poolsafe_map]
```

**Features:**
- 🗺️ Leaflet.js interactive map
- 📍 Partner location markers
- 🔍 Click markers for partner details
- 🎨 Customizable tile layers (OpenStreetMap default)

**Access:** Support/Admin only

---

### 5. Service Records Shortcode

#### `[poolsafe_service_records]`
**Description:** Service history timeline with pagination

**Usage:**
```
[poolsafe_service_records]
```

**With Attributes:**
```
[poolsafe_service_records partner_id="123"]   <!-- Show records for specific partner -->
```

**Features:**
- 📋 Service record timeline
- 🔄 "Load more" pagination (full history accessible)
### Bulk Import (Support Tools)
CSV (.csv) or Excel (.xlsx) with header:
`user_login,user_pass,number,display_name,top_colour,company_name,management_company,units,street_address,city,state,zip,country,lock,master_code,sub_master_code,lock_part,key,phone`

Only `company_name` required. If credentials provided user is created & linked. Lock columns restricted to support/admin.

### Quick Create (Support Tools)
Company + user account in one step (role `psp_partner`). Links via `psp_partner_id` meta and returns success status.
- 📝 Service type badges (Phone, Email, Remote, On-site)
- ⏱️ Duration tracking
- 👨‍🔧 Technician information
- ➕ Add service records (Support/Admin only)

**Access:** Requires login

---

### 6. Knowledge Base Shortcode

#### `[poolsafe_kb]`
**Description:** Searchable knowledge base articles

**Usage:**
```
[poolsafe_kb]
```

**Features:**
- 🔍 Search knowledge base
- 📂 Browse by category
- 📄 Article viewer
- ↩️ Back to articles navigation

**Access:** Requires login

---

### 7. Calendar Shortcode

#### `[poolsafe_calendar]`
**Description:** Events and scheduling calendar

**Usage:**
```
[poolsafe_calendar]
```

**Features:**
- 📅 Calendar view
- 📌 Events display
- 🔔 Upcoming events list

**Access:** Requires login

---

### 8. Notifications Shortcode

#### `[poolsafe_notifications]`
**Description:** User notifications and alerts

**Usage:**
```
[poolsafe_notifications]
```

**Features:**
- 🔔 Real-time notifications
- 📬 Unread/read status
- 🗑️ Dismiss notifications

**Access:** Requires login

---

### 9. Gallery Shortcode

#### `[poolsafe_gallery]`
**Description:** Photo/media gallery

**Usage:**
```
[poolsafe_gallery]
```

**Features:**
- 🖼️ Media gallery grid
- 🔍 Lightbox view
- 📁 Category filtering

**Access:** Requires login

---

### 10. Login Shortcode

#### `[poolsafe_login]`
**Description:** Custom login form with dual authentication methods

**Usage:**
```
[poolsafe_login]
```

**Features:**
- 🔐 **Dual Login System:**
  - **Support Staff:** Sign in with Microsoft/Outlook (SSO via OAuth)
  - **Partners:** Sign in with username/password (company credentials)
- ☑️ "Remember me" checkbox
- 🔄 Auto-redirect after login:
  - Partners → Portal page
  - Support/Admin → WordPress Admin Dashboard
- ✅ Already logged in? Shows welcome message + logout link
- 🎨 Responsive design with Microsoft branding

**How It Works:**
1. If **Microsoft Graph OAuth is configured** (Azure AD):
   - Shows **"Support Staff"** section with "Sign in with Microsoft" button
   - Shows **"Partners"** section with username/password form
   - Separated by "OR" divider
2. If **Microsoft OAuth NOT configured**:
   - Shows only username/password form (traditional login)

**Setup Requirements:**
- For Microsoft SSO: Configure Azure AD in Pool Safe → Email → Microsoft Graph
- For Partners: Standard WordPress user accounts with `psp_partner` role

**Access:** Public (no login required)

---

### 11. Dashboard Shortcode

#### `[poolsafe_dashboard]`
**Description:** User dashboard with stats and overview

**Usage:**
```
[poolsafe_dashboard]
```

**Features:**
- 📊 Ticket statistics
- ⚡ Quick actions
- 📈 Activity summary

**Access:** Requires login

---

## 🎨 Building Tabbed Portals

### Using Built-in CSS Tabs (Recommended)

Create a WordPress page with this HTML structure:

```html
<div class="psp-tabbed-portal">
  <!-- Tab Navigation -->
  <div class="psp-tab-nav">
    <button class="psp-tab-btn active" data-tab="dashboard">📊 Dashboard</button>
    <button class="psp-tab-btn" data-tab="tickets">🎫 My Tickets</button>
    <button class="psp-tab-btn" data-tab="service">📋 Service Records</button>
    <button class="psp-tab-btn" data-tab="kb">📚 Knowledge Base</button>
    <button class="psp-tab-btn" data-tab="calendar">📅 Calendar</button>
    <button class="psp-tab-btn" data-tab="notifications">🔔 Notifications</button>
  </div>

  <!-- Tab Panels -->
  <div class="psp-tab-panels">
    <div id="dashboard" class="psp-tab-panel active">
      [poolsafe_dashboard]
    </div>
    
    <div id="tickets" class="psp-tab-panel">
      [poolsafe_tickets]
    </div>
    
    <div id="service" class="psp-tab-panel">
      [poolsafe_service_records]
    </div>
    
    <div id="kb" class="psp-tab-panel">
      [poolsafe_kb]
    </div>
    
    <div id="calendar" class="psp-tab-panel">
      [poolsafe_calendar]
    </div>
    
    <div id="notifications" class="psp-tab-panel">
      [poolsafe_notifications]
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const tabBtns = document.querySelectorAll('.psp-tab-btn');
  const tabPanels = document.querySelectorAll('.psp-tab-panel');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
});
</script>

<style>
.psp-tabbed-portal {
  max-width: 1200px;
  margin: 0 auto;
}

.psp-tab-nav {
  display: flex;
  gap: 5px;
  border-bottom: 2px solid #ddd;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.psp-tab-btn {
  background: #f5f5f5;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-radius: 5px 5px 0 0;
  transition: all 0.3s ease;
}

.psp-tab-btn:hover {
  background: #e8e8e8;
}

.psp-tab-btn.active {
  background: #fff;
  color: #3b82f6;
  border-bottom: 3px solid #3b82f6;
}

.psp-tab-panel {
  display: none;
  animation: fadeIn 0.3s ease;
}

.psp-tab-panel.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Responsive tabs */
@media (max-width: 768px) {
  .psp-tab-nav {
    flex-direction: column;
  }
  
  .psp-tab-btn {
    width: 100%;
    border-radius: 5px;
  }
}
</style>
```

---

## 🔐 Role-Based Tab Configuration

### Partner Portal (6 tabs)

```html
<div class="psp-tabbed-portal psp-partner-portal">
  <div class="psp-tab-nav">
    <button class="psp-tab-btn active" data-tab="dashboard">📊 Dashboard</button>
    <button class="psp-tab-btn" data-tab="tickets">🎫 My Tickets</button>
    <button class="psp-tab-btn" data-tab="service">📋 Service Records</button>
    <button class="psp-tab-btn" data-tab="kb">📚 Knowledge Base</button>
    <button class="psp-tab-btn" data-tab="calendar">📅 Calendar</button>
    <button class="psp-tab-btn" data-tab="notifications">🔔 Notifications</button>
  </div>
  
  <div class="psp-tab-panels">
    <div id="dashboard" class="psp-tab-panel active">[poolsafe_dashboard]</div>
    <div id="tickets" class="psp-tab-panel">[poolsafe_tickets]</div>
    <div id="service" class="psp-tab-panel">[poolsafe_service_records]</div>
    <div id="kb" class="psp-tab-panel">[poolsafe_kb]</div>
    <div id="calendar" class="psp-tab-panel">[poolsafe_calendar]</div>
    <div id="notifications" class="psp-tab-panel">[poolsafe_notifications]</div>
  </div>
</div>
```

### Support/Admin Portal (9 tabs)

```html
<div class="psp-tabbed-portal psp-admin-portal">
  <div class="psp-tab-nav">
    <button class="psp-tab-btn active" data-tab="dashboard">📊 Dashboard</button>
    <button class="psp-tab-btn" data-tab="partners">🤝 Partners</button>
    <button class="psp-tab-btn" data-tab="map">🗺️ Map</button>
    <button class="psp-tab-btn" data-tab="tickets">🎫 All Tickets</button>
    <button class="psp-tab-btn" data-tab="service">📋 Service Records</button>
    <button class="psp-tab-btn" data-tab="kb">📚 Knowledge Base</button>
    <button class="psp-tab-btn" data-tab="calendar">📅 Calendar</button>
    <button class="psp-tab-btn" data-tab="notifications">🔔 Notifications</button>
    <button class="psp-tab-btn" data-tab="gallery">🖼️ Gallery</button>
  </div>
  
  <div class="psp-tab-panels">
    <div id="dashboard" class="psp-tab-panel active">[poolsafe_dashboard]</div>
    <div id="partners" class="psp-tab-panel">[poolsafe_partners]</div>
    <div id="map" class="psp-tab-panel">[poolsafe_map]</div>
    <div id="tickets" class="psp-tab-panel">[poolsafe_tickets]</div>
    <div id="service" class="psp-tab-panel">[poolsafe_service_records]</div>
    <div id="kb" class="psp-tab-panel">[poolsafe_kb]</div>
    <div id="calendar" class="psp-tab-panel">[poolsafe_calendar]</div>
    <div id="notifications" class="psp-tab-panel">[poolsafe_notifications]</div>
    <div id="gallery" class="psp-tab-panel">[poolsafe_gallery]</div>
  </div>
</div>
```

---

## 🎯 Quick Setup Guide

### 1. Create Login Page
```
Page Title: Portal Login
Page Slug: portal-login
Content: [poolsafe_login]
Template: Full Width
```

### 2. Create Portal Page (Tabbed)
```
Page Title: Portal
Page Slug: portal
Content: [Use one of the HTML structures above]
Template: Full Width
```

### 3. Configure WordPress Settings
1. Go to **Settings → Reading**
2. Set **Portal Login** as a static page (optional)
3. Add Portal link to menu: **Appearance → Menus**

### 4. Protect Portal Page
**Option A: Via Plugin Settings**
- Restrict access to logged-in users only

**Option B: Via Code (functions.php)**
```php
add_action('template_redirect', function() {
    if (is_page('portal') && !is_user_logged_in()) {
        wp_redirect(home_url('/portal-login'));
        exit;
    }
});
```

---

## 📱 Responsive Design

All shortcodes are mobile-responsive by default. The built-in CSS includes:

- ✅ Tablet breakpoint (max-width: 992px)
- ✅ Mobile breakpoint (max-width: 768px)
- ✅ Touch-friendly tap targets (44px minimum)
- ✅ Collapsible navigation on mobile
- ✅ Optimized font sizes

---

## 🎨 Customization Options

### Custom CSS Classes

Add to your theme's `style.css` or **Appearance → Customize → Additional CSS**:

```css
/* Change tab colors */
.psp-tab-btn.active {
  background: #your-color;
  border-bottom-color: #your-color;
}

/* Customize tab hover */
.psp-tab-btn:hover {
  background: #your-hover-color;
}

/* Dark mode tabs */
.psp-tabbed-portal.dark-mode .psp-tab-btn {
  background: #333;
  color: #fff;
}

.psp-tabbed-portal.dark-mode .psp-tab-btn.active {
  background: #555;
  color: #3b82f6;
}
```

### Custom Tab Icons

Replace emoji with icon fonts (Font Awesome, Material Icons):

```html
<!-- Font Awesome Example -->
<button class="psp-tab-btn" data-tab="dashboard">
  <i class="fas fa-chart-line"></i> Dashboard
</button>

<button class="psp-tab-btn" data-tab="tickets">
  <i class="fas fa-ticket-alt"></i> Tickets
</button>
```

---

## 🔧 Advanced Usage

### URL Hash Navigation

Auto-select tab based on URL hash (e.g., `#tickets`):

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Check for hash in URL
  const hash = window.location.hash.substring(1);
  if (hash) {
    const targetBtn = document.querySelector(`[data-tab="${hash}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  }
  
  // Update hash when tab changes
  const tabBtns = document.querySelectorAll('.psp-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      window.location.hash = this.getAttribute('data-tab');
    });
  });
});
```

### Remember Last Tab (LocalStorage)

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const tabBtns = document.querySelectorAll('.psp-tab-btn');
  
  // Restore last tab
  const lastTab = localStorage.getItem('psp_last_tab');
  if (lastTab) {
    const btn = document.querySelector(`[data-tab="${lastTab}"]`);
    if (btn) btn.click();
  }
  
  // Save tab selection
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      localStorage.setItem('psp_last_tab', this.getAttribute('data-tab'));
    });
  });
});
```

---

## 📊 Shortcode Summary Table

| Shortcode | Purpose | Access Level | Attributes |
|-----------|---------|--------------|------------|
| `[poolsafe_portal]` | Complete portal | Logged in | None |
| `[poolsafe_tickets]` | Ticket management | Logged in | `view="both\|create\|list"` |
| `[poolsafe_partners]` | Partner directory | Logged in | None |
| `[poolsafe_map]` | Location map | Support/Admin | None |
| `[poolsafe_service_records]` | Service history | Logged in | `partner_id="123"` |
| `[poolsafe_kb]` | Knowledge base | Logged in | None |
| `[poolsafe_calendar]` | Events calendar | Logged in | None |
| `[poolsafe_notifications]` | User alerts | Logged in | None |
| `[poolsafe_gallery]` | Media gallery | Logged in | None |
| `[poolsafe_login]` | Login form | Public | None |
| `[poolsafe_dashboard]` | User dashboard | Logged in | None |

---

## 🚀 Need Help?

- **Full Documentation:** See `TABBED-PORTAL-SETUP.md` for detailed setup guide
- **Testing Guide:** See `INTEGRATION-TEST-PLAN.md`
- **Configuration:** See `UPDATE-GUIDE.md`
- **Plugin Version:** Check `wp-poolsafe-portal.php` header

---

**Plugin Version:** 1.3.0  
**Compatible with:** WordPress 6.0+  
**PHP Requirement:** 7.4+  
**Last Updated:** November 12, 2025
