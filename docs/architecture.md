# Lumen Goods — architecture

> Skeleton — filled in incrementally as features land. This doc explains *how* the system fits together; it is not the spec (see `CLAUDE_CODE_HANDOFF.md`).

## System diagram (logical)

```
[ Cloudflare Tunnel ] ──HTTPS──> [ Caddy ] ──┬──> [ Next.js (web) ]  (HTML, RSC, static assets)
                                              ├──> [ Django API ]    (DRF; /api, /admin, /static, /media)
                                              │           │
                                              │           ├──> [ Postgres ]
                                              │           ├──> [ Redis ]   (cache + Celery broker)
                                              │           └──> [ Stripe ]
                                              │
                                              └──> [ Celery worker ] (async tasks, webhooks, emails)
```

## Bounded contexts (Django apps)

| App | Owns |
|---|---|
| `catalog` | `Product`, `Variant` (color × size), `Category`, `Image`, `Inventory` |
| `cart` | Guest carts (cookie-keyed) and user carts |
| `orders` | `Order`, `OrderLine`, `Address`, `Payment` |
| `accounts` | Custom user, addresses, Stripe Customer linkage |
| `promotions` | `Coupon`, `Promotion` |
| `content` | Editorial pages (later) |

## Data flow: add-to-cart

1. Frontend calls `POST /api/cart/{id}/lines/`.
2. Django validates the variant is in stock against `Inventory`.
3. Cart line persisted; updated cart returned.
4. Frontend updates UI optimistically and reconciles on the response.

## Data flow: checkout

1. `POST /api/checkout/payment-intent/` creates a Stripe `PaymentIntent` and returns its `client_secret`.
2. Stripe Elements collects the card; confirms via `client_secret`.
3. `POST /api/checkout/confirm/` finalizes the order on success.
4. Stripe fires a `payment_intent.succeeded` webhook to `/api/webhooks/stripe/`. Celery sends the email receipt.

## Idempotency

- `POST /api/checkout/confirm/` is idempotent on the PaymentIntent ID.
- Stripe webhook handlers dedupe on `event.id` via a Redis SET-EX with a 7-day TTL.

## Observability (later)

- Structured JSON logs from Django + Next.js → `journald` on the host.
- Self-hosted only — no external APMs.
