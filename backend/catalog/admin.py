"""Admin registrations for catalog."""

from django.contrib import admin

from .models import Category, Color, Image, Product, ProductColor, Variant


class ProductColorInline(admin.TabularInline):
    model = ProductColor
    extra = 0


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 0


class ImageInline(admin.TabularInline):
    model = Image
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("sort_order", "name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order",)


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ("sort_order", "name", "hex", "tone")
    ordering = ("sort_order",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "price_cents", "tag", "rating", "reviews_count")
    list_filter = ("category", "tag")
    search_fields = ("sku", "name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = (ProductColorInline, VariantInline, ImageInline)


@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ("product", "color", "size", "stock")
    list_filter = ("color",)
    search_fields = ("product__sku", "product__name", "size")
