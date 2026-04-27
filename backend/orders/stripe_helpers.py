"""Thin wrapper around the Stripe SDK so views don't import it directly.

The dev .env ships placeholder keys (sk_test_replace_me). Anything that hits
Stripe will return a clear "stripe not configured" error in that case so the
shipping/review steps still render. Set real test keys to exercise the full
flow end-to-end (see docs/stripe.md).
"""

from __future__ import annotations

from typing import Any

import stripe
from django.conf import settings


class StripeNotConfiguredError(Exception):
    """Raised when Stripe keys are missing or still set to the placeholder."""


def _ensure_configured() -> None:
    key = settings.STRIPE_SECRET_KEY or ""
    if not key or "replace_me" in key.lower():
        raise StripeNotConfiguredError(
            "Set STRIPE_SECRET_KEY (e.g. sk_test_…) in .env to enable Stripe."
        )
    stripe.api_key = key


def create_payment_intent(
    *, amount_cents: int, currency: str = "usd", metadata: dict[str, str] | None = None
) -> dict[str, Any]:
    _ensure_configured()
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        automatic_payment_methods={"enabled": True},
        metadata=metadata or {},
    )
    return {"id": intent.id, "client_secret": intent.client_secret, "status": intent.status}


def retrieve_payment_intent(pi_id: str) -> dict[str, Any]:
    _ensure_configured()
    intent = stripe.PaymentIntent.retrieve(pi_id)
    return {"id": intent.id, "status": intent.status, "amount": intent.amount}


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify Stripe webhook signature; raises stripe.SignatureVerificationError on bad sig."""
    _ensure_configured()
    secret = settings.STRIPE_WEBHOOK_SECRET or ""
    if not secret or "replace_me" in secret.lower():
        raise StripeNotConfiguredError("Set STRIPE_WEBHOOK_SECRET in .env to verify webhooks.")
    return stripe.Webhook.construct_event(payload, sig_header, secret)
