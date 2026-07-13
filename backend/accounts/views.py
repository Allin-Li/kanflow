from __future__ import annotations

from rest_framework import generics, permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """Регистрация нового пользователя. Доступна без авторизации."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """Текущий пользователь по access-токену."""

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)
