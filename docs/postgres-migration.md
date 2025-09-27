# Migrate Prisma from SQLite to Postgres

This guide walks you through switching the backend from SQLite (current dev/tests) to Postgres (recommended for production), without breaking the currently green test suite.

## Overview

- Keep tests stable: retain SQLite for tests or switch tests to a disposable Postgres.
- Use Postgres for production and local Docker Compose.
- Create an initial Postgres migration and deploy it automatically at container startup.

## Prerequisites

- Docker Desktop installed (for local Postgres via docker-compose)
- Node 18+
- Prisma CLI available via `npm run prisma:*` scripts
- docker-compose.yml in repo already includes a `postgres` service

## Strategy Options

1. Postgres for prod, SQLite for tests (two schemas)
   - Pros: Tests remain fast and deterministic
   - Cons: Maintain 2 Prisma schemas (SQLite and Postgres)

2. Postgres everywhere (prod + tests)
   - Pros: One schema and one DB platform
   - Cons: Tests run a bit slower (startup cost), needs DB orchestration in tests

Option 1 is the least disruptive. Option 2 is simplest long-term.

## Safe Migration Plan (Option 1: Postgres for prod, SQLite for tests)

1. Back up your SQLite databases
   - Copy files under `backend/prisma/*.db` (dev/test DBs) to a safe location.

2. Create a new Postgres Prisma schema file (side-by-side)
   - Create `backend/prisma/schema.postgres.prisma` (do NOT commit an active duplicate in the same folder while `schema.prisma` exists to avoid Prisma lint collisions).
   - Use your current models but set:
     - `provider = "postgresql"`
     - `url = env("DATABASE_URL")`

3. Generate the initial Postgres migration
   - From your current datamodel, generate an initial SQL migration against Postgres:
     - `npx prisma migrate diff --from-empty --to-schema-datamodel backend/prisma/schema.postgres.prisma --script > backend/prisma/migrations/000_init/migration.sql`
   - Commit the generated SQL migration.

4. Wire Postgres schema for production builds
   - For production CI/CD or docker-compose start, set `PRISMA_SCHEMA=backend/prisma/schema.postgres.prisma` in the environment.
   - Ensure `DATABASE_URL` points to your Postgres instance (docker-compose already defines a Postgres service and healthcheck).
   - At app start, run `prisma migrate deploy` before launching the server (docker-compose already does this).

5. Keep tests on SQLite
   - Keep `backend/prisma/schema.prisma` as SQLite for tests, or create `schema.sqlite.prisma` and set `PRISMA_SCHEMA` during tests only.
   - Ensure `DATABASE_URL` for tests uses `file:.../test-*.db` paths (as it does today).

6. Seed
   - Your seed script is DB-agnostic and uses Prisma, so it works for both DBs. For Postgres, ensure `DATABASE_URL` and `PRISMA_SCHEMA` are set accordingly during seed runs.

7. Validate locally (docker-compose)
   - `docker compose up --build` will bring up Postgres and the backend.
   - Confirm migrations apply and the app starts without errors. Hit `/api/healthz` and run a quick smoke (login, create a ticket, etc.).

## Single-DB Plan (Option 2: Postgres for prod + tests)

1. Update the primary schema
   - Replace `backend/prisma/schema.prisma` datasource with `provider = "postgresql"` and `url = env("DATABASE_URL")`.

2. Create the initial migration
   - `npx prisma migrate diff --from-empty --to-schema-datamodel backend/prisma/schema.prisma --script > backend/prisma/migrations/000_init/migration.sql`
   - `npx prisma migrate deploy` to your local Postgres.

3. Adjust tests
   - Provide a dedicated Postgres database for tests (use a unique `DATABASE_URL` per test run or a fixed DB that is reset between runs).
   - Add a script to reset the DB before tests (drop/recreate schema or run `migrate reset` with `--force`).

4. CI considerations
   - Start a Postgres service in CI, export `DATABASE_URL`, run `prisma migrate deploy`, then run tests.

## Environment Variables

- DATABASE_URL (Postgres):
  - Example: `postgresql://postgres:postgres@localhost:5432/appdb?schema=public`
- PRISMA_SCHEMA (optional):
  - Example: `backend/prisma/schema.postgres.prisma` (for prod)
  - Leave unset for tests to use SQLite schema by default.

## Notes and Caveats

- Prisma reads a single schema per process. If multiple `.prisma` files exist in the same folder and tools scan them, you may see duplicate generator/source/model errors. Avoid committing an active second schema in the same folder unless you control `PRISMA_SCHEMA` and tooling.
- For dual-schema setups, consider storing the non-active schema under a subfolder, e.g. `backend/prisma/schemas/schema.postgres.prisma`, and set `PRISMA_SCHEMA` accordingly in production.
- Don’t commit production credentials. Use secrets for `DATABASE_URL` in CI/CD and servers.

## Rollback

- If you need to revert, point the app back to SQLite by resetting `PRISMA_SCHEMA` and `DATABASE_URL` to their previous SQLite values and restart the app.

---

If you’d like, I can implement Option 1 (dual schemas) or Option 2 (single Postgres) for you now. Let me know which path you prefer.
