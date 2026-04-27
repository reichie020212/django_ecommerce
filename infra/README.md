# Lumen Goods — Infra runbook (Mac mini M4 Pro, headless)

> Step-by-step deploy guide for a fresh Mac mini M4 Pro running macOS, headless, accessed via SSH only. Real content lands in task #12; this file is a skeleton with the section structure in place.

## 0. Hardware / OS assumptions

- Mac mini M4 Pro, Apple Silicon (arm64).
- macOS 14+, headless, SSH enabled.
- Disk: at least 256 GB internal + 1 external SSD for backups.
- Network: residential, no port forwarding (use Cloudflare Tunnel).

## 1. Bootstrap

1. Enable Remote Login (SSH).
2. Install Homebrew (arm64).
3. Install Docker Desktop or OrbStack.
4. Install Cloudflare `cloudflared`.
5. Install `restic` for media backups.

## 2. Repo + secrets

1. `git clone …` to `~/lumen-goods`.
2. `cp .env.example .env` and fill in real values.
3. Place TLS-trusting / Cloudflare credentials under `infra/secrets/` (gitignored).

## 3. Stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec api python manage.py migrate
docker compose exec api python manage.py collectstatic --noinput
docker compose exec api python manage.py import_catalog
```

## 4. Reverse proxy + TLS

Caddy runs in the stack. The `Caddyfile` covers `lumen.local` (LAN, Caddy's internal CA) and a public domain block. Switch the public block on once Cloudflare Tunnel is wired up (§5).

## 5. Cloudflare Tunnel (public exposure)

1. `cloudflared tunnel login`
2. Create a named tunnel; place credentials in `infra/cloudflared/`.
3. Start as a launchd service.

## 6. Process supervision

Two options:

- **Compose-only** (recommended): `restart: unless-stopped` on every service is enough.
- **launchd**: `infra/launchd/com.lumengoods.compose.plist.example` runs `docker compose up -d` on boot.

## 7. Backups

- `infra/backups/pg_backup.sh` — nightly `pg_dump` to the external volume.
- `infra/backups/restic-snapshot.sh` — nightly media snapshot.
- Schedule both via launchd (sample plist in `infra/launchd/`).

## 8. Resource budget

- Postgres `shared_buffers=256MB`, `max_connections=100`.
- Celery: 2 workers.
- Next.js: 1 Node process.
- Update `docker-compose.yml` if you bump these.

## 9. Common ops (CLI)

| Op | Command |
|---|---|
| Deploy a new commit | `infra/scripts/deploy.sh` |
| Reset DB to a clean seeded state | `infra/scripts/seed.sh` |
| Restore from backup | `infra/scripts/restore.sh <date>` |
| Rotate logs | `docker compose logs --no-color > /var/log/lumen-$(date +%F).log && truncate ...` |
| Tail one service | `docker compose logs -f <service>` |
