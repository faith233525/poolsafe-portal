Summary: End-to-end testing is fully green. Adds CI to run backend/frontend/Cypress on PRs, stabilizes frontend tests and Cypress env, and cleans up repo artifacts.

Changes:
- CI: Add .github/workflows/ci.yml to run backend lint/typecheck/tests/build, frontend lint/typecheck/tests, and Cypress e2e (Chrome, Vite autostart).
- Scripts: Root package.json adds test:backend, test:frontend, test:e2e, test:all.
- Frontend: MSW v2 migration; disable MSW under Cypress; fix smoke header assertion; ensure accessible labels and robust submit flow.
- Backend: Response and validation consistency; SQLite-compatible queries; tests updated and green.
- Repo hygiene: Ignore SQLite DBs/journals, backend/uploads/, nested Prisma backend/prisma/prisma/, and Cypress artifacts; remove previously tracked binaries; add .gitkeep.
- Docs: Update docs/implementation-status.md with CI note and quick commands.

Test Results:
- Backend: All tests passing.
- Frontend unit: All tests passing.
- Cypress e2e: All specs passing (Chrome headless).

How to Run Locally:
- npm run test:backend
- npm run test:frontend
- npm run test:e2e
- npm run test:all

Notes:
- MSW starts only in dev and is disabled under Cypress.
- CI uses Node 20; adjust if runtime differs.

Checklist:
- [x] Tests pass locally
- [x] CI pipeline added
- [x] Repo artifacts ignored and cleaned
- [x] Docs updated
