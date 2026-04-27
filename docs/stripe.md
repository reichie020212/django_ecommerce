# Lumen Goods — Stripe integration

## Required env

Set these in `.env` before exercising the Payment step end-to-end:

```
STRIPE_SECRET_KEY=sk_test_…              # backend (PaymentIntent + webhook verify)
STRIPE_WEBHOOK_SECRET=whsec_…            # backend (webhook signature)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…   # frontend (Stripe.js + Elements)
```

Until real keys are set, the Shipping form still renders, but `POST /api/checkout/payment-intent/` returns `503 {"detail": "Set STRIPE_SECRET_KEY..."}` and the frontend surfaces that message in the checkout flow. Test keys come from your Stripe dashboard (`Developers → API keys`).

## Mode

- **Test mode** in dev (`sk_test_…`, `pk_test_…`).
- **Live mode** in prod — same env vars, swapped keys, loaded from `infra/secrets/`.

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /api/checkout/payment-intent/` | Validates the current cart and shipping body, creates an `Order` (status: pending), creates a Stripe `PaymentIntent`, returns `{ client_secret, payment_intent_id, order_id, display_number, amount_cents }`. |
| `POST /api/checkout/confirm/` | Body `{ payment_intent_id }`. Idempotent: re-retrieves the PI from Stripe; on `succeeded`, marks the Order paid, increments coupon redemptions, and clears the originating cart. |
| `POST /api/webhooks/stripe/` | Verifies the signature with `STRIPE_WEBHOOK_SECRET`; on `payment_intent.succeeded`, marks the Order paid (idempotent if already paid). On `payment_intent.payment_failed`, records `stripe_status`. |
| `POST /api/coupons/redeem/` | Body `{ code }`. Returns `{ valid, code, percent_off, amount_off_cents }` for redeemable coupons; `{ valid: false }` otherwise. `LUMEN10` (10% off) is seeded by `promotions/migrations/0002_seed_lumen10.py`. |

## Frontend wiring

`frontend/components/Checkout.tsx` uses `@stripe/react-stripe-js`'s `<Elements>` provider, fed with the `client_secret` returned from `POST /api/checkout/payment-intent/`. The `<PaymentElement />` renders the multi-method card form. Final charge runs `stripe.confirmPayment({ redirect: 'if_required' })`; on success the frontend POSTs to `/api/checkout/confirm/` to finalize the order server-side.

## Webhook events handled

- `payment_intent.succeeded` → mark order paid (idempotent), record `stripe_status = "succeeded"`, set `paid_at`.
- `payment_intent.payment_failed` → record `stripe_status = "failed"`. The customer-facing UI shows the Stripe error message inline; webhook is the safety net.
- `charge.refunded` → not handled in v1; refunds are issued from the Django admin and the webhook will be wired alongside accounts (task #11).

## Test cards

Stripe's published test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined), `4000 0000 0000 9995` (insufficient funds), `4000 0025 0000 3155` (3DS required). Any future expiry; any 3-digit CVC; any ZIP.

## Local webhook delivery (dev)

Stripe's CLI forwards live events to your local `/api/webhooks/stripe/`:

```bash
stripe listen --forward-to http://localhost:8000/api/webhooks/stripe/
# Copy the printed `whsec_…` into STRIPE_WEBHOOK_SECRET in .env, then restart api.
```

## Webhook signature verification

`orders.stripe_helpers.construct_webhook_event` wraps `stripe.Webhook.construct_event(payload, sig, secret)`. Bad signatures → 400. Missing config → 503. No fallbacks; we never trust an unverified webhook.

## Customer linkage (deferred)

A Stripe `Customer` is created on first authenticated checkout and stored on `accounts.User.stripe_customer_id` once accounts ship in task #11. Saved payment methods are referenced via `PaymentMethod` IDs, never stored locally as raw card data.
