"""Promotions API.

POST /api/coupons/redeem/ — body {code}. Returns {valid, code, percent_off,
amount_off_cents} when the coupon is redeemable; {valid: false} otherwise.
The cart-line cap on redemptions_used is enforced again at PaymentIntent
creation, so this endpoint is purely informational.
"""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Coupon


class CouponRedeemView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"valid": False, "detail": "code required"}, status=400)

        coupon = Coupon.objects.filter(code__iexact=code).first()
        if not coupon or not coupon.is_redeemable:
            return Response({"valid": False, "detail": "invalid or expired"}, status=200)

        return Response(
            {
                "valid": True,
                "code": coupon.code,
                "percent_off": coupon.percent_off,
                "amount_off_cents": coupon.amount_off_cents,
            }
        )
