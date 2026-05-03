# Lumen Goods

A self-hosted, modern e-commerce store. Django + DRF on the backend; Next.js (App Router, TypeScript, Tailwind tokens) on the frontend; PostgreSQL + Redis + Celery; Stripe for payments. Designed to run on a single Mac mini M4 Pro, headless, behind Caddy and Cloudflare Tunnel.

The full design source-of-truth is the frozen prototype in `prototype/`. The original brief is `CLAUDE_CODE_HANDOFF.md`. Everything else here is implementation.

---

## What's in the repo

```
backend/    Django + DRF (apps: catalog, cart, orders, accounts, promotions, content)
frontend/   Next.js (App Router, TypeScript, Tailwind tokens)
infra/      Caddy, Cloudflare Tunnel, launchd, backups, deploy/seed/restore scripts
prototype/  Design source-of-truth — frozen HTML/React (do not edit)
docs/       Architecture, design-system, Stripe notes
scripts/    Repo-level utilities (sync-agent-docs.sh)
```

Routes that exist today: `/`, `/shop`, `/p/[slug]`, `/checkout`, `/auth/sign-in`, `/auth/register`, `/account`, `/admin`. API endpoints are catalogued in [`docs/architecture.md`](docs/architecture.md).

---

## Local development

### Prerequisites

You need a Docker runtime and not much else. On macOS the recommended stack is:

```bash
brew install --cask orbstack          # arm64-native, lighter than Docker Desktop
# Docker Desktop also works.
```

Other platforms: install Docker Engine + Docker Compose v2 (≥ 2.20). Everything else (Python, Node, pnpm, Postgres, Redis, Caddy) lives inside containers.

### First boot

```bash
git clone <repo-url> lumen-goods
cd lumen-goods

# Copy + lightly tweak the env file. Defaults work for dev.
cp .env.example .env

# Build images and bring up postgres, redis, api, worker, web, caddy.
docker compose up -d --build

# Run migrations and seed the catalog from prototype/data.js (9 products,
# 12 colors, 7 categories, 105 variants, plus the LUMEN10 coupon).
docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py import_catalog

# Optional: create an admin user for /admin.
docker compose exec api python manage.py createsuperuser
```

### Where things run

| Service | URL | Notes |
|---|---|---|
| Storefront (Next.js) | <http://localhost:3000> | hot-reloads on file save (bind-mounted source) |
| API (Django) | <http://localhost:8000> | dev `runserver`; auto-reloads |
| Django admin | <http://localhost:8000/admin/> | needs the superuser you created |
| Caddy (LAN) | <https://lumen.local> | self-signed cert; add `127.0.0.1 lumen.local` to `/etc/hosts` and trust the cert with `caddy trust` |
| Postgres | `db:5432` (internal only) | port not exposed to host |
| Redis | `redis:6379` (internal only) | port not exposed to host |

### URL map (storefront)

| Path | What |
|---|---|
| `/` | redirects to `/shop` |
| `/shop` | gallery — server-rendered, filters round-trip via the URL (`?category`, `?price`, `?color`, `?availability`, `?search`, `?sort`, `?view`) |
| `/p/[slug]` | product detail — image gallery, color/size/qty, add-to-bag, accordion, related |
| `/checkout` | multi-step checkout (Shipping → Payment → Review → Confirmation); no topbar/footer chrome |
| `/auth/sign-in`, `/auth/register` | JWT-backed auth |
| `/account` | order history + sign-out (auth required) |

### Common ops

```bash
# Tail logs
docker compose logs -f                                # all services
docker compose logs -f web                            # just Next.js

# Backend shell + management commands
docker compose exec api python manage.py shell
docker compose exec api python manage.py <any-command>

# Tests (real Postgres, no DB mocks)
docker compose exec api pytest                        # 36 cases
docker compose exec web pnpm typecheck
docker compose exec web pnpm lint

# Lint + format
docker compose exec api ruff check . --fix && docker compose exec api ruff format .
docker compose exec web pnpm exec prettier --write 'components/**/*.tsx' 'lib/**/*.ts' 'app/**/*.tsx'

# Wipe DB and re-seed (DEV ONLY — refuses to run unless DJANGO_DEBUG=1)
./infra/scripts/seed.sh

# Stop the stack (volumes preserved)
docker compose down

# Stop the stack AND wipe Postgres / Redis / media volumes
docker compose down -v
```

### Stripe (optional in dev)

Without Stripe keys the storefront still renders end-to-end up through the *Shipping* step of checkout. Once you submit Shipping, `POST /api/checkout/payment-intent/` returns 503 and the UI shows a clear "Stripe not configured" banner.

To exercise the full Shipping → Payment → Review → Confirmation flow, set the three keys from your Stripe dashboard in `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
```

Forward webhook events to your local stack with the Stripe CLI:

```bash
stripe listen --forward-to http://localhost:8000/api/webhooks/stripe/
```

Test cards: `4242 4242 4242 4242` (success) · `4000 0000 0000 9995` (insufficient funds) · `4000 0025 0000 3155` (3DS). Full notes: [`docs/stripe.md`](docs/stripe.md).

### Pre-commit hooks

```bash
brew install pre-commit         # or: pipx install pre-commit
pre-commit install
```

Runs `ruff` + `ruff-format` on the backend, `prettier` on the frontend, plus the standard hygiene hooks (yaml/json check, end-of-file, trailing whitespace, detect-private-key, merge-conflict markers). **Never bypass with `--no-verify`** — fix the underlying issue.

---

## Production deploy

Two supported targets:

- **Mac mini M4 Pro (self-hosted, ARM64)** — [`infra/README.md`](infra/README.md). Twelve sections covering bootstrap (Homebrew + OrbStack + cloudflared + restic), secrets, prod stack-up (`docker-compose.prod.yml` overlay with gunicorn + `pnpm start`), Caddy LAN/public host blocks, Cloudflare Tunnel setup, launchd vs. Compose-only supervision, nightly Postgres + restic backups with schedules, resource budget, common ops, and health checks.
- **Hetzner Cloud CAX21 (ARM64 VM)** — [`infra/HETZNER.md`](infra/HETZNER.md). Cloudflare R2 for media + backups (S3-compatible, $0 egress), Cloudflare Tunnel or Hetzner LB for ingress, the containerised backup sidecar instead of launchd, systemd unit for boot supervision. Built from the same compose files; only `.env` differs (`MEDIA_BACKEND=s3` + R2 creds + `--profile backup`).

Short version:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py collectstatic --noinput
docker compose exec api python manage.py import_catalog
docker compose exec api python manage.py createsuperuser
```

`infra/scripts/deploy.sh` wraps `git pull` + rebuild + migrate + collectstatic for subsequent deploys.

---

## Where to read more

- [`CLAUDE.md`](CLAUDE.md) — operating manual for AI coding agents in this repo (conventions, testing, security baseline, do-not list).
- [`docs/architecture.md`](docs/architecture.md) — system diagram, bounded contexts, full API surface, data flows for add-to-cart and checkout, idempotency and auth notes.
- [`docs/design-system.md`](docs/design-system.md) — color/type/radius/easing tokens, component port checklist, stylesheet split, font loading.
- [`docs/stripe.md`](docs/stripe.md) — Stripe env, API surface, webhook signature verification, dev tip for `stripe listen`, customer-portal path.
- [`infra/README.md`](infra/README.md) — Mac mini M4 Pro headless deploy runbook.
- [`infra/HETZNER.md`](infra/HETZNER.md) — Hetzner Cloud (ARM64 VM) deploy runbook with Cloudflare R2 + Tunnel.
- [`CLAUDE_CODE_HANDOFF.md`](CLAUDE_CODE_HANDOFF.md) — the original brief / spec.
