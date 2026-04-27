"""Checkout API.

POST /api/checkout/payment-intent/ — Create Order (pending) + Stripe PI.
POST /api/checkout/confirm/        — Verify PI status + finalize order.
POST /api/webhooks/stripe/         — Stripe webhook (idempotent).
"""

from __future__ import annotations

import logging

import stripe
from django.db import transaction
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from cart.views import CART_COOKIE
from promotions.models import Coupon

from .models import Order, OrderLine
from .serializers import OrderSerializer, ShippingInputSerializer
from .stripe_helpers import (
    StripeNotConfiguredError,
    construct_webhook_event,
    create_payment_intent,
    retrieve_payment_intent,
)

log = logging.getLogger(__name__)

FREE_SHIPPING_THRESHOLD_CENTS = 200_00
TAX_RATE = 0.085


def _shipping_cents(subtotal_after_discount: int, method: str) -> int:
    if subtotal_after_discount <= 0:
        return 0
    if method == "standard":
        return 0
    if method == "express":
        return 0 if subtotal_after_discount > FREE_SHIPPING_THRESHOLD_CENTS else 14_00
    if method == "overnight":
        return 28_00
    return 0


def _resolve_cart(request: Request) -> Cart | None:
    sid = request.COOKIES.get(CART_COOKIE)
    if not sid:
        return None
    return (
        Cart.objects.prefetch_related("lines__variant__product", "lines__variant__color")
        .filter(session_id=sid)
        .first()
    )


class PaymentIntentView(APIView):
    """POST /api/checkout/payment-intent/ — body = ShippingInputSerializer."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        cart = _resolve_cart(request)
        if not cart or not cart.lines.exists():
            return Response({"detail": "cart is empty"}, status=400)

        ser = ShippingInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        subtotal = sum(line.variant.product.price_cents * line.qty for line in cart.lines.all())
        coupon = None
        discount = 0
        code = (d.get("coupon_code") or "").strip().upper()
        if code:
            coupon = Coupon.objects.filter(code__iexact=code).first()
            if coupon and coupon.is_redeemable:
                discount = coupon.discount_for(subtotal)
            else:
                coupon = None  # silently ignore invalid codes; UI already validated
        net = max(0, subtotal - discount)
        shipping = _shipping_cents(net, d["ship_method"])
        tax = round(net * TAX_RATE)
        total = net + shipping + tax

        with transaction.atomic():
            order = Order.objects.create(
                customer_email=d["email"],
                customer_phone=d.get("phone", ""),
                ship_first_name=d["first_name"],
                ship_last_name=d["last_name"],
                ship_address=d["address"],
                ship_apt=d.get("apt", ""),
                ship_city=d["city"],
                ship_state=d["state"],
                ship_zip=d["zip"],
                ship_country=d.get("country", "United States"),
                ship_method=d["ship_method"],
                coupon=coupon,
                coupon_code_at_purchase=coupon.code if coupon else "",
                subtotal_cents=subtotal,
                discount_cents=discount,
                shipping_cents=shipping,
                tax_cents=tax,
                total_cents=total,
            )
            for line in cart.lines.all():
                v = line.variant
                p = v.product
                OrderLine.objects.create(
                    order=order,
                    variant=v,
                    qty=line.qty,
                    name=p.name,
                    sku=p.sku,
                    color_name=v.color.name,
                    size=v.size,
                    price_cents=p.price_cents,
                    line_total_cents=p.price_cents * line.qty,
                )

        try:
            pi = create_payment_intent(
                amount_cents=total,
                metadata={"order_id": str(order.pk), "display_number": order.display_number},
            )
        except StripeNotConfiguredError as exc:
            return Response({"detail": str(exc)}, status=503)

        order.stripe_payment_intent_id = pi["id"]
        order.stripe_status = pi["status"]
        order.save(update_fields=["stripe_payment_intent_id", "stripe_status", "updated_at"])

        return Response(
            {
                "client_secret": pi["client_secret"],
                "payment_intent_id": pi["id"],
                "order_id": order.pk,
                "display_number": order.display_number,
                "amount_cents": total,
            }
        )


class ConfirmOrderView(APIView):
    """POST /api/checkout/confirm/ — verify PI status, finalize order, clear cart."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        pi_id = request.data.get("payment_intent_id")
        if not pi_id:
            return Response({"detail": "payment_intent_id required"}, status=400)

        order = Order.objects.filter(stripe_payment_intent_id=pi_id).first()
        if not order:
            return Response({"detail": "order not found"}, status=404)

        # Idempotent: already paid → return as-is.
        if order.status == "paid":
            return Response(OrderSerializer(order).data)

        try:
            pi = retrieve_payment_intent(pi_id)
        except StripeNotConfiguredError as exc:
            return Response({"detail": str(exc)}, status=503)

        order.stripe_status = pi["status"]
        if pi["status"] == "succeeded":
            with transaction.atomic():
                order.status = "paid"
                order.paid_at = timezone.now()
                order.save(update_fields=["status", "stripe_status", "paid_at", "updated_at"])
                if order.coupon_id:
                    Coupon.objects.filter(pk=order.coupon_id).update(
                        redemptions_used=order.coupon.redemptions_used + 1
                    )
                # Clear the cart that produced the order.
                cart = _resolve_cart(request)
                if cart:
                    cart.lines.all().delete()
        else:
            order.save(update_fields=["stripe_status", "updated_at"])

        return Response(OrderSerializer(order).data)


@csrf_exempt
@require_POST
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    """POST /api/webhooks/stripe/ — verifies signature, marks order paid on PI succeeded."""
    sig = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = construct_webhook_event(request.body, sig)
    except StripeNotConfiguredError as exc:
        return HttpResponse(str(exc), status=503)
    except (stripe.SignatureVerificationError, ValueError) as exc:
        log.warning("stripe webhook bad signature: %s", exc)
        return HttpResponse(status=400)

    if event["type"] == "payment_intent.succeeded":
        pi_id = event["data"]["object"]["id"]
        order = Order.objects.filter(stripe_payment_intent_id=pi_id).first()
        if order and order.status != "paid":
            order.status = "paid"
            order.stripe_status = "succeeded"
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "stripe_status", "paid_at", "updated_at"])
    elif event["type"] == "payment_intent.payment_failed":
        pi_id = event["data"]["object"]["id"]
        Order.objects.filter(stripe_payment_intent_id=pi_id).update(stripe_status="failed")

    return HttpResponse(status=200)
