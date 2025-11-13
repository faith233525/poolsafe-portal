# Pool Safe Portal - What's New in v1.2.0

## 🎉 Major Feature Release

Version 1.2.0 brings powerful enhancements to improve your support workflow, collaboration, and user experience.

---

## ✨ New Features

### 1. **Activity Log Viewer** 📋
Track every action on your tickets with a comprehensive activity timeline.

**Features:**
- ✅ Color-coded activity types (status changes, assignments, comments)
- ✅ User attribution with timestamps
- ✅ IP address and browser tracking
- ✅ Filter by action type
- ✅ "Time ago" format (e.g., "3 days ago")
- ✅ Shows old → new value changes

**Location:** Ticket edit screen → Activity Log meta box

---

### 2. **Service Records Frontend** 🔧
Beautiful timeline view of all service interactions with partners.

**Features:**
- ✅ [poolsafe_service_records] shortcode
- ✅ Timeline visualization with color-coded markers
- ✅ Support team can create records from frontend
- ✅ Filter by service type
- ✅ Shows: date, partner, technician, duration, resolution status
- ✅ Support for phone, email, remote, and on-site services

**Service Types:**
- 📞 Phone Support
- 📧 Email Support
- 💻 Remote Support
- 🔧 On-Site Maintenance
- 🏗️ On-Site Installation
- 🛠️ On-Site Repair
- 🔍 On-Site Inspection

---

### 3. **File Attachments UI** 📎
Upload images, videos, and documents to tickets with ease.

**Features:**
- ✅ Multi-file upload (images, videos, PDFs, Word docs)
- ✅ Image thumbnails with preview
- ✅ File type icons for non-images
- ✅ Displays file name and size
- ✅ Drag-and-drop friendly
- ✅ Responsive grid layout

**Accepted Files:** JPG, PNG, GIF, MP4, PDF, DOC, DOCX

---

### 4. **Canned Responses** 💬
Save time with pre-written template responses.

**Features:**
- ✅ Custom Post Type for templates
- ✅ Template variables: `{ticket_id}`, `{partner_name}`, `{contact_name}`, `{status}`, `{priority}`, `{date}`, `{time}`
- ✅ One-click insert into ticket comments
- ✅ Optional category grouping
- ✅ Works with TinyMCE and plain text editor
- ✅ Visual feedback on successful insert

**Usage:**
1. Go to **Canned Responses** in admin menu
2. Create templates with variables
3. On ticket edit screen → Insert Canned Response meta box
4. Select template → Click "Insert into Comment"

---

### 5. **Dashboard Widgets** 📊
At-a-glance statistics and quick actions.

**Features:**
- ✅ [poolsafe_dashboard] shortcode
- ✅ 4 stat cards:
  - 📋 Open Tickets
  - 👤 Assigned to Me
  - 🔥 Urgent Tickets
  - 🏢 Active Partners
- ✅ Recent tickets list (5 most recent)
- ✅ Color-coded priority badges
- ✅ Quick action: New Ticket button
- ✅ Real-time data from REST API

---

### 6. **Priority & SLA Tracking** ⏰ *(Already in v1.1.0, improved in v1.2.0)*
Visual warnings for overdue tickets based on priority.

**SLA Thresholds:**
- 🔥 **Urgent:** 4 hours
- 🟡 **High:** 24 hours
- 🟢 **Medium:** 72 hours
- ⚪ **Low:** 168 hours (7 days)

**Features:**
- ✅ Red border + pink background for overdue tickets
- ✅ Pulsing "X days overdue" badge
- ✅ Auto-sort: Overdue first, then urgent, then by date
- ✅ Ticket age display ("3 days ago")

---

### 7. **Search & Filters** 🔍 *(Already in v1.1.0, enhanced in v1.2.0)*
Find tickets instantly with powerful search and filtering.

**Features:**
- ✅ Debounced search (300ms delay)
- ✅ Search across: ticket ID, title, category, contact name
- ✅ Filter by status (6 options)
- ✅ Filter by priority (4 options)
- ✅ Clear button to reset all filters
- ✅ Client-side filtering (instant results)

---

## 🚀 Quick Wins & Improvements

1. **Responsive Design** - All new features work perfectly on mobile
2. **Consistent UI** - Unified color scheme and component styles
3. **Performance** - Client-side filtering and debounced search
4. **Accessibility** - ARIA labels, keyboard navigation
5. **Error Handling** - Clear feedback for failed operations

---

## 📝 Technical Details

**New Files:**
- `includes/class-psp-canned-responses.php` - Canned responses system
- `WHATS-NEW-v1.2.0.md` - This file

**Modified Files:**
- `includes/class-psp-admin.php` - Activity log functions + meta boxes
- `includes/class-psp-frontend.php` - Service records + dashboard shortcodes
- `includes/class-psp-plugin.php` - Registered new components
- `assets/js/portal.js` - Dashboard stats, service records, file upload
- `assets/css/portal.css` - New styles for all features

**Database Changes:**
- ✅ `wp_psp_activity_log` table (created in v1.1.0)
- ✅ `psp_canned_response` CPT
- ✅ Activity log meta box hooks

---

## 🔄 Upgrading from v1.1.0

1. **Backup your database** before upgrading
2. Upload and activate `wp-poolsafe-portal-ENHANCED-v1.2.0.zip`
3. All database tables and CPTs will be created automatically
4. No manual configuration required

**Data Migration:**
- All existing tickets, partners, and users are preserved
- Activity logging starts tracking from v1.1.0 onwards
- No data loss during upgrade

---

## 📚 Shortcodes Reference

| Shortcode | Description | New in v1.2.0 |
|---|---|---|
| `[poolsafe_dashboard]` | Dashboard with stats | ✅ Yes |
| `[poolsafe_service_records]` | Service timeline | ✅ Yes |
| `[poolsafe_tickets]` | Ticket list + create form | Updated |
| `[poolsafe_portal]` | Full portal | Existing |
| `[poolsafe_map]` | Partner map | Existing |
| `[poolsafe_partners]` | Partner list | Existing |
| `[poolsafe_kb]` | Knowledge base | Existing |

---

## 🎯 REST API Endpoints

**New Endpoints:**
- `GET /poolsafe/v1/canned-responses` - List canned responses
- `POST /poolsafe/v1/service-records` - Create service record
- `GET /poolsafe/v1/service-records` - List service records

**Updated Endpoints:**
- `POST /poolsafe/v1/attachments` - Now used by file upload UI
- `GET /poolsafe/v1/tickets` - Used by dashboard stats

---

## 🐛 Bug Fixes

- Fixed file upload error handling
- Improved search performance with debouncing
- Fixed mobile layout issues with long ticket titles
- Corrected CSS syntax errors in portal.css
- Improved browser compatibility

---

## 📞 Support

For questions or issues:
- **Email:** support@poolsafe.com
- **Documentation:** Check README.md
- **GitHub:** Submit issues or pull requests

---

**Build Date:** November 2024  
**Version:** 1.2.0  
**License:** Proprietary

