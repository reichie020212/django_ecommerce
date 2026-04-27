# Lumen Goods — design system

> The prototype at `prototype/styles.css` is the source of truth. This document is the human-readable companion that catalogs which tokens have been ported and how to extend the system.

## Tokens

The full token set lives in `frontend/styles/tokens.css` (ported verbatim from the prototype's `:root` block). The Tailwind config (`frontend/tailwind.config.ts`) exposes those CSS variables as Tailwind utilities — never hard-code hex values in components.

### Color

| Token | Hex |
|---|---|
| `--slate-{50..950}` | Tailwind slate ramp |
| `--indigo-{50,100,500,600,700}` | Tailwind indigo (accents) |
| `--paper` | `#fafaf7` |
| `--paper-2` | `#f4f3ee` |
| `--ink` | `--slate-900` |
| `--ink-soft` | `--slate-600` |
| `--line` | `#e7e5df` |
| `--line-2` | `#d6d3cc` |
| `--accent` | `--indigo-600` |
| `--success` | `#16a34a` |
| `--danger` | `#dc2626` |

### Type

- `--font-sans`: Inter
- `--font-serif`: Instrument Serif
- `--font-mono`: JetBrains Mono

Loaded via `next/font/google` in `app/layout.tsx` (see [Fonts](#fonts) below). Bundled into our own origin at build time — the browser never hits Google Fonts at runtime.

### Radius

`--r-sm: 6px` · `--r-md: 10px` · `--r-lg: 16px` · `--r-xl: 24px`.

### Shadow

`--shadow-sm` · `--shadow-md` · `--shadow-lg` (see `prototype/styles.css`).

### Easing / motion

| Use | Curve | Duration |
|---|---|---|
| Card image scale on hover | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 0.6s |
| Card secondary image fade | `ease` | 0.4s |
| Card quick-add reveal | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 0.32s |
| Cart drawer slide | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 0.4s |
| Fly-to-cart dot | `cubic-bezier(0.5, 0, 0.4, 1)` | 0.85s + 0.25s opacity tail |
| Cart bump | `cubic-bezier(0.2, 0.8, 0.2, 1.2)` | 0.6s |
| Add-to-bag button cross-fade | `ease` | 0.2–0.25s |
| Accordion expand | `cubic-bezier(0.4, 0, 0.2, 1)` | 0.35s |

These are not aspirational — they're observable in `prototype/styles.css` and must match exactly.

## Components ported

All four screens from the prototype are live; this table lists the React components and the prototype source they're ported from. Update it whenever a new component lands.

| Component | Prototype source | Notes |
|---|---|---|
| `Topbar` | `prototype/topbar.jsx` | search debounced into `?search=`; cart icon shows live count, opens drawer |
| `Icon` registry | `prototype/icons.jsx` | 24-icon stroke set, `currentColor` |
| `Placeholder` | `prototype/components.jsx` | striped tone-tinted div |
| `Stars` | `prototype/components.jsx` | 5-star row |
| `ProductCard` | `prototype/components.jsx` | quick-add picks first color + first non-sold-out size |
| `Hero` | `prototype/gallery.jsx` | `/shop` editorial header + meta strip |
| `Filters` | `prototype/gallery.jsx` | category / price slider / color swatches / availability — every change round-trips through the URL |
| `GalleryToolbar` | `prototype/gallery.jsx` | sort dropdown + grid/rows toggle |
| `Footer` | `prototype/app.jsx` | site footer with brand block + columns |
| `PDP` | `prototype/pdp.jsx` | image gallery, color/size pickers, qty stepper, cross-fade `Add to bag`, accordion, related rail, JSON-LD `Product` |
| `CartDrawer` | `prototype/cart.jsx` | slide-out with scrim, qty-mini steppers, free-shipping progress, totals, Stripe-secured checkout link |
| `FlyDot` | `prototype/app.jsx` | dot animation from source button → cart icon, with `.cart-bump` |
| `Checkout` | `prototype/checkout.jsx` | Shipping → Payment (`<PaymentElement />`) → Review → Confirmation; coupon Apply with green discount line |
| `SignInForm`, `RegisterForm`, `Account` | new (no prototype) | additive auth/account screens; styled via `styles/auth.css` to match the rest of the design |

## Stylesheet split

The prototype's monolithic `prototype/styles.css` (1309 lines) is carved into three files in `frontend/styles/`, all imported from `app/globals.css`:

- `tokens.css` — the `:root` token block + body/scrollbar resets (lines 1–74 of the prototype). **Ported verbatim.**
- `components.css` — every component selector below (`.topbar`, `.card`, `.gallery`, `.pdp`, `.drawer`, `.checkout`, footer, animations). **Ported verbatim.**
- `auth.css` — additive layer for the auth/account screens that aren't in the prototype (`auth-shell`, `auth-card`, `account-shell`, `order-list`). Uses only existing tokens — no new hex values.

Tailwind's `base` preflight is intentionally omitted — it would undo the prototype's heading / paragraph defaults the design depends on. `components` and `utilities` directives stay so we can drop in ad-hoc helpers.

## Fonts

Loaded via `next/font/google` in `app/layout.tsx`:

- **Inter** — weights 400, 500, 600, 700
- **Instrument Serif** — weight 400, normal + italic
- **JetBrains Mono** — weights 400, 500

next/font fetches the woff2 files **at build time** and serves them from our own origin (`/_next/static/...`) at runtime — the browser never hits Google Fonts. CSS variables `--font-sans`, `--font-serif`, `--font-mono` are set on `<html>` via the font's `variable` option, overriding the fallback stack defined in `tokens.css`.

If we ever go fully air-gapped on the Mac mini, switch to `next/font/local` with the woff2 files dropped in `frontend/public/fonts/`. The CSS-variable contract stays the same; nothing else has to change.

## Extending

Before adding a new component:

1. Look at the prototype — does it already define something similar? Port it.
2. If not, propose the new component (its purpose, where it'll be used, sketch of the API) before implementing.
3. Use only tokens. No new hex values.
4. Match the prototype's animation language — same curves, same durations.
