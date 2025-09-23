# LounGenie Support Portal (Scaffold)

This repository contains a scaffold for the Pool Safe Inc. LounGenie Support Portal.

Folders:

- `backend/` - Node + TypeScript backend scaffold with Prisma schema
- `frontend/` - React + TypeScript frontend scaffold (Vite)
- `prisma/` - Prisma schema
- `openapi/` - Minimal OpenAPI file
- `docs/` - Project plan, tech stack, and integrations

Quick dev setup (Windows PowerShell):

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
- `POST /api/tickets` - Create a ticket (requires partnerId, subject)
- `GET /api/tickets` - List all tickets
- `GET /api/partners/:id` - Get partner info
- `POST /api/partners` - Create partner (requires companyName)

The frontend ticket form will automatically submit to the backend via Vite proxy.

Notes:

- The Prisma schema uses `DATABASE_URL` environment variable. For quick local testing you can use SQLite by changing `provider` to `sqlite` in `prisma/schema.prisma` and updating `DATABASE_URL`.
- Azure AD, HubSpot, and email integrations are planned in `docs/integrations.md`.

Contact: project owner or repo maintainer for credentials and Azure registration details.
