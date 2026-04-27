"""Catalog API views.

Endpoints
---------
GET /api/products/                  list with filtering + search
GET /api/products/<slug>/           detail
GET /api/categories/                category list
"""

from __future__ import annotations

import contextlib

from django.db.models import Exists, OuterRef, Prefetch, Q
from rest_framework import generics

from .models import Category, Product, ProductColor, Variant
from .serializers import (
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


def _hydrated_products():
    """Eager-loads colors and variants for product list/detail."""
    return Product.objects.select_related("category").prefetch_related(
        Prefetch(
            "productcolor_set",
            queryset=ProductColor.objects.select_related("color").order_by("sort_order"),
        ),
        Prefetch("variants", queryset=Variant.objects.select_related("color")),
    )


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = _hydrated_products()
        params = self.request.query_params

        if (cat := params.get("category")) and cat != "all":
            qs = qs.filter(category__slug=cat)

        if max_price := params.get("max_price"):
            with contextlib.suppress(TypeError, ValueError):
                qs = qs.filter(price_cents__lte=int(max_price))

        if color := params.get("color"):
            qs = qs.filter(colors__name__iexact=color).distinct()

        if availability := params.get("availability"):
            if availability == "in_stock":
                in_stock = Variant.objects.filter(product=OuterRef("pk"), stock__gt=0)
                qs = qs.annotate(_has_stock=Exists(in_stock)).filter(_has_stock=True)
            elif availability == "new":
                qs = qs.filter(tag="new")
            elif availability == "sale":
                qs = qs.filter(tag="sale")

        if search := params.get("search"):
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(category__name__icontains=search)
                | Q(description__icontains=search)
            )

        sort = params.get("sort", "featured")
        if sort == "low":
            qs = qs.order_by("price_cents")
        elif sort == "high":
            qs = qs.order_by("-price_cents")
        elif sort == "new":
            qs = qs.order_by("-created_at")
        # featured / default: keep model ordering (sku ASC)

        return qs


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return _hydrated_products()


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
