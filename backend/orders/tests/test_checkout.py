"""Checkout endpoint tests that don't require real Stripe.

End-to-end Stripe paths are exercised manually with real test keys; here we
cover the cart/coupon/validation logic and the configuration error path.
"""

from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def seeded(db) -> None:
    call_command("import_catalog", stdout=StringIO())


@pytest.fixture
def cart_with_overcoat(api, seeded) -> APIClient:
    api.post(
        "/api/cart/lines/",
        {"product_slug": "meridian-wool-overcoat", "color": "Stone", "size": "M", "qty": 1},
        format="json",
    )
    return api


def test_payment_intent_requires_cart(api, seeded) -> None:
    res = api.post("/api/checkout/payment-intent/", {}, format="json")
    assert res.status_code == 400
    assert "cart is empty" in res.json()["detail"]


def test_payment_intent_validates_shipping_fields(cart_with_overcoat) -> None:
    res = cart_with_overcoat.post(
        "/api/checkout/payment-intent/",
        {"email": "no@kidding.com"},  # missing required fields
        format="json",
    )
    assert res.status_code == 400


def _full_shipping(**override) -> dict:
    body = {
        "email": "a@b.com",
        "first_name": "A",
        "last_name": "B",
        "address": "1 St",
        "city": "NYC",
        "state": "NY",
        "zip": "10001",
        "ship_method": "express",
    }
    body.update(override)
    return body


def test_payment_intent_returns_503_when_stripe_unconfigured(cart_with_overcoat) -> None:
    res = cart_with_overcoat.post("/api/checkout/payment-intent/", _full_shipping(), format="json")
    assert res.status_code == 503
    assert "STRIPE_SECRET_KEY" in res.json()["detail"]


def test_confirm_unknown_payment_intent(api, seeded) -> None:
    res = api.post("/api/checkout/confirm/", {"payment_intent_id": "pi_missing"}, format="json")
    assert res.status_code == 404
