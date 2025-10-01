# Test Plan — Pool Safe Inc Support Partner Portal

Last updated: 2025-09-28

## Objectives

- Verify core features end-to-end without breaking existing functionality.
- Maintain quality gates: lint, typecheck, unit/integration tests, E2E smoke, and CI stability.
- Provide clear commands and acceptance criteria for local and CI runs (Windows-friendly).

## Scope

In scope:

- Backend (Node/Express/TypeScript, Prisma/SQLite) under `backend/src/**`.
- Frontend (React/TypeScript/Vite) under `frontend/src/**`.
- E2E (Cypress) flows executed against Vite preview.
- CI pipeline checks in `.github/workflows/ci.yml`.

Out of scope:

- Third-party integrations (Azure AD, HubSpot, SMTP) beyond mocked/config guards.
- Non-app bootstrap/config files (e.g., Swagger mount, Sentry bootstrap).

## Test Types and Targets

### 1) Backend Unit & Integration (Vitest + Supertest)

- Areas: routes, middleware (auth, RBAC, rate limiting, requestId), services (activityLogger, analyticsService, notifications, tickets), utils.
- Data: Uses isolated SQLite databases in `backend/prisma/*test*.db` via test setup.
- Coverage goals (app modules):
  - Lines/Statements/Functions ≥ 95%
  - Branches ≥ 85% (stretch 95%)
- Commands (PowerShell):

  ```powershell
  cd backend
  npm install
  npx prisma generate
  npm run lint
  npm run typecheck
  npm test
  npm run build
  ```

### 2) Frontend Unit (Vitest + Testing Library)

- Areas: UI components/screens, role-specific visibility, form validation, error states, accessibility semantics.
- Notes: JSDOM logs network errors for relative fetch URLs; tests should mock fetch where relevant.
- Commands (PowerShell):

  ```powershell
  cd frontend
  npm install
  npm run lint
  npm run typecheck
  npm test
  npm run build
  ```

### 3) E2E (Cypress)

- Strategy: Run against Vite preview bound to `127.0.0.1:5173` for reliability.
- Current: smoke spec visiting `/` and asserting "Portal Login".
- Expansion: login (mock), navigate to Analytics Dashboard, create ticket (stubbed API).
- Command (PowerShell):

  ```powershell
  powershell -ExecutionPolicy Bypass -File frontend/scripts/e2e-preview.ps1
  ```

## Environments

- Local: Windows 10/11, Node 20.x, npm 10+.
- CI: GitHub Actions `ubuntu-latest`, Node 20.
- Ports: backend 4000, frontend 5173.

## Test Data and Seeding

- Test setup seeds fixtures per DB (see `backend/tests/setup.ts`, `backend/scripts/seed.ts`).
- No real secrets required; integrations disabled if not configured.

## Acceptance Criteria

- Lint/Typecheck: PASS (backend and frontend).
- Backend tests: PASS with coverage goals met for app modules.
- Frontend tests: PASS.
- E2E smoke: PASS locally and in CI.
- CI: green for non-deploy stages; deploy runs only on main with secrets present.

## Reporting

- Vitest coverage: text + HTML at `backend/coverage/index.html`.
- Cypress artifacts in CI (screenshots/videos).

## Risks & Mitigations

- Windows file locks on `node_modules`: kill `esbuild.exe`/`node.exe` and prefer `npm install` if `npm ci` is blocked.
- JSDOM limitations: guard window/document/MutationObserver; mock fetch for relative URLs.
- CI port reachability: use Vite preview and wait-on `http://localhost:5173`.

## Exit Criteria for Release

- All acceptance criteria met, no high-severity failing tests, E2E smoke green.
