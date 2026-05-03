"""Liveness (/api/healthz) and readiness (/api/readyz) probes.

Cloud load balancers and container orchestrators use these to manage
traffic and restarts. healthz reports process-up; readyz also verifies
the database and Celery broker are reachable so traffic isn't routed to
a node that can't actually serve a request.
"""

from __future__ import annotations

from django.conf import settings
from django.db import OperationalError, connection
from django.http import HttpRequest, JsonResponse


def healthz(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


def readyz(_request: HttpRequest) -> JsonResponse:
    checks: dict[str, str] = {}
    ok = True

    try:
        connection.ensure_connection()
        checks["db"] = "ok"
    except OperationalError as exc:
        checks["db"] = f"error: {type(exc).__name__}"
        ok = False

    try:
        import redis as redis_lib

        client = redis_lib.Redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=1)
        client.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {type(exc).__name__}"
        ok = False

    return JsonResponse(
        {"status": "ok" if ok else "error", "checks": checks},
        status=200 if ok else 503,
    )
