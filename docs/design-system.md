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
| `Topbar` | `prototype/topbar.jsx` | pending |
| `ProductCard` | `prototype/components.jsx` | pending |
| `Hero` (Gallery) | `prototype/gallery.jsx` | pending |
| `Filters` | `prototype/gallery.jsx` | pending |
| `PDP gallery` | `prototype/pdp.jsx` | pending |
| `CartDrawer` | `prototype/cart.jsx` | pending |
| `Checkout` (multi-step) | `prototype/checkout.jsx` | pending |
| `Footer` | `prototype/app.jsx` | pending |

Update this table as components land.

## Extending

Before adding a new component:

1. Look at the prototype — does it already define something similar? Port it.
2. If not, propose the new component (its purpose, where it'll be used, sketch of the API) before implementing.
3. Use only tokens. No new hex values.
4. Match the prototype's animation language — same curves, same durations.
