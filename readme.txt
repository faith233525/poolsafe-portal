=== Pool Safe Partner Portal ===
Contributors: poolsafe
Tags: partners, tickets, support, map, crm
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.3.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A complete partner and support portal for Pool Safe Inc with tickets, partner data, map integration, email notifications, HubSpot CRM sync, and calendar events.

== Description ==

This plugin provides a comprehensive solution for the Pool Safe Partner & Support Portal:

**Core Features:**
- Custom roles: PSP Partner, PSP Support (with granular capabilities)
- Custom Post Types: Partners, Tickets, Notifications, Service Records, Calendar Events
- Partner amenities tracking: F&B call button, USB charging, safe lock
- Partner gallery with media library integration
- Secure lock information management (restricted to support/admin)
- Travel logging via service records
- Real-time notifications system

**Integrations:**
- Email/SMTP: Configurable email notifications for tickets and events
- HubSpot CRM: Automatic partner contact and ticket deal sync
- Microsoft Outlook/Calendar: Ready for OAuth integration (optional)
- Azure AD SSO: Ready for enterprise authentication (optional)

**REST API Namespace:** /wp-json/poolsafe/v1
- GET /health
- GET/POST /tickets
- GET /partners/map (Leaflet-powered map with markers)
- GET/PUT /partners/{id}/lock-info (restricted)
- GET/POST /notifications
- GET /partners/{id}/gallery
- GET/POST /service-records
- GET/POST /calendar-events
- POST /hubspot/sync/partner/{id}
- POST /hubspot/sync/ticket/{id}

**Admin Features:**
- Dashboard with quick links
- CSV import for partners
- Settings pages for map tiles, email/SMTP, HubSpot
- Partner gallery management
- Calendar events management

**Frontend:**
- Shortcode: [poolsafe_portal]
- Role-based UI (Partner/Support/Admin views)
- Interactive partner map with Leaflet
- Ticket creation and tracking
- Responsive design respecting theme styles

**Shortcodes (Summary):**
`[poolsafe_portal]`, `[poolsafe_tickets]`, `[poolsafe_partners]`, `[poolsafe_map]`, `[poolsafe_service_records]`, `[poolsafe_kb]`, `[poolsafe_calendar]`, `[poolsafe_notifications]`, `[poolsafe_dashboard]`, `[poolsafe_support_tools]`, `[poolsafe_user_management]`
Aliases: `[poolsafe_tools]`, `[psp_support_tools]`, `[poolsafe_users]`, `[psp_user_management]`

See `SHORTCODES-REFERENCE.md` for full details.

**Setup Guides:** See `SETUP-WIZARD-GUIDE.md`, `AZURE-AD-SETUP.md`, `HUBSPOT-SETUP.md`, `OUTLOOK-EMAIL-SETUP.md`, `EMAIL-TO-TICKET-SETUP.md`.

== Installation ==

1. Upload the plugin folder to /wp-content/plugins/wp-poolsafe-portal
2. Activate the plugin via the Plugins menu in WordPress
3. Configure settings under Pool Safe → Settings, Email, and HubSpot
4. Add the shortcode [poolsafe_portal] to a page (requires logged-in user)
5. Optional: Configure SMTP for email notifications
6. Optional: Add HubSpot API key for CRM sync

== Frequently Asked Questions ==

= Does this work without HubSpot? =
Yes, HubSpot integration is optional. The portal works fully standalone.

= Can I use my own SMTP server? =
Yes, configure SMTP settings under Pool Safe → Email.

= How do I restrict lock information access? =
Lock info fields are only accessible to administrators and users with the `psp_support` role.

= Does it support Outlook/Azure AD login? =
The plugin is ready for OAuth integration. You can add a WordPress OAuth plugin or custom handler if needed.

== Screenshots ==

1. Portal shortcode with health check, map, and tickets
2. Admin dashboard with settings and import
3. Partner gallery management
4. Email and HubSpot settings

== Changelog ==

= 1.0.0 =
* Production release with all features
* Email/SMTP notifications
* HubSpot CRM integration (partners → contacts, tickets → deals)
* Calendar events CPT and REST
* Partner amenities: F&B call button, USB charging, safe lock
* Partner gallery with WP media library
* Service records (travel logs)
* Lock info with restricted access
* CSV import for partners
* i18n ready with languages/ folder
* Conditional asset loading (no site-wide enqueue)
* GPLv2+ license
* Comprehensive REST API
* Admin settings for map, email, HubSpot

= 0.1.0 =
* Initial release with CPTs, roles, REST, and shortcode

== Upgrade Notice ==

= 1.0.0 =
== 1.3.1 Notes ==
Shortcode documentation consolidated; older release notes archived under `docs/archive/`. Added user management & support tools summary.

Major release with email notifications, HubSpot integration, calendar events, amenities tracking, and partner galleries. Recommended for production use.
