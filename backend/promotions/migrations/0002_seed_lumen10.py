"""Seed the LUMEN10 coupon (10% off) referenced from prototype/checkout.jsx."""
from __future__ import annotations

from django.db import migrations


def seed_lumen10(apps, _schema_editor):
    Coupon = apps.get_model("promotions", "Coupon")
    Coupon.objects.update_or_create(
        code="LUMEN10",
        defaults={
            "percent_off": 10,
            "amount_off_cents": None,
            "active": True,
        },
    )


def remove_lumen10(apps, _schema_editor):
    Coupon = apps.get_model("promotions", "Coupon")
    Coupon.objects.filter(code="LUMEN10").delete()


class Migration(migrations.Migration):
    dependencies = [("promotions", "0001_initial")]
    operations = [migrations.RunPython(seed_lumen10, remove_lumen10)]
