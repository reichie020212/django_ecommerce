# Lumen Goods — design system

> The prototype at `prototype/styles.css` is the source of truth. This document is the human-readable companion that catalogs which tokens have been ported and how to extend the system.

## Tokens (ported in task #6)

The full token set lives in `frontend/styles/tokens.css`. The Tailwind config (`frontend/tailwind.config.ts`) exposes those CSS variables as Tailwind utilities — never hard-code hex values in components.

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

Self-hosted via `next/font/local`. Do not load from Google Fonts CDN at runtime.

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

| Component | Source | Status |
|---|---|---|
| `Topbar` | `prototype/topbar.jsx` | ✅ ported (search wired to URL) |
| `Icon` registry | `prototype/icons.jsx` | ✅ ported (24 icons) |
| `Placeholder` | `prototype/components.jsx` | ✅ ported |
| `Stars` | `prototype/components.jsx` | ✅ ported |
| `ProductCard` | `prototype/components.jsx` | ✅ ported (quick-add is a no-op until task #9) |
| `Hero` (Gallery) | `prototype/gallery.jsx` | ✅ ported |
| `Filters` | `prototype/gallery.jsx` | ✅ ported (URL-state) |
| `GalleryToolbar` | `prototype/gallery.jsx` | ✅ ported |
| `Footer` | `prototype/app.jsx` | ✅ ported |
| `PDP gallery` | `prototype/pdp.jsx` | pending (task #8) |
| `CartDrawer` | `prototype/cart.jsx` | pending (task #9) |
| `Checkout` (multi-step) | `prototype/checkout.jsx` | pending (task #10) |

Update this table as components land.

## Stylesheet split

The prototype's monolithic `prototype/styles.css` (1309 lines) is carved into two files in `frontend/styles/`:

- `tokens.css` — the `:root` token block + body/scrollbar resets (lines 1–74 of the prototype). **Ported verbatim.**
- `components.css` — every component selector below (`.topbar`, `.card`, `.gallery`, `.checkout`, etc.). **Ported verbatim.**

Both are imported from `app/globals.css`. Tailwind's `base` preflight is intentionally omitted — it would undo the prototype's heading / paragraph defaults the design depends on. `components` and `utilities` directives stay so we can drop in ad-hoc helpers.

## Fonts

Loaded via `next/font/google` in `app/layout.tsx`:

- **Inter** — weights 400, 500, 600, 700
- **Instrument Serif** — weight 400, normal + italic
- **JetBrains Mono** — weights 400, 500

next/font fetches the woff2 files at build time and serves them from our own origin at runtime. CSS variables `--font-sans`, `--font-serif`, `--font-mono` are set on `<html>` via the font's `variable` option, overriding the fallback stack defined in `tokens.css`.

If we ever go fully air-gapped on the Mac mini, switch to `next/font/local` with the woff2 files dropped in `public/fonts/`.

## Extending

Before adding a new component:

1. Look at the prototype — does it already define something similar? Port it.
2. If not, propose the new component (its purpose, where it'll be used, sketch of the API) before implementing.
3. Use only tokens. No new hex values.
4. Match the prototype's animation language — same curves, same durations.
