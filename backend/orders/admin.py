from django.contrib import admin

from .models import Order, OrderLine


class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    readonly_fields = (
        "variant",
        "qty",
        "name",
        "sku",
        "color_name",
        "size",
        "price_cents",
        "line_total_cents",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "display_number",
        "status",
        "customer_email",
        "total_cents",
        "stripe_status",
        "created_at",
    )
    list_filter = ("status", "ship_method")
    search_fields = ("customer_email", "stripe_payment_intent_id")
    readonly_fields = (
        "stripe_payment_intent_id",
        "stripe_status",
        "created_at",
        "updated_at",
        "paid_at",
        "subtotal_cents",
        "discount_cents",
        "shipping_cents",
        "tax_cents",
        "total_cents",
    )
    inlines = (OrderLineInline,)
