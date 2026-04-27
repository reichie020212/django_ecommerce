"""Cart URL routes."""

from django.urls import path

from .views import CartLineCreateView, CartLineDetailView, CartView

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/lines/", CartLineCreateView.as_view(), name="cart-line-create"),
    path("cart/lines/<int:line_id>/", CartLineDetailView.as_view(), name="cart-line-detail"),
]
