# Pool Safe Partner Portal - WordPress Plugin

**Version:** 1.3.1  
**License:** GPLv2 or later  
**Requires WordPress:** 6.0+  
**Requires PHP:** 7.4+

## Overview

Complete partner and support portal solution for Pool Safe Inc with role-based access, ticketing, partner management, maps, email notifications, HubSpot CRM sync, and calendar integration.

## Features

### Core Functionality
- **Custom Roles:** PSP Partner, PSP Support (granular capabilities)
- **Custom Post Types:**
  - Partners (with company info, location, lock details, amenities, gallery)
  - Tickets (priority, status, attachments)
  - Notifications (user-targeted messaging)
  - Service Records (travel logs)
  - Calendar Events (appointments, service schedules)
- **Interactive Map:** Leaflet-powered partner location map
- **Secure Lock Info:** Restricted master codes, keys (support/admin only)
- **Partner Amenities:** F&B call button, USB charging, safe lock tracking
- **Gallery:** Per-partner media library with WP media integration

### Integrations
- **Email/SMTP:** Configurable notifications on ticket create/update
- **HubSpot CRM:** Auto-sync partners → contacts, tickets → deals
- **REST API:** Full `/wp-json/poolsafe/v1` namespace for integrations
- **Optional:** Azure AD/Outlook SSO ready (requires separate OAuth plugin)

### REST API Endpoints

**Public/Logged-in:**
- `GET /health` — Health check
- `GET /tickets` — List tickets
- `POST /tickets` — Create ticket (support/admin)
- `GET /partners/map` — Partner locations with lat/lng
- `GET /partners/{id}/gallery` — Partner gallery images
- `GET /notifications` — User notifications
- `GET /service-records` — Travel logs
- `GET /calendar-events` — Upcoming events

**Restricted (support/admin):**
- `GET/PUT /partners/{id}/lock-info` — Lock make, codes, keys
- `POST /hubspot/sync/partner/{id}` — Manual HubSpot sync
- `POST /hubspot/sync/ticket/{id}` — Manual HubSpot sync
- `POST /notifications` — Create notification

### Admin Features
- **Dashboard:** Quick links to tickets, partners, calendar
- **Settings Pages:**
  - Map tiles and attribution
  - Email/SMTP configuration
  - HubSpot API key and portal ID
- **Bulk Import:** CSV or Excel (19 columns) with optional auto user creation, dry-run validation
- **Quick Create:** Company + user in one step (support panel)
- **Partner Gallery:** Media uploader with drag-and-drop preview

### Frontend
- **Shortcode:** `[poolsafe_portal]`
- **Role-based UI:** Partner/Support/Admin views
- **Conditional Asset Loading:** Scripts/styles only when shortcode renders
- **i18n Ready:** All strings wrapped with translation functions

### Frontend Support Editing (No wp-admin Needed)
After placing `[poolsafe_portal]` on a page, Support/Admin users see a "Support Tools" section below the map.

What Support Can Do:
- Change portal colors (Primary, Hover, Lock highlight) live – updates immediately without page reload.
- Select any partner and edit lock info (make, part #, master/sub-master codes, key).
- Update a partner's Top Colour field (branding for that location).

How It Works:
- UI uses REST endpoints: `GET/PUT /wp-json/poolsafe/v1/ui-settings` and `GET/PUT /wp-json/poolsafe/v1/partners/{id}/lock-info`, plus `PUT /wp-json/poolsafe/v1/partners/{id}` for `top_colour`.
- Changes are sanitized and stored in `psp_settings` or post meta; color changes inject inline CSS for immediate visual update.
- Lock info only appears for users with `psp_support` or `administrator` capability.

Usage Steps for Support:
1. Log in with Support role.
2. Visit the portal page containing `[poolsafe_portal]`.
3. Scroll to "Support Tools".
4. Adjust color pickers → click "Save Colors".
5. Choose a partner from the dropdown → lock fields auto-load.
6. Edit lock fields → click "Save Lock Info".
7. Edit Top Colour → click "Save Top Colour" (supports predefined names or custom text).

Fallback Behavior:
- If a Support user has no partners yet, dropdown lists all partners via `/partners` endpoint.
- If no lock data exists, fields start empty; saving creates them.

Security Notes:
- All endpoints require nonce and role checks (`current_user_can`).
- Color values validated via `sanitize_hex_color` server-side.
- Lock fields sanitized using `sanitize_text_field`.

To Hide Support Tools:
- Remove Support role from a user OR create a custom capability logic extension in `class-psp-frontend.php` around the Support Tools section.

Extending:
- Add more editable partner fields (e.g., phone, amenities) by extending `class-psp-rest.php` with additional PUT args and adding inputs in the Support Tools form.

### Company Profile View (Support/Admin)
Clicking any partner box now opens a rich profile pane (inline) with:
- Key meta: units, address, top colour, amenities.
- Recent Tickets (filtered via `GET /tickets?partner_id={id}`)
- Recent Service Records (`GET /service-records?partner_id={id}`)
- Gallery placeholder (future media integration).

How to Use:
1. Go to portal page `[poolsafe_portal]`.
2. Scroll to Partners list.
3. Click a partner card (not the "Set Coordinates" button).
4. Profile expands below list; close with × button.

Technical Details:
- Tickets endpoint extended to support `partner_id` query param (support/admin only).
- Service records endpoint already supported filtering.
- Profile shows full ticket & service record history (no artificial limit).
- Gallery reserved for later fetch integration (`/partners/{id}/gallery`).

### User Management (Support/Admin)
Support can create and manage users directly in the portal—no wp-admin access required.

Capabilities:
- List existing users: `GET /users`
- Create user (email, name, role, optional partner assignment): `POST /users`
- Reset password & update meta: `PUT /users/{id}` with `reset_password: true`
- Automatic welcome/reset emails sent via `wp_mail`.
- Quick Create: Company + user one-step form (links via psp_partner_id).

Workflow:
1. Open portal `[poolsafe_portal]` as Support/Admin.
2. Scroll to "User Management" section.
3. Fill email, (optional) names, role, partner → Create User.
4. Password shown once (keep secure). User receives email with credentials.
5. Reset password anytime using list action; user receives reset email.

Security & Sanitization:
- Email validated with `is_email`, uniqueness enforced.
- Username auto-derived from email local part with collision handling.
- Allowed roles restricted to `psp_partner` or `psp_support`.
- Partner assignment stored in `user_meta` (`psp_partner_id`).
- Passwords generated using `wp_generate_password` (12 chars, high entropy).

Extending User Management:
- Add invite token or forced password change by augmenting `create_user` / `update_user` handlers.
- Integrate SSO by storing external IDs in user meta and hiding password flows.

Endpoint Summary (New):
```
GET  /wp-json/poolsafe/v1/users
POST /wp-json/poolsafe/v1/users (email, first_name?, last_name?, role?, partner_id?)
PUT  /wp-json/poolsafe/v1/users/{id} (email?, first_name?, last_name?, partner_id?, reset_password?)
```

## Installation

### Quick Install
1. Download the latest ZIP from [GitHub Actions](https://github.com/faith233525/Wordpress-Pluggin/actions) (artifact from `plugin-ci` workflow) or from a tagged release.
2. In WordPress Admin → Plugins → Add New → Upload Plugin.
3. Choose the ZIP → Install → Activate.
4. Configure under **Pool Safe** menu.

### Manual Install
1. Extract ZIP to `/wp-content/plugins/wp-poolsafe-portal/`
2. Activate via Plugins menu.

## Configuration

### 1. Basic Setup
- Add shortcode `[poolsafe_portal]` to a page.
- Users must be logged in to view.

### 2. Map Settings
- Go to **Pool Safe → Settings**.
- Enter custom map tile URL (default: OpenStreetMap).
- Set attribution text.

### 3. Email/SMTP (Optional)
- Go to **Pool Safe → Email**.
- Enable SMTP and enter:
  - Host (e.g., `smtp.gmail.com`)
  - Port (`587` for TLS, `465` for SSL)
  - Username/password
  - From email and name
- Enable ticket notifications.

### 4. HubSpot CRM (Optional)
- Go to **Pool Safe → HubSpot**.
- Enter your HubSpot API key (private app).
- Enter Portal ID (e.g., `21854204`).
- Enable auto-sync for partners and/or tickets.
- Manual sync available via REST or admin.

### 5. Import Partners
- Go to **Pool Safe → Import** or use Support Tools panel.
- Upload CSV or Excel (.xlsx) with header:
  `user_login,user_pass,number,display_name,top_colour,company_name,management_company,units,street_address,city,state,zip,country,lock,master_code,sub_master_code,lock_part,key,phone`
- Only `company_name` required. Provide `user_login` + `user_pass` to auto-create linked account.
- Lock columns stored as restricted meta (support/admin only).

## User Roles & Capabilities

### Administrator
- Full access to all CPTs, settings, lock info, HubSpot sync.

### PSP Support (`psp_support`)
- Create/edit tickets, partners, calendar events.
- View and edit lock information.
- Upload attachments.
- Access all REST endpoints.
- Edit portal branding colors (primary, hover, lock highlight) via Support Tools.
- Update partner Top Colour field and lock meta from frontend.

### PSP Partner (`psp_partner`)
- View own partner data.
- Create tickets.
- View notifications.
- Read-only access via REST (no lock info).

## Customization

### Add Custom Meta Fields
Edit `includes/class-psp-partners.php` and register new post meta:
```php
self::register_meta('custom_field', 'string');
```

### Extend REST API
Add routes in `includes/class-psp-rest.php` or create a new class and register in `class-psp-plugin.php`.

### Change Map Provider
Update tile URL in **Pool Safe → Settings** (e.g., Mapbox, Google Maps tiles).

## Production Deployment

### Standalone (No GitHub)
- Plugin works fully offline.
- No auto-updater (update manually via ZIP upload).
- All features independent of GitHub connection.

### Version Updates
1. Update version in `wp-poolsafe-portal.php` header and `PSP_VERSION` constant.
2. Update `readme.txt` Stable tag and Changelog.
3. Commit and push to repository.
4. CI will build and package ZIP artifact.

### Creating a Release
1. Tag repository: `git tag v1.0.0 && git push --tags`
2. Create GitHub Release and attach CI ZIP artifact.
3. Distribute ZIP to customers.

## Security Best Practices

- All user input sanitized (`sanitize_text_field`, `wp_kses_post`).
- All output escaped (`esc_html`, `esc_attr`, `esc_url`).
- REST endpoints use `current_user_can()` permission checks.
- SMTP passwords stored in options (not encrypted by default; use a secrets manager or vault for production).
- Lock info restricted to admin/support only.
- Nonces used for admin forms and REST (via `X-WP-Nonce`).

## Troubleshooting

### Shortcode shows "Loading..." forever
- Check browser console for errors.
- Verify REST API accessible: `/wp-json/poolsafe/v1/health`
- Ensure user is logged in.

### Email notifications not sending
- Check SMTP settings.
- Test connection using a plugin like WP Mail SMTP Tester.
- Check server error logs.

### HubSpot sync fails
- Verify API key is valid (test in HubSpot).
- Check response in browser dev tools or enable WP_DEBUG.
- Ensure custom properties exist in HubSpot (loungenie_units, partner_id, etc.).

### Map not showing
- Check Map Settings for valid tile URL.
- Ensure Leaflet script loads (view page source).
- Partners must have valid latitude/longitude.

## Development

### Local Testing
1. Install in a local WordPress environment (Local by Flywheel, XAMPP, Docker).
2. Activate and configure.
3. Add test partners via Import or manually.
4. Create tickets and test REST endpoints.

### Debugging
- Enable `WP_DEBUG` and `WP_DEBUG_LOG` in `wp-config.php`.
- Check `/wp-content/debug.log` for errors.

### CI/CD
- GitHub Actions workflow at `.github/workflows/plugin-ci.yml`.
- Runs PHP lint and packages ZIP on push to `main`.

## Support & Contact

- **Issues:** Report on GitHub (if private repo, contact team directly).
- **Email:** support@poolsafeinc.com
- **Documentation:** This README and inline code comments.

## License

GPLv2 or later. See [LICENSE](LICENSE) file.

## Changelog

### 1.3.1 - Enhancements & Bulk Import Expansion
- Multi-line welcome banner (company, management company, units)
- Fixed Top Colour dropdown palette (Ice Blue, Classic Blue, Ducati Red, Yellow, Custom)
- Added phone meta field and display in profiles
- CSV/Excel bulk import with 19 columns & automatic user creation
- Quick Create (company + user) support panel form
- Full tickets & service records display in company profile (no slicing)
- Theme color inheritance enforced
- Excel (.xlsx) parsing added

### 1.0.0 - Production Release
- Email/SMTP notifications
- HubSpot CRM integration
- Calendar events CPT
- Partner amenities (F&B, USB, safe lock)
- Partner gallery with WP media
- Service records (travel logs)
- Lock info with restricted access
- CSV import for partners
- i18n support
- Conditional asset loading
- Comprehensive REST API

### 0.1.0 - Initial Release
- CPTs: Partners, Tickets
- Roles: PSP Partner, PSP Support
- Basic REST endpoints
- Shortcode with map and tickets

---

**Built with ❤️ for Pool Safe Inc**

## Supported Shortcodes (Summary)

Primary interface and modular components:

```
[poolsafe_portal]             # Full portal (partners, tickets, map, tools)
[poolsafe_tickets]            # Ticket form + list (filters, attachments)
[poolsafe_partners]           # Partner directory (lock info: support/admin)
[poolsafe_map]                # Map (support/admin only)
[poolsafe_service_records]    # Service history timeline (pagination)
[poolsafe_kb]                 # Knowledge base / articles
[poolsafe_calendar]           # Events & scheduling
[poolsafe_notifications]      # User notifications
[poolsafe_dashboard]          # Stats dashboard widgets
[poolsafe_support_tools]      # Support tools panel
[poolsafe_user_management]    # User creation & management (support/admin)

# Aliases (same output)
[poolsafe_tools] [psp_support_tools]
[poolsafe_users] [psp_user_management]
```

Full details and usage examples are documented in `SHORTCODES-REFERENCE.md`.

## Setup & Integration Docs

Refer to these focused guides for configuration:

- Azure AD SSO: `AZURE-AD-SETUP.md`
- HubSpot CRM: `HUBSPOT-SETUP.md`
- Outlook / Email-to-Ticket: `OUTLOOK-EMAIL-SETUP.md`, `EMAIL-TO-TICKET-SETUP.md`
- Setup Wizard Flow: `SETUP-WIZARD-GUIDE.md`
- Deployment: `READY-TO-DEPLOY.md`
- Testing: `INTEGRATION-TEST-PLAN.md`

