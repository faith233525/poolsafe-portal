# Pool Safe Partner Portal (WordPress Plugin)

This folder contains a new WordPress plugin: `wp-poolsafe-portal`.

## Features (MVP)

- Custom roles: PSP Partner, PSP Support
- Custom post types: Partners (`psp_partner`) and Tickets (`psp_ticket`)
- REST API namespace: `/wp-json/poolsafe/v1`
  - `GET /health` – simple health check
  - `GET /tickets` – list tickets (logged-in users)
  - `POST /tickets` – create ticket (Support/Admin only)
  - `GET /partners/map` – partner map data
- Shortcode: `[poolsafe_portal]` – renders a portal container and checks API health
- Admin Menu: Pool Safe dashboard with links to Partners and Tickets

## How to use locally

1. Zip the plugin folder:
   - Zip the contents of `wp-poolsafe-portal/` so the zip contains `wp-poolsafe-portal` at the root.
2. In your WordPress admin, go to Plugins > Add New > Upload Plugin and upload the zip.
3. Activate the plugin.
4. Create a page and add the shortcode `[poolsafe_portal]`.
5. Log in as an Administrator or PSP Support to see more capabilities.

## Create a new repository for the plugin

You can extract this folder into its own Git repository:

- New repo name suggestion: `poolsafe/wp-poolsafe-portal`
- Repo root should be the `wp-poolsafe-portal/` directory (so the plugin files are at repo root)
- Recommended files to add next:
  - CI for PHP lint (e.g., `composer.json` with `php -l` checks or `phpcs`)
  - PHPCS rules (`phpcs.xml`) and PHPStan config (`phpstan.neon`) if desired
  - Issue templates and release pipeline (GitHub Actions) for packaging a zip artifact

## Roadmap

- Frontend UI: Replace placeholder portal UI with a richer interface (React or native WP components)
- Authentication flows: SSO or JWT if required (via WP auth or external IdP)
- Notifications & attachments: Add endpoints and admin pages
- Map: Integrate Leaflet or Google Maps with real partner coordinates
- Importers: CSV/XLSX importers for partners and users
- Settings: Add Settings API to manage keys (SMTP, map API keys)
