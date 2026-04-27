"""Top-level URL configuration."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthz(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/healthz", healthz, name="healthz"),
    path("api/", include("catalog.urls")),
    path("api/", include("cart.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("promotions.urls")),
]
