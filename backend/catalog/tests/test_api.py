"""Catalog API smoke tests.

Hits a real PostgreSQL test DB (no mocks) per the testing rule in CLAUDE.md.
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


def test_importer_is_idempotent(db) -> None:
    out = StringIO()
    call_command("import_catalog", stdout=out)
    first = out.getvalue()

    out = StringIO()
    call_command("import_catalog", stdout=out)
    assert first == out.getvalue(), "second run should produce identical summary"


def test_product_list_returns_all_seeded(api, seeded) -> None:
    resp = api.get("/api/products/")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 9
    assert {p["sku"] for p in body} == {f"lg-{n:03d}" for n in range(1, 10)}


def test_product_list_filters_by_category(api, seeded) -> None:
    resp = api.get("/api/products/?category=outerwear")
    skus = [p["sku"] for p in resp.json()]
    assert skus == ["lg-001", "lg-006"]


def test_product_list_filters_by_color(api, seeded) -> None:
    resp = api.get("/api/products/?color=Noir")
    skus = [p["sku"] for p in resp.json()]
    assert skus == ["lg-001", "lg-002", "lg-005", "lg-006", "lg-008"]


def test_product_list_filters_by_max_price(api, seeded) -> None:
    # max_price is in cents; $200 = 20000.
    resp = api.get("/api/products/?max_price=20000")
    skus = sorted(p["sku"] for p in resp.json())
    assert skus == ["lg-003", "lg-005", "lg-007", "lg-009"]


def test_product_list_search(api, seeded) -> None:
    resp = api.get("/api/products/?search=linen")
    skus = [p["sku"] for p in resp.json()]
    assert skus == ["lg-009"]


def test_product_list_sort_low_to_high(api, seeded) -> None:
    resp = api.get("/api/products/?sort=low")
    prices = [p["price"] for p in resp.json()]
    assert prices == sorted(prices)


def test_product_detail(api, seeded) -> None:
    resp = api.get("/api/products/meridian-wool-overcoat/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["sku"] == "lg-001"
    assert body["sold_out"] == ["XS"]
    assert "Bemberg cupro lining" in body["details"]


def test_product_detail_color_order_matches_prototype(api, seeded) -> None:
    """Regression: lg-002's colors must come back as [Sand, Moss, Noir]."""
    resp = api.get("/api/products/field-selvedge-trouser/")
    names = [c["name"] for c in resp.json()["colors"]]
    assert names == ["Sand", "Moss", "Noir"]


def test_categories_endpoint(api, seeded) -> None:
    resp = api.get("/api/categories/")
    slugs = [c["slug"] for c in resp.json()]
    assert slugs == [
        "outerwear",
        "knitwear",
        "shirts",
        "t-shirts",
        "trousers",
        "footwear",
        "bags",
    ]


def test_product_detail_404(api, seeded) -> None:
    resp = api.get("/api/products/does-not-exist/")
    assert resp.status_code == 404
