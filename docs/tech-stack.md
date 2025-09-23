# Tech Stack Recommendation

Recommended stack (opinionated, balances speed-to-market and maintainability):

- Backend: Node.js + TypeScript (Express or NestJS)
  - Fast to iterate, TypeScript safety, rich ecosystem (Prisma, Passport/Azure AD libs).
- ORM: Prisma
  - Strong DX, great for TypeScript, generates migrations, works with Postgres and SQLite.
- Database: PostgreSQL (production), SQLite (local/dev)
  - Postgres for reliability, JSON fields, GIS extensions if needed.
- Auth: Azure AD (Outlook SSO) for Support/Admin; local email/password for Partners with optional 2FA
  - Use MSAL or passport-azure-ad for staff SSO; send partner invites via email.
- Frontend: React + TypeScript + Vite
  - Component-driven, good ecosystem, responsive UIs, many libraries for maps and calendars.
- File Storage: Azure Blob Storage (or S3)
  - Store attachments, videos; serve via secure signed URLs.
- Notifications/Email: Outlook SMTP / Microsoft Graph
  - Use Microsoft Graph API for sending emails and calendar invites, integrate with Azure AD.
- Integrations: HubSpot (server-to-server sync)
  - Use HubSpot API to push ticket/partner interactions and map owner/rep relationships.
- Deployment: Azure (App Service or Container Apps) or Azure Static Web Apps + Azure Functions for serverless API
  - Azure simplifies Azure AD integration and Outlook/Graph auth flows.
- Monitoring: Application Insights
  - For performance and logging.
- CI/CD: GitHub Actions
  - Build/test/deploy to Azure.

Trade-offs

- Node/TypeScript vs Python: Node offers better first-class TypeScript support and Prisma ecosystem; Python (Django/FastAPI) is fine if team prefers Python.
- Monolith vs Microservices: Start monolith for MVP; split later if necessary.

Developer Experience

- Use Prisma migrations and seeders.
- Centralized logging and feature-flag support for toggling map/calendar features.

Security

- Encrypt sensitive fields at rest (application-level encryption for lock/master codes).
- Store passwords hashed (bcrypt/argon2).
- Enforce RBAC and field-level access (sensitive fields only visible to Admin/Support).

Estimated cost considerations

- Azure App Service + Postgres + Blob Storage + AD + HubSpot API usage.
- Prefer reserved instances for Postgres if long-term.
