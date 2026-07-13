"""
JWT-аутентификация для WebSocket-соединений.

В HTTP токен ходит в заголовке Authorization, но браузерный WebSocket
не даёт задавать заголовки. Поэтому access-токен передаём в query-строке:
    ws://host/ws/boards/<id>/?token=<access>
Мидлвар валидирует токен и кладёт пользователя в scope["user"].
"""

from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser, AnonymousUser


@database_sync_to_async
def get_user(validated_token: str) -> AbstractBaseUser | AnonymousUser:
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.tokens import AccessToken

    User = get_user_model()
    try:
        # simplejwt типизирует аргумент как Token|None, но принимает и строку токена.
        token = AccessToken(validated_token)  # type: ignore[arg-type]
        return User.objects.get(id=token["user_id"])
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> Any:
        query = parse_qs(scope.get("query_string", b"").decode())
        token = query.get("token", [None])[0]
        scope["user"] = await get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
