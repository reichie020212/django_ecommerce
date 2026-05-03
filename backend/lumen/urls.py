"""Top-level URL configuration."""

from django.contrib import admin
from django.urls import include, path

from lumen.health import healthz, readyz

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/healthz", healthz, name="healthz"),
    path("api/readyz", readyz, name="readyz"),
    path("api/", include("catalog.urls")),
    path("api/", include("cart.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("promotions.urls")),
]
