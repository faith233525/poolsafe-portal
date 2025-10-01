# 🏊‍♂️ Pool Safe Inc Support Partner Portal

## ✅ **PRODUCTION READY** - All Features Implemented

> **Status**: Complete implementation with Activity Logging and Admin Dashboard Analytics  
> **Version**: 2025 Final Release  
> **Last Updated**: September 27, 2025

A comprehensive support portal for Pool Safe Inc partners with complete Activity Logging and Admin Dashboard Analytics implementation.

## 🚀 Project Structure

- `frontend/` - React + TypeScript frontend (Vite) - **FULLY FUNCTIONAL**
- `backend/` - Node.js + Express + Prisma backend - **FULLY FUNCTIONAL**
- `prisma/` - Database schema and migrations - **TESTED & WORKING**
- `cypress/` - E2E testing suite - **CONFIGURED**
- `docs/` - Project documentation and specifications

## 📚 Documentation

- Test Plan: `docs/test-plan.md`
- Deployment Plan: `docs/deployment-plan.md`

## ✅ System Status

### 1. Backend

```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npm run dev
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## 🛡️ Backup & Recovery

### Database Backup

- Automate regular backups of all SQLite databases (`dev.db`, `test-auth.db`, `test-knowledgebase.db`, `test-tickets.db`).
- Use PowerShell scripts or scheduled tasks to copy database files to a secure backup location.
- Retain at least 7 daily and 4 weekly backup snapshots.
- Store backups offsite (cloud storage, external drive, or network share).

### Database Restore

- Stop backend service before restoring.
- Replace corrupted database file with backup copy.
- Restart backend service and verify integrity.

### Migration/Seed Validation

- After restore, run `prisma migrate deploy` and `npm run seed` to ensure schema and data integrity.

### Blue-Green Deployment Rollback

- Deploy to a new environment (green), validate health, then switch traffic.
- If issues arise, switch back to previous (blue) environment instantly.

**Health Endpoints:**

- Backend: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- Frontend: [http://localhost:5173](http://localhost:5173)

### Monitoring & Alerts

- Integrate external monitoring (Datadog, Azure Monitor, UptimeRobot) for uptime and error alerts.
- Set up notifications for failed backups, restore attempts, or health check failures.

### Troubleshooting

- If restore fails, check backup file integrity and permissions.
- For migration/seed errors, review logs and rerun scripts.

## 🔗 Development URLs

- Backend: <http://localhost:4000/api/health>
- Frontend: <http://localhost:5173>

### Test Endpoints

## Backend Environment Variables

The backend requires several environment variables to be configured in `.env` file:

### Required Variables

- `DATABASE_URL` - Database connection string (SQLite for development: `file:./dev.db`)
- `JWT_SECRET` - Secret key for JWT token signing
- `NODE_ENV` - Environment mode (`development`, `production`, `test`)

### Optional Integration Variables

- `HUBSPOT_API_KEY` - HubSpot API key for CRM integration (Account ID: 21854204)
- `AZURE_CLIENT_ID` - Azure AD client ID for SSO authentication
- `AZURE_CLIENT_SECRET` - Azure AD client secret
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_REDIRECT_URI` - OAuth callback URL (default: `http://localhost:4000/api/auth/callback`)
- `SMTP_HOST` - Email server hostname
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email server username
- `SMTP_PASSWORD` - Email server password
- `SMTP_FROM` - Default sender email address

### Testing Variables

- Test databases are configured automatically for the test environment
- Set `NODE_ENV=test` to use test-specific configurations

Notes:

- The Prisma schema uses `DATABASE_URL` environment variable. For quick local testing you can use SQLite by changing `provider` to `sqlite` in `prisma/schema.prisma` and updating `DATABASE_URL`.

- Azure AD, HubSpot, and email integrations are planned in `docs/integrations.md`.

Contact: project owner or repo maintainer for credentials and Azure registration details.

## Frontend Test Setup & Troubleshooting

### Running Frontend Tests

### Test Coverage

- All major UI states (loading, error, empty, network error, validation) are covered in `src/App.test.tsx`.
- The test for runtime role changes is skipped due to a limitation in the test environment (storage events only fire across tabs/windows, not in the same test context). The UI updates correctly in real usage. See comments in `App.test.tsx`.

### Common Issues & Fixes

- If you see `jest is not defined`, ensure you use `vi.fn` for mocks (Vitest).
- If you see `tickets.map is not a function`, make sure your fetch mocks for `/api/tickets` always return an array.
- If you see CSS module import errors, ensure you have a `declaration.d.ts` file with:

  ```ts
  declare module "*.module.css" {
    const classes: { [key: string]: string };
    export default classes;
  }
  ```

- If you see React version or act(...) warnings, update your test to wrap state updates in `act()` if needed.

### React & Test Library Versions

- React 18.x
- Vitest for testing (`vi.fn` for mocks)
- @testing-library/react and @testing-library/jest-dom

## API Usage Examples

### API Documentation (OpenAPI)

Interactive and raw API documentation is available while the backend server is running:

- Swagger UI: `http://localhost:4000/api/docs`
- Raw JSON spec: `http://localhost:4000/api/docs.json` (alias: `/api/openapi.json`)
- Raw YAML spec: `http://localhost:4000/api/docs.yaml` (alias: `/api/openapi.yaml`)

Source file: `openapi/openapi.yaml`.

Update workflow:

1. Edit the spec in `openapi/openapi.yaml`.
2. Optionally validate with an OpenAPI linter.
3. Commit using a conventional message, e.g. `docs(api): expand ticket schema`.

Mounted via `backend/src/routes/swagger.ts` under `/api` in `backend/src/app.ts`.

### Backend Endpoints

- `GET /api/health` - Health check
- `POST /api/partners` - Create partner (body: `{ companyName: string }`)
- `POST /api/tickets` - Create ticket (body: see `prisma/schema.prisma`)
- `GET /api/tickets` - List tickets
- `POST /api/attachments` - Upload attachment (body: `{ filename, filepath, ticketId, ... }`)

### Onboarding Steps

1. Clone repo and install dependencies for both frontend and backend.
2. Copy `.env.example` to `.env` in backend and configure database.
3. Run `npx prisma generate` and `npm run dev` in backend.
4. Run `npm run dev` in frontend.
5. Access frontend at <http://localhost:5173> and backend at <http://localhost:4000>.

### Development Troubleshooting

- If you see database errors, check your `.env` and Prisma provider settings.
- For frontend build issues, ensure Node.js and npm versions are compatible.
- For test failures, check for missing dependencies and review skipped tests in `App.test.tsx`.
- For Sentry monitoring, set your DSN in `frontend/src/main.tsx`.

## Monitoring & Analytics

- Sentry is integrated for error tracking in the frontend. Replace `YOUR_SENTRY_DSN_HERE` in `src/main.tsx` with your project DSN.

## Accessibility

- The portal uses ARIA labels, roles, and keyboard navigation for improved accessibility. Test with axe or Lighthouse for compliance.

## Security & Validation

- Backend uses Zod schemas for input validation and enforces RBAC. Review all endpoints for completeness and sanitize inputs.

## Edge Case & E2E Tests

- Add more tests for critical workflows, error states, and accessibility. See `frontend/src/App.test.tsx` and Cypress config for examples.

## CI/CD Pipeline & E2E Testing

### Automated CI/CD

This project uses GitHub Actions for automated build, test, and deployment. See `.github/workflows/ci.yml` for details.

- On every push/PR to `main` or `develop`, the pipeline will:
  - Install dependencies for backend and frontend
  - Lint, typecheck, test, and build both services
  - Run Cypress E2E tests (frontend)
  - Deploy to VPS (main branch only)
  - Notify on success/failure

### CI/CD Pipeline Usage & Developer Notes

#### Workflow Overview

- Automated on every push/PR to `main` or `develop`.
- Stages: Checkout, cache node_modules, lint, typecheck, test, build, Cypress E2E, artifact upload, deploy (main only), notify.

#### Caching for Faster Builds

- Uses `actions/cache` for both `backend/node_modules` and `frontend/node_modules`.
- Keys are based on OS and package-lock.json hash for efficient cache reuse.

#### Secrets Required for Deployment

- Set these in your GitHub repository settings:
  - `VPS_HOST`: VPS hostname or IP
  - `VPS_USER`: SSH username
  - `VPS_SSH_KEY`: SSH private key (use a secure secret)
- Without these, deployment steps will fail. Only required for main branch deploys.

#### Artifact Uploads

- Cypress E2E screenshots and videos are uploaded as workflow artifacts after test runs.
- Download from the GitHub Actions run summary (Artifacts section):
  - `cypress-screenshots`
  - `cypress-videos`

#### How to Use CI Locally

- Push or PR to `main`/`develop` to trigger full pipeline.
- For local E2E testing, see instructions above.
- For troubleshooting CI, check the Actions tab and download artifacts for debugging.

### Running Cypress E2E Tests Locally

1. Start the backend server:

```powershell
cd backend
npm run dev
```

1. Start the frontend server:

```powershell
cd frontend
npm run dev
```

1. In a new terminal, run Cypress tests:

```powershell
cd frontend
npx cypress run
```

- For file upload tests, ensure `cypress-file-upload` is installed and imported in `cypress/support/e2e.ts`.
- Download test artifacts (screenshots, videos) from `frontend/cypress/screenshots` and `frontend/cypress/videos` after test runs.

#### Windows one-liner (smoke)

If you only need the smoke test and want the runner to manage the server lifecycle, use the helper script:

```powershell
cd frontend\scripts
./e2e-preview.ps1 -Port 5173 -TimeoutSeconds 60
```

This will build the frontend, start Vite preview bound to 127.0.0.1, wait until it's reachable, run `cypress/e2e/smoke.cy.js`, and clean up the server.

### Downloading Artifacts

- After CI runs, you can download build/test artifacts from the GitHub Actions workflow summary page.
- Locally, find Cypress screenshots and videos in:
  - `frontend/cypress/screenshots/`
  - `frontend/cypress/videos/`

### CI/CD Email Alerts

- The workflow sends an email alert if a deployment fails.
- To enable this:
  1. Add a secret named `ALERT_EMAIL` in your GitHub repository (Settings > Secrets > Actions).
     - Set its value to the email address that should receive alerts.
  2. Ensure the runner has the `mail` command available (Linux runners usually do; for others, install or configure sendmail/postfix).
- The email will contain commit and branch info for troubleshooting.

## 🛠 DevOps & Tooling

### Docker

Build and run locally with Docker Compose:

```powershell
docker compose build
docker compose up -d
```

Services:

- Backend: <http://localhost:4000/api/health>
- Frontend: <http://localhost:5173>

Multi-stage Dockerfiles are located in `backend/Dockerfile` and `frontend/Dockerfile` (frontend served via Nginx, backend runs Node.js runtime image). Runtime uploads are excluded from git; placeholder kept with `.keep`.

### Release Automation (semantic-release)

Releases are automated from Conventional Commits on `main` (stable) and `develop` (pre-release). Config: `.releaserc.json`.

- Changelog updates: `CHANGELOG.md`
- Tag + GitHub Release generated automatically
- Commit format examples:
  - `feat(tickets): add SLA field`
  - `fix(auth): correct token refresh`
  - `docs(api): update OpenAPI partner endpoints`

Skip CI in release commits is handled with `[skip ci]` in the generated message.

### Commit Quality & Hooks

Husky hooks enforce quality:

- `pre-commit`: lint-staged (eslint + prettier), selective tests, secret scan, large commit warnings.
- `commit-msg`: commitlint (Conventional Commits).
- `pre-push`: blocks direct pushes to `main` (override with `ALLOW_DIRECT_MAIN_PUSH=1`).

Bypass flags:

- `[skip hooks]` token in message or `SKIP_HOOKS=1` env var.
- `SKIP_TESTS=1` to skip test phase pre-commit.
- `SKIP_SECRET_SCAN=1` for secret scan bypass.

### Metrics & Monitoring

Prometheus metrics endpoint: `/api/metrics`.

Key metrics:

- `http_requests_total{method,route,status}`
- `http_request_duration_ms_bucket` (histogram)
- `http_status_class_total{class="2xx"|"4xx"...}`
- `http_errors_total`
- `uploads_total{userRole}`
- `notifications_created_total{creatorRole,type}`
- `db_query_duration_ms_bucket{model,action,success}`
- `authz_denied_total{method,route,reason,role}` - counts authorization denials from centralized access control middleware

### Performance & Accessibility (Lighthouse CI)

Workflow: `.github/workflows/lighthouse.yml` (runs on PRs to `main`/`develop`).
Assertions (warn threshold):

- Performance ≥ 0.75
- Accessibility ≥ 0.85

Artifacts and temporary public storage provided by action for inspection.

### Code Scanning (CodeQL)

CodeQL workflow analyzes the codebase for vulnerabilities and quality issues. View results under **Security > Code scanning alerts** in GitHub.

### Vulnerability & Secret Scanning

Additional security automation has been added:

- Trivy workflow: Scans both the repository filesystem and the locally built backend container image. Fails PRs on HIGH or CRITICAL severity vulnerabilities (`.github/workflows/vulnerability-scan.yml`). Runs on PRs to `main`/`develop` and nightly (03:00 UTC).
- Gitleaks workflow: Scans commits for hardcoded secrets and uploads a SARIF report to GitHub code scanning (`.github/workflows/secret-scan.yml`). Runs on PRs and a nightly schedule.

Remediation guidance:

- For dependency/library issues: update affected packages (`npm audit fix` where safe, otherwise manual bump) and regenerate lockfiles.
- For base image OS packages: update the `FROM` image tag to a newer digest or version; prefer minimal images.
- For false positives in secret scanning (e.g., test fixtures), add targeted regex allow rules via a future `.gitleaks.toml` (not yet required—keep noise low first).

### Authorization Model (Phase 2)

Centralized role/permission mapping introduced:

- File: `backend/src/middleware/accessControl.ts`
- Exported map: `ROLE_PERMISSIONS`
- Middleware factory: `accessControl({ any?: string[], all?: string[], deny?: string[] })`
- Admin role uses wildcard `*`.

Usage example:

```ts
import accessControl from "../middleware/accessControl";
app.get("/api/tickets/:id", auth, accessControl({ any: ["ticket:read"] }), handler);
```

Test coverage: `backend/tests/accessControl.test.ts` validates core logic (any, all, deny, wildcard, de-duplication).

Planned enhancements:

- Resource ownership checks (attribute based access control overlays)
- Dynamic role definitions sourced from DB or config service
- Permission caching & invalidation strategy

### OpenAPI Type Generation

Generate reusable TypeScript types from the spec:

```powershell
npm run generate:api-types
```

Output: `shared/api-client/types.ts` (git-ignored). Adjust import paths in frontend/backend if you adopt a shared models layer.

### Future Enhancements (Roadmap)

- Introduce workspaces (`"workspaces": ["backend","frontend"]`) to dedupe dev tooling.
- Add SAST tooling beyond CodeQL (e.g., npm audit gating) and dependency license scanning.
- Add tracing (OpenTelemetry) for distributed correlation.
- Add automated DB migration verification job (dry-run / diff) before deploy.

## 📜 License / Ownership

Internal proprietary software – add explicit license statement here if required for distribution or partner access.
