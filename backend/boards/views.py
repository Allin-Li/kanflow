from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .broadcast import broadcast
from .models import Board, BoardMembership, Card, Column
from .permissions import IsBoardMember, can_access_board, user_boards
from .serializers import (
    BoardDetailSerializer,
    BoardListSerializer,
    CardSerializer,
    ColumnSerializer,
)
from .services import append_position, move_card, move_column

DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"]


class BoardViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsBoardMember]

    def get_queryset(self):
        return (
            user_boards(self.request.user)
            .prefetch_related("columns__cards", "memberships__user")
        )

    def get_serializer_class(self):
        if self.action in ("list", "create"):
            return BoardListSerializer
        return BoardDetailSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        board = serializer.save(owner=self.request.user)
        BoardMembership.objects.create(
            board=board, user=self.request.user, role=BoardMembership.Role.OWNER
        )
        # Стартовые колонки — приятный UX для новой доски.
        for i, title in enumerate(DEFAULT_COLUMNS, start=1):
            Column.objects.create(board=board, title=title, position=i * 65536.0)

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.id:
            raise PermissionDenied("Удалить доску может только владелец.")
        board_id = instance.id
        instance.delete()
        broadcast(board_id, "board.deleted", {"id": board_id})

    def perform_update(self, serializer):
        board = serializer.save()
        broadcast(board.id, "board.updated", BoardListSerializer(board).data)


class BoardScopedViewSet(viewsets.ModelViewSet):
    """
    База для Column/Card: доступ к объекту проверяется по доске,
    а после мутации — broadcast всем клиентам этой доски.
    `origin` (id вкладки-инициатора) прокидывается, чтобы клиент
    не применял собственное эхо второй раз.
    """

    permission_classes = [permissions.IsAuthenticated, IsBoardMember]

    def board_of(self, obj):  # переопределяется в наследниках
        raise NotImplementedError

    # алиас под интерфейс permission-класса
    def get_board_of(self, obj):
        return self.board_of(obj)

    def _origin(self):
        return self.request.data.get("origin") or self.request.headers.get("X-Client-Id")

    def _check_board(self, board):
        if not can_access_board(self.request.user, board):
            raise PermissionDenied("Нет доступа к этой доске.")


class ColumnViewSet(BoardScopedViewSet):
    serializer_class = ColumnSerializer

    def get_queryset(self):
        return Column.objects.filter(
            board__in=user_boards(self.request.user)
        ).select_related("board")

    def board_of(self, obj):
        return obj.board

    def perform_create(self, serializer):
        board = get_object_or_404(Board, pk=self.request.data.get("board"))
        self._check_board(board)
        column = serializer.save(
            board=board, position=append_position(board.columns.all())
        )
        broadcast(board.id, "column.created", ColumnSerializer(column).data, self._origin())

    def perform_update(self, serializer):
        column = serializer.save()
        broadcast(
            column.board_id, "column.updated", ColumnSerializer(column).data, self._origin()
        )

    def perform_destroy(self, instance):
        board_id = instance.board_id
        col_id = instance.id
        instance.delete()
        broadcast(board_id, "column.deleted", {"id": col_id}, self._origin())

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        column = self.get_object()
        after_id = request.data.get("after")
        move_column(column, after_id)
        data = ColumnSerializer(column).data
        broadcast(column.board_id, "column.moved", data, self._origin())
        return Response(data)


class CardViewSet(BoardScopedViewSet):
    serializer_class = CardSerializer

    def get_queryset(self):
        return Card.objects.filter(
            column__board__in=user_boards(self.request.user)
        ).select_related("column__board")

    def board_of(self, obj):
        return obj.column.board

    def perform_create(self, serializer):
        column = get_object_or_404(Column, pk=self.request.data.get("column"))
        self._check_board(column.board)
        card = serializer.save(
            column=column, position=append_position(column.cards.all())
        )
        broadcast(column.board_id, "card.created", CardSerializer(card).data, self._origin())

    def perform_update(self, serializer):
        card = serializer.save()
        broadcast(
            card.column.board_id, "card.updated", CardSerializer(card).data, self._origin()
        )

    def perform_destroy(self, instance):
        board_id = instance.column.board_id
        card_id = instance.id
        instance.delete()
        broadcast(board_id, "card.deleted", {"id": card_id}, self._origin())

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        card = self.get_object()
        target_column_id = request.data.get("column", card.column_id)
        target_column = get_object_or_404(Column, pk=target_column_id)
        if target_column.board_id != card.column.board_id:
            raise ValidationError("Перемещение между разными досками не поддерживается.")
        self._check_board(target_column.board)

        after_id = request.data.get("after")
        move_card(card, target_column, after_id)
        data = CardSerializer(card).data
        broadcast(card.column.board_id, "card.moved", data, self._origin())
        return Response(data)
