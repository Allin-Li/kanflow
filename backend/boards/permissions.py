from rest_framework import permissions

from .models import Board


def user_boards(user):
    """Доски, к которым у пользователя есть доступ (владелец или участник)."""
    return Board.objects.filter(memberships__user=user).distinct()


def can_access_board(user, board):
    return board.memberships.filter(user=user).exists()


class IsBoardMember(permissions.BasePermission):
    """
    Доступ к объекту (Board/Column/Card) только участникам его доски.
    Работает на уровне объекта — вьюхи вызывают check_object_permissions.
    """

    def has_object_permission(self, request, view, obj):
        board = obj if isinstance(obj, Board) else view.get_board_of(obj)
        return can_access_board(request.user, board)
