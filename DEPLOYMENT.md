# Teacher-Student Platform — Deployment & Operations Guide

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [First-Time Deployment](#first-time-deployment)
4. [Regular Updates](#regular-updates)
5. [Rollback Procedures](#rollback-procedures)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

---

## Architecture

Three containers, defined in `docker-compose.prod.yml`:

- `tsp_db` — PostgreSQL 16, internal network only.
- `tsp_api` — the NestJS backend (built from `backend/Dockerfile`), joins both
  the internal network (to reach the DB) and the shared `proxy_network`.
- `tsp_web` — the React SPA build served as static files by Nginx (built
  from `frontend/Dockerfile`), joins `proxy_network` only.

SSL and public routing are **not** handled inside this repo. The server is
assumed to already run a shared `nginx-proxy` + `acme-companion`
(Let's Encrypt) stack — the same one used by other projects on this
machine (e.g. QuizBot). Each of `tsp_api` and `tsp_web` sets
`VIRTUAL_HOST` / `LETSENCRYPT_HOST` env vars for its own subdomain; the
shared proxy discovers them automatically over `proxy_network`, obtains a
certificate per subdomain, and reverse-proxies traffic to the right
container. If that shared proxy is not already running, set it up once
(nginx-proxy + acme-companion containers attached to an external
`proxy_network`) before running this project's deploy script.

Domain layout: two subdomains — one for the frontend, one for the API
(e.g. `app.yourdomain.uz` and `api.yourdomain.uz`). Both must resolve to
the server before deploying, or certificate issuance will fail.

**No domain yet?** Use [nip.io](https://nip.io) — a free wildcard DNS
service where `<anything>.<server-ip>.nip.io` resolves straight to
`<server-ip>`. It behaves exactly like a real domain (Let's Encrypt
issues valid certificates for it), so `API_DOMAIN`/`APP_DOMAIN` in `.env`
can simply be `api.<server-ip>.nip.io` / `app.<server-ip>.nip.io` with no
other changes to this setup. Swapping in a real domain later is just
editing those two lines and re-running `scripts/deploy.sh`.

## Prerequisites

- A Hetzner (or any) server with Docker & Docker Compose installed, and
  the shared `nginx-proxy` + `acme-companion` stack already running on
  `proxy_network`.
- Two working domains pointing at the server: either real DNS A records,
  or nip.io addresses (`*.<server-ip>.nip.io`, see above) — one for the app domain, one
  for the API domain.
- Ports 80/443 open (handled by the shared proxy, not by this project).

## First-Time Deployment

```bash
# 1. Clone the repository
git clone <repo-url> teacher-student-platform
cd teacher-student-platform

# 2. Configure environment
cp .env.example .env
# Edit .env: DB_PASSWORD, SUPER_ADMIN_PASSWORD, API_DOMAIN, APP_DOMAIN,
# SSL_EMAIL — do not leave any CHANGE_THIS placeholder.
# (JWT_SECRET is generated automatically by deploy.sh — leave it as-is.)

# 3. Deploy
bash scripts/deploy.sh
```

`scripts/deploy.sh` does all of the following on every run:

1. Backs up the database (if it's already running).
2. Pulls the latest code (`git pull origin master`).
3. Validates `.env` (refuses to continue on placeholder secrets or a
   missing domain).
4. Ensures the shared `proxy_network` exists.
5. Rebuilds and restarts the `db`, `api`, and `web` containers.
6. Runs `prisma migrate deploy` and the seed script (idempotent — safe to
   re-run; it upserts the `ENGLISH` subject and the super-admin account).
7. Polls `/health` on the API container until it responds `200`.

## Regular Updates

To ship a new change to production:

```bash
bash scripts/deploy.sh
```

This pulls the latest `master`, rebuilds both images, re-applies any new
Prisma migrations, and health-checks the result.

## Rollback Procedures

```bash
# Revert to the previous commit and redeploy
git checkout HEAD~1
bash scripts/deploy.sh
```

Prisma migrations are forward-only — rolling back code that depends on a
schema change that has already been applied requires either writing a
down-migration by hand or restoring the database from a backup (see
below) before rolling back the code.

## Backup & Recovery

### Automated backups

Every `deploy.sh` run creates `backups/backup_<timestamp>.sql.gz` before
touching anything, and keeps the 7 most recent.

### Manual backup

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U app teacher_student | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore

```bash
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U app teacher_student
```

## Troubleshooting

### Check service status

```bash
docker compose -f docker-compose.prod.yml ps
```

### View logs

```bash
docker compose -f docker-compose.prod.yml logs api --tail=100 -f
docker compose -f docker-compose.prod.yml logs web --tail=100 -f
docker compose -f docker-compose.prod.yml logs db --tail=100 -f
```

### Common issues

**SSL certificate not issued / site unreachable over HTTPS**
Confirm `API_DOMAIN` and `APP_DOMAIN` in `.env` both have DNS A records
pointing at this server, and that the shared `nginx-proxy` +
`acme-companion` containers are running and attached to `proxy_network`.

**Frontend loads but API calls fail (CORS / network error)**
The frontend bakes `VITE_API_URL` in at *build* time — if `API_DOMAIN`
changes, the `web` image must be rebuilt (`deploy.sh` always does this).
Also check `CORS_ORIGIN` on the API matches `APP_DOMAIN` exactly
(scheme + host, no trailing slash).

**Database connection refused**
Ensure `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env` are set — the
`DATABASE_URL` the API actually uses is assembled from these three in
`docker-compose.prod.yml`, so editing `DATABASE_URL` directly in `.env`
has no effect in production.

**Migration failed**
Check `docker compose -f docker-compose.prod.yml logs api`, then run
manually:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```
