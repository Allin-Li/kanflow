"""
JWT-аутентификация для WebSocket-соединений.

В HTTP токен ходит в заголовке Authorization, но браузерный WebSocket
не даёт задавать заголовки. Поэтому access-токен передаём в query-строке:
    ws://host/ws/boards/<id>/?token=<access>
Мидлвар валидирует токен и кладёт пользователя в scope["user"].
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user(validated_token):
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.tokens import AccessToken

    User = get_user_model()
    try:
        token = AccessToken(validated_token)
        return User.objects.get(id=token["user_id"])
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = query.get("token", [None])[0]
        scope["user"] = await get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
