"""Cart API.

Endpoints
---------
GET    /api/cart/                — return-or-create the caller's cart (sets cookie)
POST   /api/cart/lines/          — add a line by {product_slug, color, size, qty}
PATCH  /api/cart/lines/<id>/     — update qty (qty=0 deletes the line)
DELETE /api/cart/lines/<id>/     — remove the line

Identity is the `lumen_cart_id` cookie; first POST/GET creates it.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.db.models import Prefetch
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Variant

from .models import Cart, CartLine
from .serializers import CartSerializer

CART_COOKIE = "lumen_cart_id"
CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # 1 year


def _hydrated_cart(cart: Cart) -> Cart:
    """Re-fetch with prefetches so serializer access is one query, not N+1."""
    return (
        Cart.objects.filter(pk=cart.pk)
        .prefetch_related(
            Prefetch(
                "lines",
                queryset=CartLine.objects.select_related(
                    "variant__product", "variant__color"
                ).order_by("created_at"),
            )
        )
        .first()
    ) or cart


def _get_or_create_cart(request: Request) -> tuple[Cart, bool]:
    sid = request.COOKIES.get(CART_COOKIE)
    if sid:
        existing = Cart.objects.filter(session_id=sid).first()
        if existing:
            return _hydrated_cart(existing), False
    new_id = uuid.uuid4()
    cart = Cart.objects.create(id=new_id, session_id=str(new_id))
    return _hydrated_cart(cart), True


def _attach_cookie(response: Response, cart: Cart, *, created: bool) -> Response:
    if not created:
        return response
    response.set_cookie(
        CART_COOKIE,
        cart.session_id,
        max_age=CART_COOKIE_MAX_AGE,
        httponly=False,  # allow client-side reads if we ever need them
        samesite="Lax",
        secure=False,  # dev only; the prod settings flip this on
    )
    return response


class CartView(APIView):
    """GET /api/cart/ — the caller's cart (creates if missing)."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        cart, created = _get_or_create_cart(request)
        return _attach_cookie(Response(CartSerializer(cart).data), cart, created=created)


class CartLineCreateView(APIView):
    """POST /api/cart/lines/ — body {product_slug, color, size, qty}.

    Resolves to a Variant. Existing line for the same variant: bump qty.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        cart, created = _get_or_create_cart(request)
        data: dict[str, Any] = request.data
        try:
            slug = data["product_slug"]
            color = data["color"]
            size = data["size"]
            qty = max(1, int(data.get("qty", 1)))
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "expected product_slug, color, size, qty"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant = (
            Variant.objects.select_related("product", "color")
            .filter(product__slug=slug, color__name=color, size=size)
            .first()
        )
        if not variant:
            return Response(
                {"detail": "variant not found for the given product/color/size"},
                status=status.HTTP_404_NOT_FOUND,
            )

        line, made = CartLine.objects.get_or_create(
            cart=cart, variant=variant, defaults={"qty": qty}
        )
        if not made:
            line.qty += qty
            line.save(update_fields=["qty", "updated_at"])

        cart = _hydrated_cart(cart)
        return _attach_cookie(
            Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED),
            cart,
            created=created,
        )


class CartLineDetailView(APIView):
    """PATCH /api/cart/lines/<id>/ {qty}; DELETE /api/cart/lines/<id>/."""

    permission_classes = [AllowAny]

    def _get_line(self, request: Request, line_id: int) -> tuple[Cart, CartLine]:
        cart, _ = _get_or_create_cart(request)
        line = CartLine.objects.filter(cart=cart, pk=line_id).first()
        if not line:
            raise NotFound("line not found in this cart")
        return cart, line

    def patch(self, request: Request, line_id: int) -> Response:
        cart, line = self._get_line(request, line_id)
        try:
            qty = int(request.data.get("qty", 1))
        except (TypeError, ValueError):
            return Response({"detail": "qty must be an int"}, status=400)

        if qty <= 0:
            line.delete()
        else:
            line.qty = qty
            line.save(update_fields=["qty", "updated_at"])
        cart = _hydrated_cart(cart)
        return Response(CartSerializer(cart).data)

    def delete(self, request: Request, line_id: int) -> Response:
        cart, line = self._get_line(request, line_id)
        line.delete()
        cart = _hydrated_cart(cart)
        return Response(CartSerializer(cart).data)
