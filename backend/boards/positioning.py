"""
Дробное позиционирование (fractional indexing).

Порядок элементов хранится не индексом 0..N (который пришлось бы
переписывать у всех соседей при каждом перемещении), а вещественным
`position`. Чтобы вставить элемент между двумя соседями, берём середину
их позиций — это O(1) и меняет ровно одну строку в БД.

Плата — конечная точность float: после многих вставок в одну и ту же
точку зазор между соседями исчерпывается. На этот случай есть
`rebalance()` — редкая операция, раскидывающая позиции заново с шагом STEP.
"""

from __future__ import annotations

STEP: float = 65536.0  # шаг между соседями при добавлении в конец
MIN_GAP: float = 1e-6  # если зазор меньше — пора ребалансить колонку


def position_between(prev_pos: float | None, next_pos: float | None) -> float:
    """Позиция для элемента, вставляемого между prev и next (любой может быть None)."""
    if prev_pos is None:
        return STEP if next_pos is None else next_pos / 2.0
    if next_pos is None:
        return prev_pos + STEP
    return (prev_pos + next_pos) / 2.0


def needs_rebalance(prev_pos: float | None, next_pos: float | None) -> bool:
    return prev_pos is not None and next_pos is not None and (next_pos - prev_pos) < MIN_GAP
