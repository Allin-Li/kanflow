from __future__ import annotations

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Кастомная модель пользователя.

    Сейчас — обычный AbstractUser без изменений. Заведена заранее (это
    рекомендованная практика Django), чтобы позже можно было добавить
    поля профиля/аватар/настройки без болезненной миграции.
    """

    def __str__(self) -> str:
        return self.get_username()
