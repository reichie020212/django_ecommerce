"""Liveness and readiness probe tests."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api() -> APIClient:
    return APIClient()


def test_healthz_returns_ok(api: APIClient) -> None:
    resp = api.get("/api/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_readyz_ok_when_deps_up(api: APIClient, db: None, monkeypatch: pytest.MonkeyPatch) -> None:
    import redis as redis_lib

    monkeypatch.setattr(redis_lib.Redis, "ping", lambda self: True)

    resp = api.get("/api/readyz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["checks"] == {"db": "ok", "redis": "ok"}


def test_readyz_503_when_redis_down(
    api: APIClient, db: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    import redis as redis_lib

    def boom(self: object) -> None:
        raise redis_lib.exceptions.ConnectionError("simulated")

    monkeypatch.setattr(redis_lib.Redis, "ping", boom)

    resp = api.get("/api/readyz")
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "error"
    assert body["checks"]["db"] == "ok"
    assert body["checks"]["redis"].startswith("error:")
