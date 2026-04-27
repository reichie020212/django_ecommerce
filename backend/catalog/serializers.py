"""DRF serializers for catalog endpoints.

Two product shapes:
- ProductListSerializer  — slim, used in /api/products/
- ProductDetailSerializer — full, used in /api/products/<slug>/
"""

from __future__ import annotations

from rest_framework import serializers

from .models import Category, Color, Product, Variant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("slug", "name", "sort_order")


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ("name", "hex", "tone")


class _ProductBaseSerializer(serializers.ModelSerializer):
    """Shared fields used by both list and detail serializers."""

    category = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    category_name = serializers.CharField(source="category.name", read_only=True)
    price = serializers.IntegerField(source="price_cents", read_only=True)
    was = serializers.IntegerField(source="was_cents", read_only=True, allow_null=True)
    colors = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    sold_out = serializers.SerializerMethodField()

    def get_colors(self, product: Product) -> list[dict]:
        # Walk the through-model so per-product ordering (ProductColor.sort_order)
        # is preserved. The view prefetches productcolor_set ordered correctly.
        return [
            {"name": pc.color.name, "hex": pc.color.hex, "tone": pc.color.tone}
            for pc in product.productcolor_set.all()
        ]

    def get_sizes(self, product: Product) -> list[str]:
        # Distinct sizes preserving first-seen order across variants.
        seen: list[str] = []
        for v in product.variants.all():
            if v.size not in seen:
                seen.append(v.size)
        return seen

    def get_sold_out(self, product: Product) -> list[str]:
        # A size is "sold out" when *every* variant of that size has stock == 0.
        by_size: dict[str, list[int]] = {}
        for v in product.variants.all():
            by_size.setdefault(v.size, []).append(v.stock)
        return sorted(s for s, stocks in by_size.items() if not any(stocks))


class ProductListSerializer(_ProductBaseSerializer):
    class Meta:
        model = Product
        fields = (
            "sku",
            "slug",
            "name",
            "category",
            "category_name",
            "price",
            "was",
            "tag",
            "rating",
            "reviews_count",
            "tone",
            "alt_tone",
            "colors",
            "sizes",
            "sold_out",
        )


class ProductDetailSerializer(_ProductBaseSerializer):
    class Meta:
        model = Product
        fields = (
            "sku",
            "slug",
            "name",
            "category",
            "category_name",
            "price",
            "was",
            "tag",
            "rating",
            "reviews_count",
            "tone",
            "alt_tone",
            "description",
            "details",
            "colors",
            "sizes",
            "sold_out",
        )


class VariantSerializer(serializers.ModelSerializer):
    color = serializers.CharField(source="color.name", read_only=True)

    class Meta:
        model = Variant
        fields = ("id", "color", "size", "stock", "in_stock")
