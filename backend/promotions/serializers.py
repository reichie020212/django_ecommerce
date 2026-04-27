"""Coupon serializer — only the fields the storefront needs to display savings."""

from __future__ import annotations

from rest_framework import serializers

from .models import Coupon


class CouponPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ("code", "percent_off", "amount_off_cents")
