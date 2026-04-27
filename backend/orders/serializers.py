"""Order serializers."""

from __future__ import annotations

from rest_framework import serializers

from .models import Order, OrderLine


class OrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLine
        fields = (
            "name",
            "sku",
            "color_name",
            "size",
            "qty",
            "price_cents",
            "line_total_cents",
        )


class OrderSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField(read_only=True)
    lines = OrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "display_number",
            "status",
            "customer_email",
            "ship_first_name",
            "ship_last_name",
            "ship_city",
            "ship_state",
            "ship_zip",
            "ship_country",
            "ship_method",
            "subtotal_cents",
            "discount_cents",
            "shipping_cents",
            "tax_cents",
            "total_cents",
            "coupon_code_at_purchase",
            "stripe_payment_intent_id",
            "stripe_status",
            "created_at",
            "paid_at",
            "lines",
        )
        read_only_fields = fields


class ShippingInputSerializer(serializers.Serializer):
    """Body shape for POST /api/checkout/payment-intent/."""

    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    address = serializers.CharField(max_length=200)
    apt = serializers.CharField(required=False, allow_blank=True, default="", max_length=40)
    city = serializers.CharField(max_length=80)
    state = serializers.CharField(max_length=80)
    zip = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=80, default="United States")
    ship_method = serializers.ChoiceField(
        choices=("standard", "express", "overnight"), default="express"
    )
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
