from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings
from django.db import models

if TYPE_CHECKING:
    from accounts.models import User


class Board(models.Model):
    """Канбан-доска. Владелец + участники (через membership)."""

    title = models.CharField(max_length=200)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_boards",
    )
    members: models.ManyToManyField[User, BoardMembership] = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="BoardMembership",
        related_name="boards",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class BoardMembership(models.Model):
    """Связь пользователь↔доска с ролью (задел на разграничение прав)."""

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.EDITOR)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("board", "user")

    def __str__(self) -> str:
        return f"{self.user} @ {self.board} ({self.role})"


class Column(models.Model):
    """Колонка (список) внутри доски. Порядок — дробный `position`."""

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="columns")
    title = models.CharField(max_length=200)
    position = models.FloatField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return f"{self.title} ({self.board_id})"


class Card(models.Model):
    """
    Карточка внутри колонки.

    `meta` — JSONField, в PostgreSQL это нативный JSONB: сюда складываем
    гибкие метаданные (лейблы, дедлайн, чек-лист, кастомные поля) без
    новых миграций. Структурные связи остаются реляционными.
    """

    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name="cards")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    position = models.FloatField(db_index=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.title
