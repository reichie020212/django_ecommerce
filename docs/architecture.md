# Lumen Goods — architecture

How the system fits together. The spec is in `CLAUDE_CODE_HANDOFF.md`; this doc reflects what's actually built.

## System diagram (logical)

```
                  ┌──────────────────────────────────────────────────────────┐
                  │  Mac mini M4 Pro (arm64, headless, OrbStack)             │
[ public Internet ] ──HTTPS──> [ cloudflared ] ──> [ Caddy ] ──┬──> [ Next.js (web) ]
                                                                ├──> [ Django API (gunicorn) ]
                                                                │       │
                                                                │       ├──> [ Postgres 16 ]
                                                                │       ├──> [ Redis 7 ] (cache + Celery broker)
                                                                │       └──> [ Stripe ] (PaymentIntent + webhooks)
                                                                │
                                                                └──> [ Celery worker ] (async tasks, webhooks)
                  └──────────────────────────────────────────────────────────┘
```

LAN access (`https://lumen.local`) goes Caddy → Caddy's internal CA. Public access (`https://lumen.example`) goes through Cloudflare Tunnel — no router ports opened.

## Bounded contexts (Django apps)

| App | Owns | State |
|---|---|---|
| `catalog` | `Product`, `Variant` (color × size + stock), `Category`, `Color`, `ProductColor`, `Image` | shipped |
| `cart` | `Cart` + `CartLine`, cookie-keyed (`lumen_cart_id`) | shipped |
| `orders` | `Order`, `OrderLine` (snapshot fields), Stripe payment-intent flow + webhook | shipped |
| `promotions` | `Coupon` (LUMEN10 = 10%) | shipped |
| `accounts` | Custom email-as-username `User`, `Address`, `stripe_customer_id` | shipped (saved cards UI deferred) |
| `content` | Editorial pages | post-launch |

## API surface

```
GET    /api/products/              list + filter (category, max_price, color, availability, search) + sort
GET    /api/products/<slug>/       detail
GET    /api/categories/

GET    /api/cart/                  return-or-create cart (sets cookie)
POST   /api/cart/lines/            add line by {product_slug, color, size, qty}
PATCH  /api/cart/lines/<id>/       update qty (qty=0 deletes)
DELETE /api/cart/lines/<id>/

POST   /api/coupons/redeem/        validate code

POST   /api/checkout/payment-intent/  create Order(pending) + Stripe PI
POST   /api/checkout/confirm/         finalize on PI succeeded
POST   /api/webhooks/stripe/          signature-verified webhook

POST   /api/auth/register/         create user + JWT pair
POST   /api/auth/login/            obtain JWT pair
POST   /api/auth/refresh/          refresh access
GET    /api/auth/me/               current user
GET    /api/addresses/             list / GET POST PATCH DELETE
POST   /api/addresses/<id>/

GET    /api/orders/                user's orders (auth)
GET    /api/orders/<id>/           order detail (auth, scoped)
```

## Data flow — add to cart

1. Browser → `POST /api/cart/lines/ {product_slug, color, size, qty}` (cookie travels both ways).
2. Backend resolves to a `Variant`, upserts a `CartLine` (existing line bumps qty), recomputes totals, returns the full cart.
3. Frontend `CartProvider` mutates local state optimistically before the call and reconciles on the response.

## Data flow — checkout

1. Frontend `POST /api/checkout/payment-intent/` with shipping + ship_method + optional coupon_code (cart cookie travels with).
2. Backend validates cart, applies coupon discount, computes shipping (free express > $200, $28 overnight), 8.5% tax, creates `Order(status='pending')` with snapshot lines, creates Stripe `PaymentIntent`, attaches `user_id` if authenticated.
3. Frontend renders `<PaymentElement />` with the returned `client_secret`. User submits → `stripe.confirmPayment({ redirect: 'if_required' })`.
4. On Stripe success, frontend `POST /api/checkout/confirm/ {payment_intent_id}`. Backend re-fetches PI from Stripe, marks Order paid, increments `Coupon.redemptions_used`, clears the originating cart.
5. Asynchronously, Stripe also fires `payment_intent.succeeded` to `/api/webhooks/stripe/`. The webhook handler verifies the signature, marks the Order paid (idempotent — does nothing if step 4 already ran).

## Idempotency

- `POST /api/checkout/confirm/` is idempotent on `payment_intent_id` — re-calling it for an already-paid order returns the order as-is, no Stripe round-trip.
- The Stripe webhook handler is idempotent by checking `Order.status` before mutating.
- The cart `POST /lines/` is idempotent in shape: same (variant, cart) bumps qty rather than creating a duplicate row (`unique_together`).

## Authentication

- `accounts.User` extends `AbstractUser` with `email` as `USERNAME_FIELD` and a `stripe_customer_id`.
- DRF SimpleJWT issues access+refresh on register/login. Frontend stores both in `localStorage` and attaches `Authorization: Bearer <access>` via `authedFetch`.
- Anonymous endpoints (catalog, cart, coupons, checkout) accept either no auth or a Bearer token; auth is read but not required.
- Auth-only endpoints (`/auth/me/`, `/addresses/`, `/orders/`) require `IsAuthenticated`.
- `/auth/*` is rate-limited at 20 requests/min/IP via a custom `AuthRateThrottle`.

## Observability (deferred to post-launch)

Structured JSON logs from Django + Next.js → `journald` on the host. Self-hosted only — no external APMs. See `infra/README.md` §12.
