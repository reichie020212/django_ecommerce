"""Coupon — only one redemption shape for v1: percent-off (e.g. LUMEN10 = 10%)."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models


class Coupon(models.Model):
    code = models.CharField(max_length=40, unique=True)
    percent_off = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="0–100. Mutually exclusive with amount_off_cents."
    )
    amount_off_cents = models.PositiveIntegerField(null=True, blank=True)
    active = models.BooleanField(default=True)
    max_redemptions = models.PositiveIntegerField(
        null=True, blank=True, help_text="Total cap across all carts. Null = unlimited."
    )
    redemptions_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return self.code

    def clean(self) -> None:
        if (self.percent_off is None) == (self.amount_off_cents is None):
            raise ValidationError("Set exactly one of percent_off or amount_off_cents.")
        if self.percent_off is not None and not (1 <= self.percent_off <= 100):
            raise ValidationError("percent_off must be between 1 and 100.")

    @property
    def is_redeemable(self) -> bool:
        if not self.active:
            return False
        return not (
            self.max_redemptions is not None and self.redemptions_used >= self.max_redemptions
        )

    def discount_for(self, subtotal_cents: int) -> int:
        if not self.is_redeemable or subtotal_cents <= 0:
            return 0
        if self.percent_off is not None:
            return round(subtotal_cents * self.percent_off / 100)
        return min(self.amount_off_cents or 0, subtotal_cents)
