# Claude Code Handoff — Lumen Goods E-commerce

> **Mission**: Take the high-fidelity HTML/React prototype in this project and ship it as a production-grade, self-hosted modern e-commerce store.

---

## 1. The Prototype

The design source-of-truth lives in this project:

- `Lumen Goods.html` — the entry HTML (loads React 18 via UMD + Babel standalone)
- `styles.css` — the full design system (tokens, layout, components)
- `data.js` — sample product catalog (`PRODUCTS`, `CATEGORIES`, helpers on `window.LUMEN`)
- `icons.jsx` — minimal stroke icon set
- `components.jsx` — `Placeholder`, `Stars`, `ProductCard`
- `topbar.jsx` — sticky navigation
- `gallery.jsx` — hero + filters + grid (Product Gallery screen)
- `pdp.jsx` — Product Detail Page with image gallery, size/color, add-to-cart animation
- `cart.jsx` — Slide-out cart drawer with totals
- `checkout.jsx` — Multi-step checkout (Shipping → Payment → Review → Confirmation)
- `app.jsx` — App shell, routing, fly-to-cart animation

**Brand**: Lumen Goods — a fictional premium goods atelier (original, no real-brand recreation).
**Visual language**: minimalist, premium (Apple/Stripe-inspired), Tailwind slate-900 + indigo-600 + warm paper neutrals. Inter (UI) + Instrument Serif (editorial) + JetBrains Mono (data).

> **Pixel fidelity matters.** Read every file. Lift exact tokens (colors, radii, spacing, type ramps, easing curves) from `styles.css`. Do not "interpret" — port.

---

## 2. Target Stack

- **Backend**: Django + Django REST Framework
- **Frontend**: Next.js (App Router, React 18+, TypeScript)
- **Styling**: Tailwind CSS (mirror the tokens from `styles.css`)
- **DB**: PostgreSQL
- **Cache / Queue**: Redis + Celery
- **Payments**: Stripe (real Payment Intents, not the prototype's simulation)
- **Auth**: JWT (DRF SimpleJWT) on the API; Next.js middleware for session handling
- **Storage**: Local filesystem at first (this is self-hosted) with an S3-compatible adapter ready for later
- **Search**: Postgres full-text (with a path to Meilisearch if it grows)

---

## 3. Deployment Target — Self-Hosted Mac mini M4 Pro (headless)

This will run on **my own Mac mini M4 Pro, headless**. Plan accordingly:

- **OS**: macOS (Apple Silicon, arm64). Everything must build/run natively on arm64 — no x86_64-only images.
- **Containerization**: Docker Desktop or OrbStack on macOS. All services (web, api, db, redis, worker) defined in a single `docker-compose.yml`. Pin arm64-compatible base images (`postgres:16`, `redis:7`, `python:3.12-slim`, `node:20-alpine` are all fine).
- **Process supervision**: `launchd` plist for auto-start on boot, OR Docker Compose with `restart: unless-stopped`. Provide both options and recommend Compose-only for simplicity.
- **Reverse proxy + TLS**: Caddy (preferred — automatic Let's Encrypt) or Traefik in front of the stack. Provide a `Caddyfile` for `lumen.local` (LAN) and a public domain path.
- **Networking**: assume a residential connection. Document Cloudflare Tunnel as the recommended path to expose the store publicly without opening ports on the router. Provide config for it.
- **Backups**: nightly `pg_dump` to an external volume, plus a `restic` snapshot of the media directory. Cron entry included.
- **Resource budget**: the Mac mini M4 Pro has plenty of headroom, but constrain Postgres `shared_buffers`, the Celery worker count (2 workers), and Next.js to a single Node process. Document the assumed limits in `infra/README.md`.
- **No GPU dependencies.** No CUDA. Apple Silicon only.
- **Headless workflow**: everything must be reachable and operable via SSH. No GUI assumptions. CLI scripts for every common op (deploy, migrate, restore, rotate logs).

---

## 4. Required Documentation Files

Create both at the repo root, kept in sync:

### `CLAUDE.md`
Persistent instructions for Claude Code in this project. Must include:
- Project overview (what Lumen Goods is, the stack)
- Repo layout (frontend/, backend/, infra/, docs/)
- Conventions: TypeScript strict, Python type hints + `ruff` + `black`, conventional commits
- Local dev workflow (commands to start the stack, run migrations, seed data, run tests)
- Design-system contract: where tokens live, that they MUST mirror `styles.css` from the prototype, and that any new component must first be reviewed against the prototype's visual language
- Testing expectations: pytest for Django, Vitest + Playwright for Next.js, minimum coverage targets
- Performance budgets: LCP < 2.5s on the gallery, API p95 < 200ms on read endpoints
- Security baseline: secrets in `.env` (gitignored), CSRF on Django, HTTPS-only cookies, Stripe webhook signature verification
- Self-hosting context (Mac mini M4 Pro, arm64 only, Caddy, Cloudflare Tunnel)
- "Do not" list: no telemetry phoning home, no CDN-pinned fonts at build time (self-host fonts), no proprietary brand assets

### `GEMINI.md`
Same content as `CLAUDE.md`, formatted for Gemini CLI's expectations. Keep them in sync via a short script (`scripts/sync-agent-docs.sh`) that copies `CLAUDE.md` to `GEMINI.md` with a header swap, so a single edit propagates.

---

## 5. Feature Scope (port from prototype + extend for production)

### 5.1 Product Gallery (`/shop`)
- Server-rendered grid with filtering (category, price range, color, availability) and search
- Filters reflected in the URL (`?category=outerwear&price=0-300&color=stone`) for shareable state
- Hover state shows alternate image + quick-add CTA (port the exact animation from `gallery.jsx` / `components.jsx`)
- Sort by featured / newest / price asc / price desc
- Pagination or infinite scroll (pick infinite scroll with intersection observer; document the choice)

### 5.2 Product Detail Page (`/p/[slug]`)
- Image gallery (thumbnail strip + main) with keyboard nav
- Color and size selectors with live availability
- Quantity stepper
- Animated Add-to-Bag → fly-to-cart dot → cart-icon bump (port from `pdp.jsx` and `app.jsx`)
- Accordion for Materials / Shipping / Care
- "You might also like" carousel
- JSON-LD `Product` structured data

### 5.3 Cart Drawer
- Slide-out from the right with backdrop scrim
- Free-shipping progress bar, qty steppers, remove
- Persists across reloads (cookie-backed cart ID for guests, DB-backed for authed users)
- Optimistic updates with React Server Action mutations

### 5.4 Checkout
- Three steps: Shipping → Payment → Review → Confirmation
- Real Stripe Payment Intents (use Stripe Elements; the prototype's hand-rolled card form is for visual reference only — replace with `<PaymentElement />`)
- Address autocomplete (optional — flag behind a feature toggle)
- Promo code endpoint (`LUMEN10` for 10% off — keep this as a real coupon record in the DB)
- Webhook handler at `/api/stripe/webhook` to confirm orders and send email receipts

### 5.5 Account (new — not in prototype)
- Sign up / sign in (email + password, magic link optional)
- Order history
- Saved addresses
- Saved payment methods (via Stripe Customer)

### 5.6 Admin
- Use Django admin for the MVP (products, orders, coupons, users)
- Build a custom admin in Next.js later (out of scope for v1)

---

## 6. Backend Shape (DRF)

Suggested apps:
- `catalog` — `Product`, `Variant` (color × size), `Category`, `Image`, `Inventory`
- `cart` — guest carts (cookie ID) + user carts
- `orders` — `Order`, `OrderLine`, `Address`, `Payment`
- `accounts` — extends `AbstractUser`, addresses, saved cards (Stripe customer ID)
- `promotions` — `Coupon`, `Promotion`
- `content` — editorial pages (later)

Endpoints (REST):
```
GET    /api/products/                  list + filter + search
GET    /api/products/{slug}/           detail
GET    /api/categories/
POST   /api/cart/                      create guest cart
GET    /api/cart/{id}/
POST   /api/cart/{id}/lines/           add line
PATCH  /api/cart/{id}/lines/{line}/    update qty
DELETE /api/cart/{id}/lines/{line}/
POST   /api/checkout/payment-intent/   create Stripe PaymentIntent
POST   /api/checkout/confirm/          finalize order
POST   /api/webhooks/stripe/           Stripe webhook
GET    /api/orders/                    user's orders (auth)
GET    /api/orders/{id}/               order detail (auth or guest token)
POST   /api/coupons/redeem/            apply coupon
```

---

## 7. Repo Layout

```
lumen-goods/
├── CLAUDE.md
├── GEMINI.md
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── Caddyfile
├── .env.example
├── frontend/                   # Next.js (App Router, TS, Tailwind)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   │   └── tokens.css          # ported from prototype styles.css
│   └── public/
├── backend/                    # Django + DRF
│   ├── lumen/                  # project
│   ├── catalog/
│   ├── cart/
│   ├── orders/
│   ├── accounts/
│   ├── promotions/
│   ├── manage.py
│   └── pyproject.toml
├── infra/
│   ├── README.md               # how to operate the Mac mini deployment
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
│   ├── design-system.md        # ported tokens + component notes
│   └── stripe.md
└── scripts/
    └── sync-agent-docs.sh      # CLAUDE.md → GEMINI.md
```

---

## 8. Deliverables (Phase 1)

1. Repo scaffolded with the layout above.
2. Working `docker-compose up` that starts: postgres, redis, django api, celery worker, next.js, caddy.
3. Catalog seeded from `data.js` (write a one-shot importer).
4. All four screens (Gallery, PDP, Cart Drawer, Checkout) ported pixel-faithfully to Next.js, reading from the live API.
5. Stripe test-mode checkout end-to-end working.
6. `CLAUDE.md` and `GEMINI.md` complete and in sync.
7. `infra/README.md` with the exact step-by-step to deploy on a fresh Mac mini M4 Pro headless box (SSH-only).
8. `scripts/seed.sh` repopulates the DB from a clean state.
9. Backups cron entry installed.
10. Cloudflare Tunnel config + `Caddyfile` for both LAN and public access.

---

## 9. Non-Negotiables

- **Original branding only.** Do not introduce real-brand UI patterns (no Apple, no Stripe Dashboard, no Shopify chrome lifted wholesale). Inspiration is fine; replication is not.
- **arm64 native.** Every container, every binary.
- **Self-hostable end-to-end.** Anything that requires a SaaS account beyond Stripe must be flagged and offered with a self-hosted alternative.
- **Design fidelity.** The prototype is the spec. If something looks different in the production build, that's a regression.
- **No data slop.** Don't pad the UI with stats, badges, or filler that aren't in the prototype.

---

## 10. First Tasks for Claude Code

1. Read every file in this project. Build a mental model of the design system before writing code.
2. Generate `CLAUDE.md` and `GEMINI.md` using the spec in §4, then confirm with me before scaffolding.
3. Scaffold the repo per §7.
4. Stand up `docker-compose.yml` first; verify the empty stack boots cleanly on the Mac mini.
5. Build the catalog app, importer, and `/api/products/` endpoint.
6. Port the Gallery screen to Next.js, wired to the API.
7. Iterate screen-by-screen: PDP → Cart → Checkout.

When in doubt, **ask before deviating from the prototype**.
