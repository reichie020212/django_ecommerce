"""Orders / checkout URL routes."""

from django.urls import path

from .views import (
    ConfirmOrderView,
    OrderDetailView,
    OrderListView,
    PaymentIntentView,
    stripe_webhook,
)

urlpatterns = [
    path("checkout/payment-intent/", PaymentIntentView.as_view(), name="checkout-payment-intent"),
    path("checkout/confirm/", ConfirmOrderView.as_view(), name="checkout-confirm"),
    path("webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
