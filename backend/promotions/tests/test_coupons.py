"""Coupon model + redeem endpoint tests."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from promotions.models import Coupon


@pytest.fixture
def api() -> APIClient:
    return APIClient()


def test_lumen10_seeded_via_data_migration(db) -> None:
    coupon = Coupon.objects.get(code="LUMEN10")
    assert coupon.percent_off == 10
    assert coupon.active


def test_redeem_valid_code(api, db) -> None:
    res = api.post("/api/coupons/redeem/", {"code": "lumen10"}, format="json")
    body = res.json()
    assert body["valid"]
    assert body["code"] == "LUMEN10"
    assert body["percent_off"] == 10


def test_redeem_invalid_code(api, db) -> None:
    res = api.post("/api/coupons/redeem/", {"code": "NOPE"}, format="json")
    assert res.json() == {"valid": False, "detail": "invalid or expired"}


def test_redeem_inactive_code(api, db) -> None:
    Coupon.objects.create(code="DEAD", percent_off=20, active=False)
    res = api.post("/api/coupons/redeem/", {"code": "DEAD"}, format="json")
    assert not res.json()["valid"]


def test_discount_for(db) -> None:
    c = Coupon.objects.get(code="LUMEN10")
    assert c.discount_for(48000) == 4800
    assert c.discount_for(0) == 0


def test_redemption_cap(db) -> None:
    c = Coupon.objects.create(code="ONCE", percent_off=15, max_redemptions=1, redemptions_used=1)
    assert not c.is_redeemable
