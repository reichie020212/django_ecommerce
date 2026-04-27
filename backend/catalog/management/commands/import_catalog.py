"""Idempotent importer that seeds the catalog from prototype/data.js.

Run with:
    python manage.py import_catalog            # upsert
    python manage.py import_catalog --reset    # wipe catalog tables first
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from catalog.models import (
    Category,
    Color,
    Product,
    ProductColor,
    Variant,
)
from catalog.seed_data import (
    CATEGORIES_ORDER,
    COLOR_SWATCHES,
    DEFAULT_STOCK,
    PRODUCTS,
)


class Command(BaseCommand):
    help = "Seed the catalog from prototype/data.js (idempotent upsert)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing catalog rows before importing.",
        )

    def handle(self, *args, **opts) -> None:
        with transaction.atomic():
            if opts["reset"]:
                self.stdout.write("resetting catalog tables…")
                Variant.objects.all().delete()
                ProductColor.objects.all().delete()
                Product.objects.all().delete()
                Color.objects.all().delete()
                Category.objects.all().delete()

            self._upsert_categories()
            self._upsert_colors()
            self._upsert_products()

        self.stdout.write(
            self.style.SUCCESS(
                f"catalog ready: {Category.objects.count()} categories, "
                f"{Color.objects.count()} colors, "
                f"{Product.objects.count()} products, "
                f"{Variant.objects.count()} variants."
            )
        )

    # ── steps ──────────────────────────────────────────────────────────

    def _upsert_categories(self) -> None:
        for sort_order, name in enumerate(CATEGORIES_ORDER, start=1):
            Category.objects.update_or_create(
                slug=slugify(name),
                defaults={"name": name, "sort_order": sort_order},
            )

    def _upsert_colors(self) -> None:
        # Global swatch palette + any per-product colors not in the swatch list.
        swatch_tone = {c["name"]: c.get("tone", "") for p in PRODUCTS for c in p["colors"]}
        for sort_order, sw in enumerate(COLOR_SWATCHES, start=1):
            Color.objects.update_or_create(
                name=sw["name"],
                defaults={
                    "hex": sw["hex"],
                    "tone": swatch_tone.get(sw["name"], sw["name"].lower()),
                    "sort_order": sort_order,
                },
            )
        # Per-product colors that aren't in COLOR_SWATCHES (e.g. Moss, Graphite).
        seen = {c.name for c in Color.objects.all()}
        extras_added = len(seen)
        for product in PRODUCTS:
            for color in product["colors"]:
                if color["name"] in seen:
                    continue
                extras_added += 1
                Color.objects.update_or_create(
                    name=color["name"],
                    defaults={
                        "hex": color["hex"],
                        "tone": color.get("tone", color["name"].lower()),
                        "sort_order": extras_added,
                    },
                )
                seen.add(color["name"])

    def _upsert_products(self) -> None:
        for entry in PRODUCTS:
            category = Category.objects.get(slug=slugify(entry["category"]))
            product, _ = Product.objects.update_or_create(
                sku=entry["id"],
                defaults={
                    "slug": slugify(entry["name"]),
                    "name": entry["name"],
                    "category": category,
                    "price_cents": int(entry["price"]) * 100,
                    "was_cents": int(entry["was"]) * 100 if entry.get("was") else None,
                    "tag": entry.get("tag", "") or "",
                    "rating": entry.get("rating", 0),
                    "reviews_count": entry.get("reviews", 0),
                    "tone": entry["tone"],
                    "alt_tone": entry.get("altTone", ""),
                    "description": entry.get("desc", ""),
                    "details": entry.get("details", []),
                },
            )

            # Per-product colors (with prototype's swatch order).
            ProductColor.objects.filter(product=product).delete()
            for sort_order, c in enumerate(entry["colors"], start=1):
                color = Color.objects.get(name=c["name"])
                ProductColor.objects.create(
                    product=product,
                    color=color,
                    sort_order=sort_order,
                )

            # Variants — every (color × size) pair.
            sold_out = set(entry.get("soldOut", []))
            Variant.objects.filter(product=product).delete()
            for c_idx, c in enumerate(entry["colors"], start=1):
                color = Color.objects.get(name=c["name"])
                for s_idx, size in enumerate(entry["sizes"], start=1):
                    Variant.objects.create(
                        product=product,
                        color=color,
                        size=size,
                        sort_order=c_idx * 100 + s_idx,
                        stock=0 if size in sold_out else DEFAULT_STOCK,
                    )
