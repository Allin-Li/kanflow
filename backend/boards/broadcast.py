"""
Помощник для рассылки изменений по WebSocket всем клиентам доски.

REST-вьюха после успешной записи в БД зовёт broadcast(...), а Channels
доставляет событие в группу board_<id>. Поле `origin` — id вкладки-инициатора:
клиент по нему игнорирует собственное эхо и не дублирует optimistic-апдейт.
"""

from __future__ import annotations

from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def group_name(board_id: int | str) -> str:
    return f"board_{board_id}"


def broadcast(
    board_id: int | str,
    event: str,
    data: dict[str, Any],
    origin: str | None = None,
) -> None:
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
