from django.contrib import admin

from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "percent_off",
        "amount_off_cents",
        "active",
        "redemptions_used",
        "max_redemptions",
    )
    list_filter = ("active",)
    search_fields = ("code",)
