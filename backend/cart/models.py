"""Cart + CartLine.

Guest carts: identified by a `lumen_cart_id` cookie on the browser; rows live in
this table indefinitely, keyed by `session_id`. Authed carts will inherit a
`user` FK once accounts ship in task #11; for v1 only the guest path exists.
"""

from __future__ import annotations

import uuid

from django.db import models

from catalog.models import Variant


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(
        max_length=64,
        unique=True,
        help_text="Opaque value stored in the lumen_cart_id cookie. Equals str(id) for guests.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"Cart {self.session_id[:8]}"


class CartLine(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT, related_name="+")
    qty = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("cart", "variant")]
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.cart} · {self.variant} ×{self.qty}"
