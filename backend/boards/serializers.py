from __future__ import annotations

from typing import Any

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Board, BoardMembership, Card, Column


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = (
            "id",
            "column",
            "title",
            "description",
            "position",
            "meta",
            "created_at",
            "updated_at",
        )
        # position и column меняются только через move-эндпоинт
        read_only_fields = ("position", "column", "created_at", "updated_at")

    def validate_meta(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("meta должен быть объектом (dict).")
        return value


class ColumnSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = Column
        fields = ("id", "board", "title", "position", "cards", "created_at")
        read_only_fields = ("position", "board", "created_at")


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = BoardMembership
        fields = ("id", "user", "role", "created_at")


class BoardListSerializer(serializers.ModelSerializer):
    """Лёгкий вид для списка досок — без вложенных колонок/карточек."""

    class Meta:
        model = Board
        fields = ("id", "title", "owner", "created_at", "updated_at")
        read_only_fields = ("owner", "created_at", "updated_at")


class BoardDetailSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)
    memberships = MembershipSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Board
        fields = ("id", "title", "owner", "memberships", "columns", "created_at", "updated_at")
        read_only_fields = ("owner", "created_at", "updated_at")
