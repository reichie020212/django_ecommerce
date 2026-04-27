"""Accounts API.

POST /api/auth/register/   — create user
POST /api/auth/login/      — JWT obtain pair (handled by simplejwt)
POST /api/auth/refresh/    — JWT refresh (handled by simplejwt)
GET  /api/auth/me/         — current user
GET  /api/addresses/       — list user's addresses
POST /api/addresses/       — create
PATCH/DELETE /api/addresses/<id>/  — modify/remove
"""

from __future__ import annotations

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address
from .serializers import AddressSerializer, RegisterSerializer, UserSerializer


class AuthRateThrottle(AnonRateThrottle):
    """Tighter throttle on auth endpoints — 20/min/IP for anon."""

    rate = "20/min"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        # Issue tokens immediately so the new account doesn't need a second round-trip.
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If marked default, demote any existing default for this user.
        if serializer.validated_data.get("is_default"):
            Address.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get("is_default"):
            Address.objects.filter(user=self.request.user, is_default=True).exclude(
                pk=self.kwargs["pk"]
            ).update(is_default=False)
        serializer.save()
