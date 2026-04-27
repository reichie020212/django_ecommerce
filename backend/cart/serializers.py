"""Cart + CartLine serializers.

The drawer reads enough product context off each line to render without
a second fetch (name, slug, sku, price_cents, was_cents, color name/hex/tone,
size). Computed totals (subtotal/shipping/tax/total) live alongside the line
list to keep the UI logic trivial — the prototype's drawer derives the same
numbers locally.
"""

from __future__ import annotations

from rest_framework import serializers

from .models import Cart, CartLine


class CartLineSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    product_sku = serializers.CharField(source="variant.product.sku", read_only=True)
    name = serializers.CharField(source="variant.product.name", read_only=True)
    price_cents = serializers.IntegerField(source="variant.product.price_cents", read_only=True)
    was_cents = serializers.IntegerField(
        source="variant.product.was_cents", read_only=True, allow_null=True
    )
    color = serializers.SerializerMethodField()
    size = serializers.CharField(source="variant.size", read_only=True)
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = CartLine
        fields = (
            "id",
            "product_slug",
            "product_sku",
            "name",
            "price_cents",
            "was_cents",
            "color",
            "size",
            "qty",
            "line_total_cents",
        )

    def get_color(self, line: CartLine) -> dict:
        c = line.variant.color
        return {"name": c.name, "hex": c.hex, "tone": c.tone}

    def get_line_total_cents(self, line: CartLine) -> int:
        return line.variant.product.price_cents * line.qty


class CartSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    lines = CartLineSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal_cents = serializers.SerializerMethodField()
    shipping_cents = serializers.SerializerMethodField()
    tax_cents = serializers.SerializerMethodField()
    total_cents = serializers.SerializerMethodField()

    # Mirror prototype/cart.jsx totals:
    #   subtotal = sum(price * qty)
    #   shipping = subtotal > $200 ? 0 : $14   (zero on empty cart)
    #   tax      = round(subtotal * 0.085)
    FREE_SHIPPING_THRESHOLD_CENTS = 200_00
    EXPRESS_SHIPPING_CENTS = 14_00
    TAX_RATE = 0.085

    class Meta:
        model = Cart
        fields = (
            "id",
            "lines",
            "item_count",
            "subtotal_cents",
            "shipping_cents",
            "tax_cents",
            "total_cents",
        )

    def get_item_count(self, cart: Cart) -> int:
        return sum(line.qty for line in cart.lines.all())

    def get_subtotal_cents(self, cart: Cart) -> int:
        return sum(line.variant.product.price_cents * line.qty for line in cart.lines.all())

    def get_shipping_cents(self, cart: Cart) -> int:
        sub = self.get_subtotal_cents(cart)
        if sub == 0 or sub > self.FREE_SHIPPING_THRESHOLD_CENTS:
            return 0
        return self.EXPRESS_SHIPPING_CENTS

    def get_tax_cents(self, cart: Cart) -> int:
        return round(self.get_subtotal_cents(cart) * self.TAX_RATE)

    def get_total_cents(self, cart: Cart) -> int:
        return (
            self.get_subtotal_cents(cart) + self.get_shipping_cents(cart) + self.get_tax_cents(cart)
        )
