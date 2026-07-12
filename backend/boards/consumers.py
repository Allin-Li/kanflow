"""
WebSocket-consumer доски.

Клиент подключается к ws/boards/<id>/?token=<jwt>. Consumer проверяет,
что пользователь — участник доски, и подписывает соединение на группу
board_<id>. Дальше он только ретранслирует события, которые REST-вьюхи
шлют через broadcast(). Писать данные через сокет клиент не может —
источник истины остаётся за REST.
"""
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .broadcast import group_name


class BoardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]

        if not self.user.is_authenticated or not await self._can_access():
            await self.close(code=4403)
            return

        self.group = group_name(self.board_id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Клиент не пишет состояние через сокет; поддерживаем только ping.
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def board_event(self, message):
        """Прокидываем broadcast-событие клиенту как есть."""
        await self.send_json(
            {
                "event": message["event"],
                "data": message["data"],
                "origin": message.get("origin"),
            }
        )

    @database_sync_to_async
    def _can_access(self):
        from .permissions import can_access_board
        from .models import Board

        try:
            board = Board.objects.get(pk=self.board_id)
        except Board.DoesNotExist:
            return False
        return can_access_board(self.user, board)
