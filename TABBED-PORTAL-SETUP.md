# Tabbed Portal Setup Guide

## Overview
This guide will help you set up a single-page tabbed portal that works for both **Partners** and **Support/Admin** users with role-based content.

---

## 🎯 What You'll Get

### For Partners:
A tabbed interface showing:
- 📊 **Dashboard** - Overview of their tickets and info
- 🎫 **My Tickets** - Their support tickets
- 📚 **Knowledge Base** - Help articles
- 📅 **Calendar** - Events and schedules
- 🔔 **Notifications** - Important updates

### For Support/Admin:
A tabbed interface showing:
- 📊 **Dashboard** - All tickets overview
- 🤝 **Partners** - Partner directory with lock codes
- 🗺️ **Map** - Partners plotted on map
- 🎫 **Tickets** - All support tickets
- 📚 **Knowledge Base** - Help articles
- 📅 **Calendar** - Events and schedules
- 🔔 **Notifications** - Important updates
- 🖼️ **Gallery** - Photo gallery

---

## 📋 Setup Steps

### Step 1: Create Two Pages in WordPress

#### Page 1: Login Page
1. Go to **Pages > Add New**
2. **Title**: Portal Login
3. **Slug**: portal-login
4. **Content**: Add this shortcode:
```
[poolsafe_login]
```
5. **Template**: Full Width (if available)
6. **Publish**

#### Page 2: Portal Page (Tabbed)
1. Go to **Pages > Add New**
2. **Title**: Portal
3. **Slug**: portal
4. **Content**: See options below
5. **Template**: Full Width (if available)
6. **Publish**

---

## 🎨 Option A: Built-in CSS Tabs (No Plugin Needed)

### HTML/Shortcode Content for Portal Page:

```html
<div class="psp-tabbed-portal">
  <!-- Tab Navigation -->
  <div class="psp-tab-nav">
    <button class="psp-tab-btn active" data-tab="dashboard">📊 Dashboard</button>
    <button class="psp-tab-btn" data-tab="partners">🤝 Partners</button>
    <button class="psp-tab-btn" data-tab="map">🗺️ Map</button>
    <button class="psp-tab-btn" data-tab="tickets">🎫 Tickets</button>
    <button class="psp-tab-btn" data-tab="kb">📚 Knowledge Base</button>
    <button class="psp-tab-btn" data-tab="calendar">📅 Calendar</button>
    <button class="psp-tab-btn" data-tab="notifications">🔔 Notifications</button>
    <button class="psp-tab-btn" data-tab="gallery">🖼️ Gallery</button>
  </div>

  <!-- Tab Panels -->
  <div class="psp-tab-panels">
    <div id="dashboard" class="psp-tab-panel active">
      [poolsafe_portal]
    </div>
    
    <div id="partners" class="psp-tab-panel">
      [poolsafe_partners]
    </div>
    
    <div id="map" class="psp-tab-panel">
      [poolsafe_map]
    </div>
    
    <div id="tickets" class="psp-tab-panel">
      [poolsafe_tickets]
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
    
    <div id="gallery" class="psp-tab-panel">
      [poolsafe_gallery]
    </div>
  </div>
</div>

<style>
.psp-tabbed-portal {
  max-width: 1200px;
  margin: 20px auto;
}

.psp-tab-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px 8px 0 0;
  border-bottom: 2px solid #dee2e6;
}

.psp-tab-btn {
  padding: 12px 20px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  color: #495057;
}

.psp-tab-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.psp-tab-btn.active {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
  box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);
}

.psp-tab-panels {
  background: white;
  padding: 30px;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: 400px;
}

.psp-tab-panel {
  display: none;
}

.psp-tab-panel.active {
  display: block;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .psp-tab-nav {
    flex-direction: column;
  }
  
  .psp-tab-btn {
    width: 100%;
    text-align: left;
  }
  
  .psp-tab-panels {
    padding: 20px 15px;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.psp-tab-btn');
  const tabPanels = document.querySelectorAll('.psp-tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      // Save active tab to localStorage
      localStorage.setItem('psp_active_tab', targetTab);
    });
  });
  
  // Restore last active tab
  const lastActiveTab = localStorage.getItem('psp_active_tab');
  if (lastActiveTab) {
    const targetButton = document.querySelector(`[data-tab="${lastActiveTab}"]`);
    if (targetButton) {
      targetButton.click();
    }
  }
});
</script>
```

### ✅ Benefits of Option A:
- ✅ No plugin required
- ✅ Fully customizable
- ✅ Remembers last tab (localStorage)
- ✅ Smooth animations
- ✅ Mobile responsive
- ✅ Works immediately

---

## 🔌 Option B: Using a Tabs Plugin (Alternative)

If you prefer a plugin-based approach:

### Recommended Free Plugins:
1. **Gutenberg Blocks – Ultimate Addons for Gutenberg** (500K+ installs)
2. **Tabs – Responsive Tabs** (50K+ installs)
3. **Easy Accordion** (100K+ installs)

### Example with Generic Tabs Shortcode:
```
[tabs]
  [tab title="📊 Dashboard"]
    [poolsafe_portal]
  [/tab]
  
  [tab title="🤝 Partners"]
    [poolsafe_partners]
  [/tab]
  
  [tab title="🗺️ Map"]
    [poolsafe_map]
  [/tab]
  
  [tab title="🎫 Tickets"]
    [poolsafe_tickets]
  [/tab]
  
  [tab title="📚 Knowledge Base"]
    [poolsafe_kb]
  [/tab]
  
  [tab title="📅 Calendar"]
    [poolsafe_calendar]
  [/tab]
  
  [tab title="🔔 Notifications"]
    [poolsafe_notifications]
  [/tab]
  
  [tab title="🖼️ Gallery"]
    [poolsafe_gallery]
  [/tab]
[/tabs]
```

---

## 🎯 Role-Based Tab Visibility (Advanced)

If you want to hide certain tabs for partners (e.g., Partners list, Map, Gallery), add this to your theme's `functions.php`:

```php
<?php
// Role-based tab visibility for Pool Safe Portal
add_action('wp_head', 'psp_hide_tabs_by_role');
function psp_hide_tabs_by_role() {
    if (!is_user_logged_in()) return;
    
    $user = wp_get_current_user();
    $is_partner = in_array('psp_partner', $user->roles);
    
    if ($is_partner) {
        ?>
        <style>
            /* Hide these tabs for partners */
            .psp-tab-btn[data-tab="partners"],
            .psp-tab-btn[data-tab="map"],
            .psp-tab-btn[data-tab="gallery"] {
                display: none !important;
            }
        </style>
        <?php
    }
}
```

---

## 📱 Mobile Experience

The tabbed portal is fully responsive:
- **Desktop**: Horizontal tabs across the top
- **Tablet**: Wrapped tabs with spacing
- **Mobile**: Vertical stacked tabs (full width)

---

## 🔗 Navigation Setup

### Main Menu Links:
1. **Login** → /portal-login
2. **Portal** → /portal (after login)

### Redirect After Login:
The `[poolsafe_login]` shortcode automatically redirects to `/portal` after successful login.

To customize the redirect URL, edit `includes/class-psp-shortcodes.php` line ~65:
```php
$redirect = home_url('/portal'); // Change '/portal' to your preferred page
```

---

## 🎨 Customization Options

### Change Tab Colors:
Edit the `<style>` section in the portal page:
```css
.psp-tab-btn.active {
  background: #28a745; /* Change to your brand color */
  border-color: #28a745;
}
```

### Change Tab Icons:
Replace emojis in button text with your preferred icons or text:
```html
<button class="psp-tab-btn active" data-tab="dashboard">
  Dashboard <!-- No emoji -->
</button>
```

### Add Icons Using Font Awesome:
If your theme has Font Awesome:
```html
<button class="psp-tab-btn active" data-tab="dashboard">
  <i class="fas fa-chart-line"></i> Dashboard
</button>
```

---

## ✅ Testing Checklist

After setup, test these scenarios:

### As a Partner:
- [ ] Login redirects to /portal
- [ ] Dashboard tab shows partner-specific content
- [ ] Can create new ticket
- [ ] Can view own tickets only
- [ ] Can access KB, Calendar, Notifications
- [ ] Cannot see Partners list, Map, or Gallery (if using advanced role-based hiding)

### As Support/Admin:
- [ ] Login redirects to /portal
- [ ] Dashboard shows all tickets overview
- [ ] Partners tab shows all partners with lock codes (yellow section)
- [ ] Map shows partners plotted by address
- [ ] Can view all tickets
- [ ] Can access all tabs

---

## 🚀 Deployment Sequence

1. **Upload Plugin**: Upload `wp-poolsafe-portal-PRODUCTION-READY.zip` to WordPress
2. **Activate Plugin**: Go to Plugins → Activate "Pool Safe Portal"
3. **Configure Settings**: Pool Safe Portal → Settings (email, map API key)
4. **Create Pages**: Create Login page and Portal page (using Option A code above)
5. **Import Partners**: Use CSV import to add partners
6. **Test**: Log in as partner and as admin to verify tabs work
7. **Launch**: Update your main menu with links to Portal

---

## 💡 Pro Tips

### Tip 1: Set Portal as Default After Login
Partners should land on /portal automatically. This is already configured in the plugin.

### Tip 2: Use Full-Width Template
Make sure your Portal page uses a full-width template (no sidebar) for best experience.

### Tip 3: Bookmark Feature
Users can bookmark specific tabs! The URL will update to `/portal#dashboard`, `/portal#tickets`, etc.

### Tip 4: Deep Linking
Want to link directly to a specific tab? Use:
- `/portal#tickets` - Opens tickets tab
- `/portal#kb` - Opens knowledge base tab
- `/portal#partners` - Opens partners tab

---

## 📞 Quick Reference

| What | Where |
|------|-------|
| Login Page URL | `/portal-login` |
| Portal Page URL | `/portal` |
| Total Tabs | 8 (Dashboard, Partners, Map, Tickets, KB, Calendar, Notifications, Gallery) |
| Partner View | 5 tabs (Dashboard, Tickets, KB, Calendar, Notifications) |
| Support View | 8 tabs (all tabs) |
| Mobile Friendly | ✅ Yes |
| Plugin Required | ❌ No (Option A) |

---

## 🎉 You're All Set!

Copy the HTML/Shortcode from **Option A** above, paste it into your Portal page, and publish. That's it! You now have a beautiful, functional tabbed portal that adapts to user roles.

**Next Step**: Import your partners CSV and watch them appear on the map! 🗺️

