# Lumen Goods — Setup guide (local + production)

> One-stop navigation for setting up Lumen Goods. The deep walkthroughs live
> in `infra/README.md` (Mac mini) and `infra/HETZNER.md` (Hetzner Cloud);
> this document is the index that ties them together with a decision tree
> and the env-var differences between targets.

---

## At a glance

- **Stack**: Django 5 + DRF · PostgreSQL 16 · Redis 7 · Celery · Next.js 14 (App Router, TS, Tailwind) · Stripe · Caddy · Cloudflare Tunnel.
- **Architecture**: ARM64-native everywhere. The dev stack is the prod stack — same `docker-compose.yml`, prod adds `docker-compose.prod.yml` as an overlay. No emulated containers.
- **Two supported production targets**: a single Mac mini M4 Pro (self-hosted, headless) **or** a single Hetzner Cloud CAX21 (ARM64 VM). Both run the same compose files; only `.env` and ingress differ.
- **Storage backend is a runtime switch**: `MEDIA_BACKEND=local` (filesystem, default) or `MEDIA_BACKEND=s3` (django-storages → R2 / S3 / B2 / MinIO).
- **Database is a runtime switch**: `DATABASE_URL` is the source of truth. Bundled `postgres:16` container by default; swap to managed Postgres (Neon / RDS / Cloud SQL / Supabase) by setting `DATABASE_URL` and stopping the `db` service.

---

## Pick a path

```
┌─────────────────────────────────────────────────────────────────┐
│ I want to…                                                      │
├─────────────────────────────────────────────────────────────────┤
│ Run it on my laptop for development           → Local           │
│ Self-host on hardware I own                   → Mac mini path   │
│ Deploy to a cloud VM in <1 hour               → Hetzner path    │
│ Run on AWS / GCP / Azure / Fly                → Hetzner path*   │
└─────────────────────────────────────────────────────────────────┘
* The Hetzner runbook is the cloud-portable path; the only Hetzner-specific
  bits are the provider console steps in §1. Substitute your provider's
  equivalent and the rest of the runbook applies unchanged.
```

---

## 1. Local development

Full walkthrough is in [`README.md`](../README.md#local-development); the compressed version:

```bash
# Prerequisites: a Docker runtime. macOS recommended:
brew install --cask orbstack          # arm64-native; lighter than Docker Desktop

# Boot the stack
git clone <repo> lumen-goods && cd lumen-goods
cp .env.example .env                  # defaults work for dev
docker compose up -d --build
docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py import_catalog
docker compose exec api python manage.py createsuperuser
```

URLs once it's up: `http://localhost:3000` (storefront), `http://localhost:8000/admin/` (Django admin), `https://lumen.local` (Caddy with self-signed cert; needs `127.0.0.1 lumen.local` in `/etc/hosts` + `caddy trust`).

**Stripe in dev is optional.** Without keys the storefront renders end-to-end up through the *Shipping* step; `POST /api/checkout/payment-intent/` returns 503 with a clear UI banner. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test mode) to exercise the full Shipping → Payment → Review → Confirmation flow, and forward webhooks with `stripe listen --forward-to http://localhost:8000/api/webhooks/stripe/`.

**Pre-commit is mandatory.** `brew install pre-commit && pre-commit install` once. Hooks: `ruff` + `ruff-format` (backend), `prettier` (frontend), plus standard hygiene. Never bypass with `--no-verify` — fix the underlying issue.

---

## 2. Production — Mac mini M4 Pro

Full walkthrough: [`infra/README.md`](../infra/README.md). Compressed:

1. **Bootstrap** — Homebrew + OrbStack + cloudflared + restic on a fresh macOS, headless.
2. **Repo + secrets** — clone to `~/lumen/goods`, `cp .env.example .env`, fill in real values into `.env`. Production secrets that aren't simple env vars (cloudflared credentials, etc.) live in `infra/secrets/`, gitignored, mode 700.
3. **Stack up** — `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`, then migrate / collectstatic / import_catalog / createsuperuser.
4. **Ingress** — Caddy serves `lumen.local` (LAN) and the public domain. Cloudflare Tunnel fronts the public domain — no router ports.
5. **Supervision** — Compose `restart: unless-stopped` is the default; a `launchd` plist is provided as an alternative for boot survival.
6. **Backups** — nightly `pg_dump` + `restic` snapshot of media to an external SSD, scheduled via the launchd plists in `infra/launchd/`.

Mac-specific bits: launchd backup plists, OrbStack, external SSD at `/Volumes/LumenBackup`. Everything else is the same as the cloud path.

---

## 3. Production — Hetzner Cloud (or any cloud VM)

Full walkthrough: [`infra/HETZNER.md`](../infra/HETZNER.md). Compressed:

1. **Provision** — Hetzner CAX21 (4 vCPU / 8 GB / 80 GB, ARM64 Ampere) with Ubuntu 24.04, SSH key uploaded.
2. **Bootstrap** — `apt`-install Docker (arm64 repo), create a `lumen` user, lock down SSH, enable `ufw`.
3. **Repo + secrets** — clone to `/srv/lumen/goods`, `cp .env.example .env`, fill in production values. Notable fields:
   - `MEDIA_BACKEND=s3` + R2 / S3 credentials (see §4 below)
   - `BACKUP_S3_BUCKET=lumen-backups` for the backup sidecar
   - `JSON_LOGGING=1` once you wire a log aggregator
4. **Object storage** — two Cloudflare R2 buckets: `lumen-media` (CORS allows `GET`/`HEAD` from the storefront origin) and `lumen-backups` (lifecycle rule on prefix `pg/`). One R2 API token scoped to both buckets.
5. **Images** — pull from GHCR (`ghcr.io/reichie020212/django_ecommerce-{api,web}`, multi-arch built by CI on every push to `main`) **or** build locally on the VM.
6. **Ingress** — Cloudflare Tunnel (recommended, no inbound ports) **or** Hetzner LB / direct A record + Caddy + Let's Encrypt.
7. **Supervision** — systemd unit (`lumen.service`) for boot survival; Compose handles in-process crashes.
8. **Backups** — `--profile backup` activates a containerised `pg_dump` cron sidecar that uploads to R2. No host-side cron.

The Hetzner runbook has 14 sections including resource budget, backup verification, restore drill, and Stripe webhook re-registration. Read it end-to-end before the first deploy.

---

## 4. Env-var differences between targets

The same `.env.example` covers both, but the values diverge. Quick reference:

| Variable | Local dev | Mac mini | Hetzner Cloud |
|---|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `lumen.settings.dev` | `lumen.settings.prod` | `lumen.settings.prod` |
| `DJANGO_DEBUG` | `1` | `0` | `0` |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,api.lumen.local` | `lumen.example.com,api.lumen.example.com` | `lumen.example.com,api.lumen.example.com` |
| `DATABASE_URL` | bundled postgres | bundled postgres (default) or managed | bundled postgres (default) or managed |
| `MEDIA_BACKEND` | `local` | `local` (recommended) | `s3` (recommended) |
| `AWS_*` (R2/S3) | unset | unset (or set if using S3 for media) | required when `MEDIA_BACKEND=s3` |
| `BACKUP_S3_BUCKET` | unset | unset (uses launchd `pg_backup.sh`) | `lumen-backups` (uses `--profile backup`) |
| `JSON_LOGGING` | `0` | `0` or `1` | `1` (recommended) |
| `STRIPE_*` | optional (dev test keys) | required (test or live) | required (test or live) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,https://lumen.local` | `https://lumen.example.com` | `https://lumen.example.com` |

Compose profiles also differ:

- **Local dev**: no profile. `docker compose up -d`.
- **Mac mini prod**: prod overlay only. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`. Add `--profile tunnel` once cloudflared is configured.
- **Hetzner prod**: prod overlay + backup sidecar. `docker compose -f … --profile backup --profile tunnel up -d --build`.

---

## 5. Switching between targets

The compose files and image tags don't change. Only `.env` (and the ingress config) change:

- **Local → Mac mini**: change settings module to `prod`, set real domain, add Stripe live keys, configure Caddy + cloudflared, install the launchd plists.
- **Mac mini → Hetzner Cloud**: same `.env` changes plus flip `MEDIA_BACKEND=s3` (and migrate existing media to R2 with `aws s3 sync`), enable `--profile backup`, replace the launchd plists with the systemd unit.
- **Hetzner → managed Postgres**: only `DATABASE_URL` changes. Stop the `db` service in compose; set `DATABASE_URL=postgres://user:pass@managed-host:5432/lumen?sslmode=require`.

---

## 6. Common pitfalls

- **Don't run `--platform=linux/amd64`.** The Mac mini and CAX21 are both ARM64. `docker compose` will pull the right multi-arch images automatically; force-pinning amd64 will run under emulation, slowly, and may break. Pre-commit blocks this in `.pre-commit-config.yaml` indirectly via `check-yaml`.
- **Don't load fonts from a CDN.** `next/font/google` is fine — it inlines woff2s into `_next/static` at build time. A runtime `<link href="fonts.googleapis.com">` is a regression (CLAUDE.md §10).
- **Don't bypass pre-commit hooks.** `--no-verify` is forbidden. If a hook fails, fix the underlying issue.
- **`/api/readyz` is what your load balancer should hit, not `/api/healthz`.** `healthz` returns 200 if the process is up; `readyz` checks DB + Redis. CAX21 LB / Cloudflare Tunnel health checks should target `readyz`.
- **GHCR images are private by default.** Either flip `ghcr.io/reichie020212/django_ecommerce-{api,web}` to public on github.com → *Packages*, or `docker login ghcr.io` on the VM with a read-only PAT. Covered in `infra/HETZNER.md` §5.
- **The cloudflared config has only one `- hostname:` entry by default.** For the storefront + API split, add a second `- hostname: api.<your-domain>` block in `infra/cloudflared/config.yml`. The example file (`config.yml.example`) covers only the storefront.
- **Backups don't auto-prune.** Retention is delegated to the bucket lifecycle rule (R2) or to manual `restic forget` (Mac mini). The backup script does **not** delete old snapshots itself.
- **Stripe webhook re-registration is a separate step.** When you change domains (dev → prod, or move providers), the `whsec_…` secret changes. Stripe Dashboard → *Developers → Webhooks → Add endpoint* with `https://api.<domain>/api/webhooks/stripe/`, then update `STRIPE_WEBHOOK_SECRET` in `.env` and `docker compose restart api`.
- **Local GPG signing config in this repo fights itself** — `gpg.format=ssh` but `gpg.program=gpg`. Commits succeed but are unsigned-but-Signed-off-by. Fix with `git config gpg.program ssh-keygen` (or `git config --unset gpg.program`).

---

## 7. Where to read more

- [`README.md`](../README.md) — repo entry point + local dev quickstart.
- [`infra/README.md`](../infra/README.md) — Mac mini M4 Pro headless deploy runbook (12 sections).
- [`infra/HETZNER.md`](../infra/HETZNER.md) — Hetzner Cloud (ARM64 VM) deploy runbook (14 sections).
- [`docs/architecture.md`](architecture.md) — system diagram, bounded contexts, full API surface, data flows.
- [`docs/design-system.md`](design-system.md) — token catalog, component port table, stylesheet split, font loading.
- [`docs/stripe.md`](stripe.md) — Stripe env, API surface, webhook signature verification, dev tip for `stripe listen`.
- [`CLAUDE.md`](../CLAUDE.md) — operating manual for AI coding agents (conventions, testing, security, do-not list, current-state snapshot).
- [`CLAUDE_CODE_HANDOFF.md`](../CLAUDE_CODE_HANDOFF.md) — original brief / spec.
