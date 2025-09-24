# LounGenie Support Portal - Project Plan

Overview

- Build a centralized B2B support portal for Pool Safe Inc. to manage LounGenie devices, partners, tickets, service logs, calendar, and knowledge resources.

Phases

1. Discovery & Tech Choice (week 0)

- Confirm stakeholders, MVP scope, authentication (Outlook SSO), HubSpot requirements.

2. Data Model & API Design (week 1)

- Deliver Prisma schema, ERD, and OpenAPI spec for core resources (users, partners, tickets, service logs, calendar, attachments).

3. Backend Scaffold & Core Endpoints (week 2)

- Implement auth, partner read, ticket create/list, attachments, basic analytics endpoints. SQLite for dev; Postgres for production.

4. Frontend Scaffold & Partner Flows (week 3)

- Implement partner login, ticket submission, partner ticket dashboard, resources pages, responsive layout.

5. Support/Admin Flows & Map/Calendar (week 4)

- Support dashboards, assignment, service logs, calendar UI, map with pinned partners.

6. Integrations, Security & Testing (week 5)

- Azure AD SSO, Outlook email notifications, HubSpot sync, encryption of sensitive fields, end-to-end tests.

7. Deployment & Handover (week 6)

- CI/CD to Azure App Service / Container Apps, production DB migrations, backup, monitoring, documentation and handover.

MVP Scope (minimum to launch a usable portal)

- Partner: submit ticket form, view ticket list/status, view company info and resources.
- Support: view/all tickets, assign tickets, add internal notes, upload documents for partner tickets.
- Admin: create/edit partners, view analytics dashboard, manage staff & videos.
- Core infra: auth (partner local + Azure AD for staff), attachments storage, notifications via Outlook, basic HubSpot sync.

Acceptance Criteria

- Users can create tickets and see status changes.
- Support can assign and resolve tickets with internal notes.
- Admin can create partners and view partner details on the map.

Next Deliverable

- Tech stack recommendation and trade-offs (`docs/tech-stack.md`).

---

## Roadmap (B2B Focus)

### Q4 2025

- Custom reporting dashboards for partners
- Bulk ticket actions and advanced filtering
- Enhanced onboarding guides and help center

### Q1 2026

- Live chat and SLA tracking for support
- Partner portal customization options
- API integrations (HubSpot, Outlook, etc.)

### Ongoing

- Regular feedback review and feature prioritization
- Performance and security improvements
- Business workflow enhancements based on partner/support/admin input

---
