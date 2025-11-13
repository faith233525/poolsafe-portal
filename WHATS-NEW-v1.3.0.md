# What's New in v1.3.0

**Release Date:** November 11, 2025

## 🎯 Major Features

### Admin-Configurable SLA Thresholds
- **Settings → Pool Safe → Settings → SLA Settings**
  - Configure SLA response time thresholds per priority (Urgent, High, Medium, Low) in hours
  - Set overdue reminder schedule (comma-separated hours after SLA breach)
  - Frontend ticket lists and dashboard automatically use configured thresholds
  - Dynamic overdue flagging and badge display based on admin settings

### Service Records Pagination
- **Improved Performance**
  - Service records timeline now loads 25 records per page by default
  - "Load more" button to fetch additional pages incrementally
  - Dramatically faster page loads for partners with large service histories
  - Configurable `per_page` via shortcode attribute

- **REST API Enhancement**
  - `/poolsafe/v1/service-records` endpoint supports `page` and `per_page` parameters
  - Response includes pagination metadata: `page`, `per_page`, `total`, `total_pages`, `has_more`
  - Partner ID filter carried across pages

### Frontend Enhancements
- **Improved JavaScript Localization**
  - `PSP_PORTAL.sla` object exposes configured SLA thresholds to the frontend
  - `PSP_PORTAL.api` alias for cleaner JS code (mirrors `rest`)
  - `PSP_PORTAL.user.id` available for dashboard stats and assignment logic

### Accessibility & Usability Improvements
- **Keyboard Navigation**
  - Enhanced focus outlines (2px solid) on all interactive elements
  - Consistent `:focus-visible` support for keyboard-only users
  - ARIA labels on "Load more" buttons and filter controls

- **Visual Feedback**
  - Improved contrast ratios for status badges and buttons
  - Clear focus indicators that meet WCAG 2.1 AA standards
  - Better outline offset for better visual separation

## 🔧 Technical Improvements

- **Settings Architecture**
  - `PSP_Settings::get_sla_thresholds()` helper for clean SLA access
  - Sanitized SLA input with sane bounds (1–720 hours)
  - Reminder schedule validation (positive integers up to 90 days)

- **Service Records REST**
  - Pagination offset/limit logic with WP_Query
  - `has_more` flag for efficient "Load more" UI state
  - Backward-compatible with existing non-paginated calls

- **Portal JavaScript**
  - State management for service records pagination
  - Dynamic "Load more" button visibility based on `total_pages`
  - Partner ID and per-page settings read from `data-*` attributes
  - SLA threshold functions now read from `PSP_PORTAL.sla` (configurable)

## 🐛 Bug Fixes

- Fixed CSS validation issues (removed invalid `ring` property, corrected hex color spacing)
- Improved responsive behavior of service records timeline on mobile
- Enhanced error handling in service records fetch with better user feedback

## 📚 Documentation

- All new features documented inline with `__()` translation wrappers
- Settings page includes helpful descriptions and placeholders
- REST API pagination behavior documented in code comments

## 🚀 Upgrade Notes

- **No breaking changes** – v1.3.0 is fully backward-compatible with v1.2.0
- Default SLA thresholds match v1.2.0 hard-coded values if not configured
- Service records shortcode works identically; pagination is opt-in via `per_page` attribute
- Existing installations will auto-migrate to new settings schema on activation

## 📦 Installation

1. Deactivate and delete the old version from wp-admin → Plugins
2. Upload `wp-poolsafe-portal-v1.3.0.zip` via Plugins → Add New → Upload Plugin
3. Activate the plugin
4. Visit **Settings → Pool Safe → Settings** to configure SLA thresholds (optional)
5. Service records will automatically paginate; no additional configuration needed

---

**Full Changelog:** See `CHANGELOG.md` for detailed commit history

**Support:** For questions or issues, contact your Pool Safe Inc. administrator
