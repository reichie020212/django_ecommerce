"""Custom User (email-as-username) + saved Address book.

Per handoff §6 the User model "extends AbstractUser" with a Stripe customer
linkage. Email is the login identifier (no username) — common e-commerce
pattern. Stripe Customer is created lazily on first authenticated checkout
(stored on `stripe_customer_id`).
"""

from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import EmailUserManager


class User(AbstractUser):
    # Drop the username field; email is the login identifier.
    username = None  # type: ignore[assignment]
    email = models.EmailField(unique=True)

    first_name = models.CharField(max_length=80, blank=True, default="")
    last_name = models.CharField(max_length=80, blank=True, default="")

    stripe_customer_id = models.CharField(
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        help_text="Created lazily on first authenticated checkout.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = EmailUserManager()

    class Meta:
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=40, blank=True, default="", help_text="e.g. Home, Office")

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    line1 = models.CharField(max_length=200)
    line2 = models.CharField(max_length=80, blank=True, default="")
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=80, default="United States")
    phone = models.CharField(max_length=40, blank=True, default="")

    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} · {self.city}, {self.state}"
