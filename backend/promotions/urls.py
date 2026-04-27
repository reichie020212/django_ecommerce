"""Promotions URL routes."""

from django.urls import path

from .views import CouponRedeemView

urlpatterns = [
    path("coupons/redeem/", CouponRedeemView.as_view(), name="coupon-redeem"),
]
