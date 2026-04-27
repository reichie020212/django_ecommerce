"""Cart API smoke tests against a real Postgres test DB."""

from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

CART_COOKIE = "lumen_cart_id"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def seeded(db) -> None:
    call_command("import_catalog", stdout=StringIO())


def test_get_cart_creates_cart_and_sets_cookie(api, seeded) -> None:
    res = api.get("/api/cart/")
    assert res.status_code == 200
    assert res.json()["lines"] == []
    assert res.json()["total_cents"] == 0
    assert CART_COOKIE in res.cookies


def test_add_line_then_get_includes_line(api, seeded) -> None:
    add = api.post(
        "/api/cart/lines/",
        {
            "product_slug": "meridian-wool-overcoat",
            "color": "Stone",
            "size": "M",
            "qty": 2,
        },
        format="json",
    )
    assert add.status_code == 201
    cart = add.json()
    assert cart["item_count"] == 2
    assert cart["subtotal_cents"] == 96000  # 480 * 2 * 100
    assert cart["shipping_cents"] == 0
    assert cart["lines"][0]["color"]["name"] == "Stone"
    assert cart["lines"][0]["size"] == "M"


def test_add_line_unknown_variant_404(api, seeded) -> None:
    res = api.post(
        "/api/cart/lines/",
        {"product_slug": "meridian-wool-overcoat", "color": "Stone", "size": "ZZZ"},
        format="json",
    )
    assert res.status_code == 404


def test_add_same_variant_twice_bumps_qty(api, seeded) -> None:
    body = {"product_slug": "dune-heavyweight-tee", "color": "Cream", "size": "M", "qty": 1}
    api.post("/api/cart/lines/", body, format="json")
    add2 = api.post("/api/cart/lines/", body, format="json")
    cart = add2.json()
    assert len(cart["lines"]) == 1
    assert cart["lines"][0]["qty"] == 2


def test_patch_line_updates_qty(api, seeded) -> None:
    add = api.post(
        "/api/cart/lines/",
        {"product_slug": "linen-camp-shirt", "color": "Rose", "size": "M"},
        format="json",
    )
    line_id = add.json()["lines"][0]["id"]
    res = api.patch(f"/api/cart/lines/{line_id}/", {"qty": 5}, format="json")
    assert res.json()["lines"][0]["qty"] == 5


def test_patch_line_zero_qty_deletes(api, seeded) -> None:
    add = api.post(
        "/api/cart/lines/",
        {"product_slug": "linen-camp-shirt", "color": "Rose", "size": "M"},
        format="json",
    )
    line_id = add.json()["lines"][0]["id"]
    res = api.patch(f"/api/cart/lines/{line_id}/", {"qty": 0}, format="json")
    assert res.json()["lines"] == []


def test_delete_line_removes_it(api, seeded) -> None:
    add = api.post(
        "/api/cart/lines/",
        {"product_slug": "linen-camp-shirt", "color": "Rose", "size": "M"},
        format="json",
    )
    line_id = add.json()["lines"][0]["id"]
    res = api.delete(f"/api/cart/lines/{line_id}/")
    assert res.status_code == 200
    assert res.json()["lines"] == []


def test_free_shipping_threshold(api, seeded) -> None:
    # Subtotal $640 (Atlas Holdall) > $200 → shipping = 0.
    add = api.post(
        "/api/cart/lines/",
        {"product_slug": "atlas-leather-holdall", "color": "Clay", "size": "One Size"},
        format="json",
    )
    cart = add.json()
    assert cart["subtotal_cents"] == 64000
    assert cart["shipping_cents"] == 0

    # Smaller subtotal triggers $14 shipping.
    api.cookies.clear()  # fresh cart
    add = api.post(
        "/api/cart/lines/",
        {"product_slug": "dune-heavyweight-tee", "color": "Cream", "size": "M"},
        format="json",
    )
    cart = add.json()
    assert cart["subtotal_cents"] == 7800
    assert cart["shipping_cents"] == 1400


def test_cart_persists_across_requests_via_cookie(api, seeded) -> None:
    api.post(
        "/api/cart/lines/",
        {"product_slug": "linen-camp-shirt", "color": "Rose", "size": "M"},
        format="json",
    )
    again = api.get("/api/cart/")
    assert len(again.json()["lines"]) == 1
