"""
Помощник для рассылки изменений по WebSocket всем клиентам доски.

REST-вьюха после успешной записи в БД зовёт broadcast(...), а Channels
доставляет событие в группу board_<id>. Поле `origin` — id вкладки-инициатора:
клиент по нему игнорирует собственное эхо и не дублирует optimistic-апдейт.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def group_name(board_id) -> str:
    return f"board_{board_id}"


def broadcast(board_id, event: str, data: dict, origin: str | None = None):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        group_name(board_id),
        {
            "type": "board.event",  # -> BoardConsumer.board_event
            "event": event,
            "data": data,
            "origin": origin,
        },
    )
