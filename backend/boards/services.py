"""
Бизнес-логика порядка элементов: добавление в конец, перемещение
между соседями и ребаланс колонки. Вьюхи держим тонкими.
"""

from django.db import transaction

from .models import Card, Column
from .positioning import STEP, needs_rebalance, position_between


def _last_position(queryset):
    last = queryset.order_by("-position").first()
    return last.position if last else None


def append_position(queryset) -> float:
    """Позиция для нового элемента в конце списка."""
    last = _last_position(queryset)
    return STEP if last is None else last + STEP


def _resolve_neighbors(siblings, after_id):
    """
    Из упорядоченного списка соседей и id элемента-предшественника
    возвращает (prev, next). after_id=None => вставка в начало.
    Неизвестный after_id => вставка в конец.
    """
    if after_id is None:
        return None, (siblings[0] if siblings else None)
    for i, obj in enumerate(siblings):
        if obj.pk == int(after_id):
            nxt = siblings[i + 1] if i + 1 < len(siblings) else None
            return obj, nxt
    # after не найден среди соседей — кладём в конец
    return (siblings[-1] if siblings else None), None


@transaction.atomic
def rebalance_cards(column: Column):
    """Раскидать позиции карточек колонки заново с равным шагом STEP."""
    cards = list(column.cards.order_by("position", "id").select_for_update())
    for i, card in enumerate(cards, start=1):
        card.position = i * STEP
    Card.objects.bulk_update(cards, ["position"])


@transaction.atomic
def rebalance_columns(board):
    columns = list(board.columns.order_by("position", "id").select_for_update())
    for i, col in enumerate(columns, start=1):
        col.position = i * STEP
    Column.objects.bulk_update(columns, ["position"])


@transaction.atomic
def move_card(card: Card, target_column: Column, after_id):
    """Переместить карточку в target_column, поставив её после after_id."""
    siblings = list(target_column.cards.exclude(pk=card.pk).order_by("position", "id"))
    prev, nxt = _resolve_neighbors(siblings, after_id)
    prev_pos = prev.position if prev else None
    next_pos = nxt.position if nxt else None

    card.column = target_column
    card.position = position_between(prev_pos, next_pos)
    card.save(update_fields=["column", "position", "updated_at"])

    if needs_rebalance(prev_pos, next_pos):
        rebalance_cards(target_column)
        card.refresh_from_db(fields=["position"])
    return card


@transaction.atomic
def move_column(column: Column, after_id):
    siblings = list(column.board.columns.exclude(pk=column.pk).order_by("position", "id"))
    prev, nxt = _resolve_neighbors(siblings, after_id)
    prev_pos = prev.position if prev else None
    next_pos = nxt.position if nxt else None

    column.position = position_between(prev_pos, next_pos)
    column.save(update_fields=["position"])

    if needs_rebalance(prev_pos, next_pos):
        rebalance_columns(column.board)
        column.refresh_from_db(fields=["position"])
    return column
