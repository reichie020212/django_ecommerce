"""Catalog models — Product, Variant (color × size), Category, Color, Image.

Inventory is intentionally not a separate table for v1: stock lives on Variant
directly. Cart-hold reservations become a separate model when concurrency
demands it (post-launch).
"""

from __future__ import annotations

from django.db import models


class Category(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=80)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Color(models.Model):
    """Reusable color swatch — shared across products to keep the filter palette consistent."""

    name = models.CharField(max_length=50, unique=True)
    hex = models.CharField(max_length=7)
    tone = models.CharField(
        max_length=50,
        help_text="Placeholder-tone keyword from prototype/styles.css (e.g. 'stone', 'noir').",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    TAG_CHOICES = [("", "—"), ("new", "New"), ("sale", "Sale")]

    sku = models.CharField(max_length=20, unique=True, help_text="Stable code, e.g. 'lg-001'.")
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")

    price_cents = models.PositiveIntegerField()
    was_cents = models.PositiveIntegerField(null=True, blank=True)
    tag = models.CharField(max_length=10, choices=TAG_CHOICES, blank=True, default="")

    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    reviews_count = models.PositiveIntegerField(default=0)

    tone = models.CharField(max_length=50, help_text="Primary placeholder tone.")
    alt_tone = models.CharField(max_length=50, blank=True, default="")

    description = models.TextField(blank=True, default="")
    details = models.JSONField(default=list, help_text="Bullet strings shown in the PDP accordion.")

    colors = models.ManyToManyField(Color, through="ProductColor", related_name="products")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sku"]

    def __str__(self) -> str:
        return f"{self.sku} {self.name}"


class ProductColor(models.Model):
    """Per-product available color, with explicit ordering.

    Prototype swatch order is preserved so the API returns colors in the
    order shown on each product card.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    color = models.ForeignKey(Color, on_delete=models.PROTECT)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("product", "color")]
        ordering = ["product", "sort_order"]

    def __str__(self) -> str:
        return f"{self.product.sku} · {self.color.name}"


class Variant(models.Model):
    """A buyable (product, color, size) tuple. Stock = 0 means sold out."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    color = models.ForeignKey(Color, on_delete=models.PROTECT)
    size = models.CharField(
        max_length=20,
        help_text="Size string per the product's category — 'XS', '32', '9', 'One Size', etc.",
    )
    sort_order = models.PositiveIntegerField(
        default=0, help_text="Within a (product, color) group."
    )
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("product", "color", "size")]
        ordering = ["product", "color", "sort_order"]

    @property
    def in_stock(self) -> bool:
        return self.stock > 0

    def __str__(self) -> str:
        return f"{self.product.sku} · {self.color.name} · {self.size}"


class Image(models.Model):
    """Product imagery. Empty in v1 (the prototype renders striped placeholders)."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    file = models.ImageField(upload_to="products/")
    alt = models.CharField(max_length=200, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["product", "sort_order"]

    def __str__(self) -> str:
        return f"{self.product.sku} image #{self.sort_order}"
