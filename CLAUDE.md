# Lumen Goods — Claude Code Project Instructions

> Persistent guidance for Claude Code working in this repository. Read top-to-bottom before any task.

---

## 1. Project overview

**Lumen Goods** is a self-hosted, modern e-commerce store built from the high-fidelity HTML/React prototype in `prototype/` (originally `/Users/red/ClaudeDesign/Django_ E-commerce/`). It's a fictional premium goods atelier — original branding, no real-brand recreation.

- **Visual language**: minimalist, premium (Apple/Stripe-inspired), warm-paper neutrals with slate-900 ink and indigo-600 accent.
- **Type**: Inter (UI) · Instrument Serif (editorial) · JetBrains Mono (data).
- **Stack** (production target):
  - Backend: Django + Django REST Framework, PostgreSQL, Redis + Celery
  - Frontend: Next.js (App Router, React 18+, TypeScript), Tailwind CSS
  - Payments: Stripe (real Payment Intents — `<PaymentElement />`)
  - Auth: DRF SimpleJWT on the API; Next.js middleware for session handling
  - Storage: local filesystem first; S3-compatible adapter ready for later
  - Search: Postgres full-text (path to Meilisearch if needed)

The full handoff brief is `CLAUDE_CODE_HANDOFF.md` — that document is the spec; this one is the operating manual.

---

## 2. Repo layout

```
lumen-goods/
├── CLAUDE.md
├── GEMINI.md
├── README.md
├── CLAUDE_CODE_HANDOFF.md          # original brief — spec, do not delete
├── prototype/                      # frozen HTML/React prototype (the design source-of-truth)
├── docker-compose.yml              # dev stack
├── docker-compose.prod.yml         # prod stack
├── Caddyfile
├── .env.example
├── frontend/                       # Next.js (App Router, TS, Tailwind)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   │   └── tokens.css              # ported verbatim from prototype/styles.css
│   └── public/
├── backend/                        # Django + DRF
│   ├── lumen/                      # project (settings, urls, wsgi)
│   ├── catalog/
│   ├── cart/
│   ├── orders/
│   ├── accounts/
│   ├── promotions/
│   ├── content/                    # editorial pages (later)
│   ├── manage.py
│   └── pyproject.toml
├── infra/
│   ├── README.md                   # Mac mini M4 Pro headless deploy runbook
│   ├── caddy/
│   ├── cloudflared/
│   ├── launchd/
│   ├── backups/
│   │   └── pg_backup.sh
│   └── scripts/
│       ├── deploy.sh
│       ├── seed.sh
│       └── restore.sh
├── docs/
│   ├── architecture.md
│   ├── design-system.md            # ported tokens + component notes
│   └── stripe.md
└── scripts/
    └── sync-agent-docs.sh          # CLAUDE.md → GEMINI.md (header swap)
```

Strictly maintain this layout. Don't relocate apps or top-level files without first re-consulting the architect (see §11).

---

## 3. Conventions

### Code style
- **TypeScript**: `strict: true`. No `any` except at well-marked external boundaries with a comment explaining why. Prefer `unknown` + narrowing.
- **Python**: 3.12+, type hints on every public function, dataclass / Pydantic for structured data. Lint with `ruff` and format with `ruff format` (treats both lint and format). `black` is acceptable but `ruff format` is canonical here.
- **Django**: app-per-bounded-context (catalog, cart, orders, accounts, promotions, content). Models declare `class Meta: ordering` explicitly. Use `select_related` / `prefetch_related` on every list endpoint — N+1s are rejected in review.
- **DRF**: ModelViewSets where they fit, function-based or APIViews where REST semantics get awkward. Serializers separate `read` and `write` shapes.
- **CSS**: tokens live in `frontend/styles/tokens.css` (ported from `prototype/styles.css`). Tailwind config consumes those tokens via CSS variables — never hard-code hex values in components.

### Git commits
- **Always sign with both `-s` and `-S`** (`git commit -s -S -m "..."`). `-s` adds the Signed-off-by trailer; `-S` GPG-signs.
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`, `style:`, `build:`, `ci:`. Scope optional (`feat(catalog): ...`).
- **No self-attribution**: no `Co-Authored-By: Claude ...`, no "Generated with Claude Code" footer, no AI attribution of any kind.
- **Never** skip hooks (`--no-verify`) or bypass signing (`--no-gpg-sign`) — if a hook fails, fix the underlying issue.
- **Never amend** an existing commit unless explicitly told. Create a new commit.

### Worktrees
- All feature work happens on a git worktree, never directly on `main` or the feature branch in the main checkout. Create a worktree (`git worktree add ../lumen-<task> -b <task-branch>`) and edit/commit/test there.
- Merge to the integration branch only when (a) Red says it's done, (b) Red asks to merge, or (c) you ask and Red says yes. Prefer `--no-ff`. Remove the worktree with `git worktree remove` after the merge lands.

---

## 4. Local dev workflow

The whole stack runs in Docker. Common ops:

```bash
# Bring up the dev stack (postgres, redis, api, worker, web, caddy)
docker compose up -d

# Tail all logs
docker compose logs -f

# Backend shell / migrations / seed
docker compose exec api python manage.py migrate
docker compose exec api python manage.py import_catalog        # one-shot importer from prototype/data.js
docker compose exec api python manage.py createsuperuser
docker compose exec api python manage.py shell

# Frontend dev (HMR runs in the web container; bind mount the source)
docker compose logs -f web

# Run all tests
docker compose exec api pytest
docker compose exec web pnpm test         # vitest
docker compose exec web pnpm test:e2e     # playwright

# Lint + format
docker compose exec api ruff check . --fix && docker compose exec api ruff format .
docker compose exec web pnpm lint --fix && docker compose exec web pnpm format

# Reset DB to a clean seeded state (refuses unless DJANGO_DEBUG=1)
./infra/scripts/seed.sh
```

After writing code, **run the linter+formatter before committing**. Pre-commit hooks (`.pre-commit-config.yaml` — ruff + prettier + standard hygiene) enforce this; don't bypass them. Install once with `brew install pre-commit && pre-commit install`.

---

## 5. Design-system contract

The prototype is the spec. Pixel fidelity is a non-negotiable.

- All design tokens (colors, radii, spacing, type ramp, shadows, easings) live in `prototype/styles.css` and **must be ported verbatim** to `frontend/styles/tokens.css`. Don't paraphrase, round, or "interpret."
- New components must first be reviewed against the prototype's visual language. If the prototype already has a similar component, port it rather than invent. If it doesn't, propose it before building (see §11).
- Animations and easings must match the prototype: card hover (0.6s `cubic-bezier(0.2, 0.8, 0.2, 1)`), drawer slide (0.4s same curve), fly-to-cart dot (0.85s `cubic-bezier(0.5, 0, 0.4, 1)`), cart bump bounce, etc. These are in `prototype/styles.css`.
- Fonts are **self-hosted from our own origin at runtime**. Inter, Instrument Serif, and JetBrains Mono are loaded via `next/font/google` in `app/layout.tsx` — Next.js fetches the woff2s once at build time and bundles them into `_next/static`, so the browser never hits Google Fonts. If a future Mac mini deployment goes fully air-gapped, swap to `next/font/local` with the woff2s checked into `frontend/public/fonts/`. Never use a runtime `<link href="fonts.googleapis.com">`.
- The placeholder striped imagery (`prototype/components.jsx:Placeholder`) is for the prototype only — replace with real product imagery served from local storage / S3.

`docs/design-system.md` is the canonical writeup of which tokens and components have been ported and how to extend them.

---

## 6. Testing expectations

| Layer | Tool | Minimum coverage |
|---|---|---|
| Django models / views / serializers | `pytest` + `pytest-django` | 85% on `catalog`, `cart`, `orders`, `promotions`; 70% elsewhere |
| Frontend components | `vitest` + Testing Library | 70% statements, 80% on `lib/` utilities |
| End-to-end | `playwright` | Golden-path coverage for shop → PDP → add to cart → checkout → confirmation |

Rules:
- **No mocked databases** for integration tests — use real Postgres in a test container.
- Stripe tests use `stripe-mock` or test-mode keys; don't unit-mock the Stripe SDK.
- Every bug fix lands with a regression test that fails on the old code.
- Every PR runs the full test suite in CI before merging.

---

## 7. Performance budgets

- **LCP < 2.5s** on `/shop` (gallery), measured with throttled Fast 3G and 4× CPU slowdown.
- **API p95 < 200ms** on read endpoints (`/api/products/`, `/api/products/{slug}/`, `/api/categories/`).
- **TTFB < 400ms** for SSR pages on the Mac mini M4 Pro target.
- **CLS < 0.05** anywhere.
- **Bundle**: `/shop` first-load JS ≤ 180KB gzipped.

If a change blows a budget, the change blocks until the budget is fixed or explicitly raised.

---

## 8. Security baseline

- **Secrets** live in `.env` (gitignored). `.env.example` ships in the repo with placeholder values. Production secrets are loaded from `infra/secrets/` (also gitignored) into the running containers.
- **CSRF** on every Django form view; the API uses JWT and is exempt where appropriate.
- **Cookies**: HTTPS-only, `SameSite=Lax`, `Secure`, `HttpOnly` for session and cart-id cookies.
- **Stripe webhooks**: verify the signature with `stripe.Webhook.construct_event` on every incoming request. Reject anything that fails verification, no fallbacks.
- **Passwords**: Argon2 (Django's `ARGON2_PASSWORD_HASHER`) — not bcrypt, not pbkdf2 alone.
- **Rate limiting**: `/api/auth/*`, `/api/coupons/redeem/`, and `/api/checkout/*` rate-limited via `django-ratelimit` or DRF throttle classes.
- **Logging**: never log raw card data, full Stripe customer secrets, or session JWTs. `request.body` is opaque in our log formatter.
- **CORS**: explicit allowlist for the public site origin and the LAN dev origin only.
- **Dependencies**: `pip-audit` and `pnpm audit` run in CI; high-severity vulns block merge.

---

## 9. Self-hosting context — Mac mini M4 Pro (headless)

This stack runs on a single **Mac mini M4 Pro** (Apple Silicon, arm64, macOS, headless, SSH-only). Plan accordingly.

- **arm64 only.** Every container, every binary must be arm64-native. No x86 emulation. Pin arm64-compatible bases: `postgres:16`, `redis:7`, `python:3.12-slim`, `node:20-alpine`.
- **No GPU dependencies.** No CUDA. Apple Silicon CPU only.
- **Container runtime**: Docker Desktop or OrbStack on macOS.
- **Process supervision**: Docker Compose with `restart: unless-stopped` is the recommended path; a `launchd` plist is also provided as an alternative.
- **Reverse proxy + TLS**: Caddy (preferred, automatic Let's Encrypt) in front of the stack. `Caddyfile` covers both `lumen.local` (LAN) and a public domain.
- **Public exposure**: Cloudflare Tunnel — never open router ports. Config in `infra/cloudflared/`.
- **Resource budget**: Postgres `shared_buffers` constrained, **2** Celery workers, **1** Next.js Node process. Document assumed limits in `infra/README.md`.
- **Backups**: nightly `pg_dump` (03:15) + `restic` snapshot of the media volume (03:35) to an external volume. launchd plist templates ship in `infra/launchd/com.lumengoods.{pg,media}-backup.plist.example`.
- **Headless workflow**: every common op (deploy, seed, restore) has a CLI script in `infra/scripts/`. No GUI assumptions.

---

## 10. Do-not list

- **Don't phone home.** No analytics, telemetry, error reporters, or feature flags that beacon to a third party. If observability is needed, it's self-hosted.
- **Don't load fonts from a CDN at runtime.** `next/font/google` is fine — it bundles the woff2s into our origin at build time. A `<link href="fonts.googleapis.com">` in HTML is not.
- **Don't recreate real brand UI patterns.** Inspiration from Apple / Stripe / Shopify is fine; replication of their actual chrome is not.
- **Don't pad with filler.** No fake stats, fake badges, fake reviews beyond what the prototype defines. The prototype is the maximum data density.
- **Don't introduce SaaS dependencies.** Stripe is the one exception. Anything else (auth, search, queues, mail, monitoring) ships self-hosted; if a SaaS option is added, it must be flagged and offered alongside the self-hosted alternative.
- **Don't break arm64.** No `--platform=linux/amd64` images.
- **Don't deviate from the prototype.** If something looks different in production from the prototype, it's a regression. When in doubt, **ask before deviating**.

---

## 11. Working with the architect

This project follows the global Division of Labor: **Gemini is the architect, Claude is the executor.**

- The handoff brief and any subsequent design decisions from Gemini are the Blueprint. Implement them faithfully.
- Don't unilaterally invent business logic, change schemas, or pick architectural directions. If a roadblock requires a design change, **re-consult Gemini** via `/ask gemini` with the specific blocker before proceeding.
- If the Blueprint is ambiguous, contradicts existing code, or looks wrong: stop and ask. Do not improvise.
- "Fail fast." Don't silently retry, don't disable checks (`--no-verify`), don't hack around errors. Surface the full traceback to Red and let the architect respond.

---

## 12. Where to find things

- **Spec / brief**: `CLAUDE_CODE_HANDOFF.md`
- **Local-dev quickstart**: `README.md`
- **Mac mini deploy runbook**: `infra/README.md`
- **Design source-of-truth**: `prototype/` (do not edit; it's frozen)
- **Ported tokens**: `frontend/styles/tokens.css` + `frontend/styles/components.css`
- **Architecture**: `docs/architecture.md` (system diagram + full API surface + data flows)
- **Design-system writeup**: `docs/design-system.md` (token catalog + component port table + stylesheet split)
- **Stripe integration notes**: `docs/stripe.md`

`GEMINI.md` is generated from this file via `scripts/sync-agent-docs.sh`. Edit `CLAUDE.md` and run the script — never edit `GEMINI.md` by hand.
