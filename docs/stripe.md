# Lumen Goods — Stripe integration

> Skeleton. Real implementation lands in task #10.

## Mode

- **Test mode** in dev (`pk_test_…`, `sk_test_…`).
- **Live mode** in prod, keys loaded from `.env` (gitignored).

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /api/checkout/payment-intent/` | Create a PaymentIntent for the current cart; returns `client_secret`. |
| `POST /api/checkout/confirm/` | Idempotent finalization on PaymentIntent ID. |
| `POST /api/webhooks/stripe/` | Stripe webhook handler. Verifies the signature and dispatches Celery tasks for receipts / order fulfilment. |

## Webhook events handled

- `payment_intent.succeeded` → mark order paid; queue email receipt.
- `payment_intent.payment_failed` → surface error on order; notify customer.
- `charge.refunded` → mark order refunded.

## Test cards

Use Stripe's published test card numbers — `4242 4242 4242 4242` for success, `4000 0000 0000 9995` for insufficient funds, etc. Any future expiry; any 3-digit CVC.

## Customer linkage

A Stripe `Customer` is created on first authenticated checkout and stored on `accounts.User.stripe_customer_id`. Saved payment methods are referenced via `PaymentMethod` IDs, never stored locally as raw card data.

## Webhook signature verification

Verify on every request:

```python
import stripe
event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
```

Reject with 400 on `SignatureVerificationError`. No fallbacks.
