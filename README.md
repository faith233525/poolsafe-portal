# LounGenie Support Portal (Scaffold)

- `frontend/` - React + TypeScript frontend scaffold (Vite)
- `prisma/` - Prisma schema
- `openapi/` - Minimal OpenAPI file
- `docs/` - Project plan, tech stack, and integrations

1. Backend

```powershell

cd backend

copy .env.example .env

npm install
npx prisma generate
npm run dev
```

2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Testing the Application

Once both servers are running:

- Backend: http://localhost:4000/api/health
- Frontend: http://localhost:5173

Test endpoints:

- `GET /api/health` - Backend health check

- `POST /api/partners` - Create partner (requires companyName)

The frontend ticket form will automatically submit to the backend via Vite proxy.

Notes:

- The Prisma schema uses `DATABASE_URL` environment variable. For quick local testing you can use SQLite by changing `provider` to `sqlite` in `prisma/schema.prisma` and updating `DATABASE_URL`.
- Azure AD, HubSpot, and email integrations are planned in `docs/integrations.md`.

Contact: project owner or repo maintainer for credentials and Azure registration details.

## Frontend Test Setup & Troubleshooting

### Running Frontend Tests

```powershell
cd frontend
npm install
npm test
```

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
5. Access frontend at http://localhost:5173 and backend at http://localhost:4000.

### Troubleshooting

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
