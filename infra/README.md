# Lumen Goods — Mac mini M4 Pro headless deploy runbook

> Step-by-step guide for a fresh Mac mini M4 Pro running macOS, headless, accessed only via SSH. Every step is reproducible from this document.

## 0. Hardware / OS assumptions

- **Hardware**: Mac mini M4 Pro, Apple Silicon (arm64).
- **OS**: macOS 14+, headless, Remote Login (SSH) enabled in *System Settings → General → Sharing*.
- **Disk**: 256 GB+ internal storage and one external SSD (mounted as `/Volumes/LumenBackup`) for backups.
- **Network**: residential connection. We do **not** open router ports — public access is via Cloudflare Tunnel.
- **Account**: a single non-admin user named `lumen` with passwordless `sudo` for the stack-management scripts only. Don't run the stack as root.

## 1. Bootstrap

SSH into the mini and run:

```bash
# 1. Homebrew (Apple Silicon)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# 2. Tooling
brew install --cask orbstack         # arm64-native Docker runtime; lighter than Docker Desktop
brew install cloudflared restic git
```

OrbStack is the recommended Docker runtime on Apple Silicon — lower memory footprint than Docker Desktop and ships arm64 images by default. Either works.

## 2. Repo + secrets

```bash
mkdir -p ~/lumen
cd ~/lumen
git clone <your-fork-or-mirror-url> goods
cd goods

# Real secrets go here, gitignored.
mkdir -p infra/secrets
chmod 700 infra/secrets

cp .env.example .env
# Edit .env in $EDITOR and fill in real values:
#   DJANGO_SECRET_KEY (50+ random chars)
#   POSTGRES_PASSWORD
#   STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
#   CORS_ALLOWED_ORIGINS / DJANGO_CSRF_TRUSTED_ORIGINS (your domain)
```

## 3. Bring up the stack (prod overlay)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py collectstatic --noinput
docker compose exec api python manage.py import_catalog
docker compose exec api python manage.py createsuperuser    # for /admin
```

Verify:

```bash
curl -fsS https://lumen.local/api/healthz -k          # 200 {"status":"ok"} (LAN, self-signed cert)
docker compose ps                                     # all containers healthy
```

## 4. Reverse proxy + TLS

The `Caddyfile` ships two host blocks:

- `lumen.local` — LAN-only, served with Caddy's internal CA (self-signed). Trust the CA on your laptop with `caddy trust`, or accept the warning.
- A commented-out `lumen.example` block — uncomment, replace the hostname, and Caddy will auto-issue a Let's Encrypt cert when the public DNS resolves to your tunnel.

Reload Caddy after edits:

```bash
docker compose restart caddy
```

## 5. Public exposure — Cloudflare Tunnel

The residential connection has no port forwarding; instead we run `cloudflared` inside the stack and let it dial out to Cloudflare.

```bash
# 5.1 Authenticate once (browser flow on a machine with a GUI; the cert is portable).
cloudflared tunnel login        # writes ~/.cloudflared/cert.pem

# 5.2 Create a named tunnel.
cloudflared tunnel create lumen-prod

# 5.3 Save the credentials JSON into infra/secrets/cloudflared.json
mv ~/.cloudflared/<tunnel-uuid>.json infra/secrets/cloudflared.json
chmod 600 infra/secrets/cloudflared.json

# 5.4 Edit infra/cloudflared/config.yml.example → infra/cloudflared/config.yml,
#     replace the tunnel UUID and the hostname (lumen.example).

# 5.5 Add a DNS route that points your hostname at the tunnel.
cloudflared tunnel route dns lumen-prod lumen.example

# 5.6 Bring the tunnel up via the prod overlay (it runs as a docker service).
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d cloudflared
```

After DNS propagates (a few seconds with Cloudflare), `https://lumen.example` resolves and Caddy's public block can issue a real cert.

## 6. Process supervision

Two options — pick one, not both.

### Option A — Compose-only (recommended)

`docker-compose.yml` has `restart: unless-stopped` on every service. Once OrbStack is set to start on login (its default), the stack survives reboots.

```bash
# Confirm the runtime starts on login:
defaults write com.orbstack.OrbStack StartAtLogin -bool true
```

### Option B — launchd

`infra/launchd/com.lumengoods.compose.plist.example` runs `docker compose up -d` at login. Install:

```bash
cp infra/launchd/com.lumengoods.compose.plist.example \
  ~/Library/LaunchAgents/com.lumengoods.compose.plist
# Edit the WorkingDirectory inside the plist before loading.
launchctl load ~/Library/LaunchAgents/com.lumengoods.compose.plist
```

## 7. Backups

Two scheduled jobs:

| What | Script | Plist |
|---|---|---|
| Nightly Postgres dump (`pg_dump`) → `/Volumes/LumenBackup/pg/`, gzipped, 30-day retention. | `infra/backups/pg_backup.sh` | `infra/launchd/com.lumengoods.pg-backup.plist.example` |
| Nightly media snapshot via `restic` (deduped, encrypted) | `infra/backups/restic-snapshot.sh` | `infra/launchd/com.lumengoods.media-backup.plist.example` |

Install both plists into `~/Library/LaunchAgents/`, edit `WorkingDirectory` and any paths, then `launchctl load <plist>`.

First-time restic setup (only once):

```bash
export RESTIC_REPOSITORY=/Volumes/LumenBackup/restic
export RESTIC_PASSWORD_FILE=$HOME/.restic-pass     # echo a random string into this file, chmod 400
restic init
# Add RESTIC_REPOSITORY + RESTIC_PASSWORD_FILE to .env so the cron script picks them up.
```

Restore from a Postgres dump:

```bash
infra/scripts/restore.sh /Volumes/LumenBackup/pg/lumen-2026-04-27-030000.sql.gz
```

### 7a. Cloud backup sidecar (non-Mac deployments)

For cloud / Linux VM hosts the launchd plists are unusable. Use the
containerized sidecar instead:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    --profile backup up -d --build backup
```

The sidecar (`infra/docker/backup/`) is an Alpine image with
`postgresql16-client` + `aws-cli` + busybox `crond`. At 03:15 in the
container's timezone (default UTC) it pipes `pg_dump` through `gzip`
into `s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/`. The destination is
S3-compatible — AWS S3, Cloudflare R2, and MinIO all work; pick the
provider via `AWS_S3_ENDPOINT_URL` (see `.env.example`).

Retention is delegated to a **bucket lifecycle rule** on the
destination — set it to expire objects after the desired number of
days (R2: *Settings → Lifecycle Rules*; AWS S3: *Management →
Lifecycle*). Don't try to do retention in the script.

Restore from a cloud backup:

```bash
aws s3 ls s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX
infra/scripts/restore-from-s3.sh pg/lumen-20260503T031500Z.sql.gz
```

## 8. Resource budget (tuned for a 24 GB Mac mini M4 Pro)

| Service | Limit |
|---|---|
| Postgres | `shared_buffers=256MB`, `max_connections=100` (set in `docker-compose.yml`) |
| Celery worker | `--concurrency=2` |
| Next.js | one Node process, `pnpm start` against a built bundle |
| Caddy | default; trivial RAM |
| Cloudflared | default; trivial RAM |

If the Mac mini is doing anything else, drop Celery to 1 worker and bump Postgres to 384MB.

## 9. Common ops (CLI)

| Op | Command |
|---|---|
| Deploy a new commit | `infra/scripts/deploy.sh` (`git pull`, rebuild, migrate, collectstatic, restart) |
| Reset DB to a clean seeded state (DEV ONLY) | `infra/scripts/seed.sh` |
| Restore from a Postgres dump | `infra/scripts/restore.sh <path-to-sql.gz>` |
| Tail one service | `docker compose logs -f <api\|web\|worker\|caddy\|cloudflared>` |
| Open a Django shell | `docker compose exec api python manage.py shell` |
| Run a one-off management command | `docker compose exec api python manage.py <cmd>` |
| Rotate logs | `docker compose logs --no-color > /var/log/lumen-$(date +%F).log && docker compose restart caddy` |

## 10. Health checks

| URL | Expectation |
|---|---|
| `https://lumen.local/api/healthz` | `{"status":"ok"}`, 200 |
| `https://lumen.local/admin/login/` | Django admin login |
| `https://lumen.local/shop` | Gallery |
| `https://lumen.example/api/healthz` (after public domain wired) | `{"status":"ok"}`, 200 |

## 11. Things this runbook intentionally does *not* do

- Open ports on the router. Cloudflare Tunnel handles ingress.
- Run anything as root. The `lumen` user owns the repo and OrbStack.
- Use Stripe live keys. Until you've completed your Stripe activation, leave the keys in test mode (`sk_test_…`, `pk_test_…`).
- Self-host email. SMTP credentials go in `.env`; the default backend is `console` so you don't accidentally email customers from dev.

## 12. Next-step checklist (post-launch)

- [ ] Wire a self-hosted observability stack (Prometheus + Grafana, or just `journald` + `vector`).
- [ ] Add a `pg_dump` to S3-compatible offsite storage in addition to the external SSD.
- [ ] Move from Caddy's internal CA on LAN to a real LAN CA shared by every device on the network.
- [ ] Stripe Customer Portal link from `/account` once the Customer is being created at checkout.
- [ ] Magic-link auth (handoff §5.5 lists this as optional).
