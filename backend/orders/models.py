"""Order + OrderLine. Address fields are inline on Order for v1 — extracted to
a separate Address model when accounts ship in task #11.
"""

from __future__ import annotations

from django.db import models

from catalog.models import Variant
from promotions.models import Coupon


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending payment"),
        ("paid", "Paid"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]
    SHIP_METHOD_CHOICES = [
        ("standard", "Standard"),
        ("express", "Express"),
        ("overnight", "Overnight"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=40, blank=True, default="")

    ship_first_name = models.CharField(max_length=80)
    ship_last_name = models.CharField(max_length=80)
    ship_address = models.CharField(max_length=200)
    ship_apt = models.CharField(max_length=40, blank=True, default="")
    ship_city = models.CharField(max_length=80)
    ship_state = models.CharField(max_length=80)
    ship_zip = models.CharField(max_length=20)
    ship_country = models.CharField(max_length=80, default="United States")
    ship_method = models.CharField(max_length=20, choices=SHIP_METHOD_CHOICES, default="express")

    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    coupon_code_at_purchase = models.CharField(max_length=40, blank=True, default="")

    subtotal_cents = models.PositiveIntegerField(default=0)
    discount_cents = models.PositiveIntegerField(default=0)
    shipping_cents = models.PositiveIntegerField(default=0)
    tax_cents = models.PositiveIntegerField(default=0)
    total_cents = models.PositiveIntegerField(default=0)

    stripe_payment_intent_id = models.CharField(
        max_length=80, blank=True, default="", db_index=True
    )
    stripe_status = models.CharField(max_length=40, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.display_number

    @property
    def display_number(self) -> str:
        return f"LG-{self.pk:05d}" if self.pk else "LG-?????"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT, related_name="+")
    qty = models.PositiveIntegerField()

    # Snapshot fields — preserve display + amounts even if the catalog changes.
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=20)
    color_name = models.CharField(max_length=50)
    size = models.CharField(max_length=20)
    price_cents = models.PositiveIntegerField()
    line_total_cents = models.PositiveIntegerField()

    class Meta:
        ordering = ["pk"]

    def __str__(self) -> str:
        return f"{self.order} · {self.name} ×{self.qty}"
