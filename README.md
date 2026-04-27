# Lumen Goods

A self-hosted, modern e-commerce store. Django + DRF on the backend; Next.js (App Router, TypeScript, Tailwind) on the frontend; PostgreSQL + Redis + Celery; Stripe for payments. Designed to run on a single Mac mini M4 Pro, headless, behind Caddy and Cloudflare Tunnel.

## Where to start

- **`CLAUDE_CODE_HANDOFF.md`** — original brief / spec.
- **`CLAUDE.md`** — operating manual for AI coding agents in this repo.
- **`prototype/`** — frozen HTML/React design source-of-truth. Do not edit.
- **`infra/README.md`** — step-by-step Mac mini headless deploy runbook.

## Quick start

```bash
cp .env.example .env
docker compose up -d
docker compose exec api python manage.py migrate
docker compose exec api python manage.py import_catalog   # seeds from prototype/data.js
open http://localhost:3000
```

## Layout

```
backend/    Django + DRF (apps: catalog, cart, orders, accounts, promotions, content)
frontend/   Next.js (App Router, TypeScript, Tailwind)
infra/      Caddy, Cloudflare Tunnel, launchd, backups, deploy scripts
prototype/  Design source-of-truth (frozen)
docs/       Architecture, design-system, Stripe notes
scripts/    Repo-level utilities (e.g. sync-agent-docs.sh)
```
