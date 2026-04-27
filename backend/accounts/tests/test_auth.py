"""Account auth + addresses + order history."""

from __future__ import annotations

from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def seeded(db) -> None:
    call_command("import_catalog", stdout=StringIO())


def _register(api: APIClient, email: str = "a@b.com") -> dict:
    res = api.post(
        "/api/auth/register/",
        {"email": email, "password": "battery horse staple", "first_name": "A", "last_name": "B"},
        format="json",
    )
    assert res.status_code == 201, res.json()
    return res.json()


def test_register_returns_tokens_and_user(api, db) -> None:
    body = _register(api)
    assert body["access"]
    assert body["refresh"]
    assert body["user"]["email"] == "a@b.com"
    assert User.objects.filter(email="a@b.com").exists()


def test_login_with_email(api, db) -> None:
    _register(api, email="login@b.com")
    res = api.post(
        "/api/auth/login/",
        {"email": "login@b.com", "password": "battery horse staple"},
        format="json",
    )
    assert res.status_code == 200
    assert "access" in res.json()


def test_me_requires_auth(api, db) -> None:
    res = api.get("/api/auth/me/")
    assert res.status_code == 401


def test_me_returns_current_user(api, db) -> None:
    body = _register(api, email="me@b.com")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    res = api.get("/api/auth/me/")
    assert res.json()["email"] == "me@b.com"


def test_addresses_scoped_per_user(api, db) -> None:
    body = _register(api, email="alice@b.com")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    api.post(
        "/api/addresses/",
        {
            "label": "Home",
            "first_name": "Alice",
            "last_name": "B",
            "line1": "1 Way",
            "city": "NYC",
            "state": "NY",
            "postal_code": "10001",
            "is_default": True,
        },
        format="json",
    )
    listed = api.get("/api/addresses/").json()
    assert len(listed) == 1
    assert listed[0]["is_default"]

    # Second user can't see the first user's address.
    api2 = APIClient()
    body2 = _register(api2, email="bob@b.com")
    api2.credentials(HTTP_AUTHORIZATION=f"Bearer {body2['access']}")
    assert api2.get("/api/addresses/").json() == []


def test_orders_scoped_per_user(api, seeded) -> None:
    body = _register(api, email="orders@b.com")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {body['access']}")
    res = api.get("/api/orders/")
    assert res.status_code == 200
    assert res.json() == []
