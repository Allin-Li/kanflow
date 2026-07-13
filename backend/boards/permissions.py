from __future__ import annotations

from typing import TYPE_CHECKING

from rest_framework import permissions

from .models import Board

if TYPE_CHECKING:
    from django.db.models import QuerySet
    from rest_framework.request import Request
    from rest_framework.views import APIView

    from accounts.models import User


def user_boards(user: User) -> QuerySet[Board]:
    """Доски, к которым у пользователя есть доступ (владелец или участник)."""
    return Board.objects.filter(memberships__user=user).distinct()


def can_access_board(user: User, board: Board) -> bool:
    return board.memberships.filter(user=user).exists()


class IsBoardMember(permissions.BasePermission):
    """
    Доступ к объекту (Board/Column/Card) только участникам его доски.
    Работает на уровне объекта — вьюхи вызывают check_object_permissions.
    """

    def has_object_permission(self, request: Request, view: APIView, obj: object) -> bool:
        board = obj if isinstance(obj, Board) else view.get_board_of(obj)
        return can_access_board(request.user, board)
