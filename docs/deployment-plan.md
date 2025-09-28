# Deployment Plan — Pool Safe Inc Support Partner Portal

Last updated: 2025-09-28

## Goals

- Provide a clear, repeatable deployment process with minimal downtime.
- Preserve existing features and data integrity.
- Support fast rollback via blue-green strategy.

## Environments

- Production: VPS (Linux) accessed via SSH; scripts live under `/opt/deploy-blue-green.sh`.
- CI: GitHub Actions triggers blue-green deployment on main branch when secrets are present.

## Pre-Deployment Checklist

- [ ] CI pipeline passing (backend + frontend + E2E smoke).
- [ ] Secrets configured in GitHub repository:
  - `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- [ ] Disk space and memory adequate on VPS.
- [ ] Backup recent databases (see Backup & Recovery).

## Blue-Green Strategy

- Deploy to idle color (green) while blue serves traffic.
- Health-check the new stack.
- Switch traffic to green when healthy.
- Keep blue as rollback target until next deploy.

## CI/CD Workflow (summary)

- Workflow file: `.github/workflows/ci.yml`
- On push to `main`:
  1. Build and test backend/frontend.
  2. Run Cypress E2E against preview.
  3. If all succeed and secrets exist, SSH into VPS and run `/opt/deploy-blue-green.sh deploy`.
  4. Run `/opt/deploy-blue-green.sh status` and `health` checks.

## Manual Deployment (fallback)

If CI deploy is unavailable, use SSH from your workstation:

```bash
ssh -i <keyfile> <user>@<host>
# On the VPS
sudo /opt/deploy-blue-green.sh deploy
sudo /opt/deploy-blue-green.sh status
sudo /opt/deploy-blue-green.sh health
```

## Health Checks

- Backend: `GET /api/health`, `/api/healthz`, `/api/readyz`
- Frontend: hit `/` and ensure assets load (nginx logs 200s)
- Metrics: `GET /api/metrics` (Prometheus format)

## Rollback

- Trigger immediate switch back to previous color:

```bash
sudo /opt/deploy-blue-green.sh switch
```

- Validate health. Keep incident notes for postmortem.

## Backup & Recovery (summary)

- Databases: `backend/prisma/*.db`
- Backups: retain 7 daily + 4 weekly snapshots off-host.
- Restore: stop backend, replace DB files with snapshot, start backend, run migrations if needed, verify.

## Configuration & Secrets

- Backend `.env` contains DB and integration settings. Do not commit.
- Frontend built assets are static and environment-agnostic in this setup.

## Observability

- Logs: pino (backend), nginx (frontend container).
- Consider external uptime/error monitoring (Datadog, UptimeRobot, Azure Monitor).

## Risks & Mitigations

- Incomplete secrets: deploy step exits neutral (code 78) and does not fail the build.
- Port conflicts: containers should use distinct ports; script enforces strict port binding.
- Long migrations: pre-validate Prisma schema changes and run on the green environment before cutover.

## Runbook (Short)

1) Confirm CI green on main.
2) Ensure backups exist.
3) Deploy (CI or manual).
4) Validate health and basic flows.
5) Switch traffic and monitor.
6) If issues, rollback immediately and investigate.
