# Kanflow — канбан-доска

Учебный, но приближенный к проду мини-Trello: доски, колонки, карточки,
drag-and-drop, живые обновления через WebSocket.

## Стек

| Слой | Технологии |
|------|-----------|
| Backend | Django 5, Django REST Framework, SimpleJWT, Django Channels (ASGI/Daphne) |
| БД | PostgreSQL (JSONB для метаданных карточек) |
| Realtime | Django Channels, channel layer in-memory (по умолчанию) / Redis (опционально) |
| Frontend | Vue 3, Pinia, vue-router, vuedraggable, axios |
| Инфра | Docker Compose |

## Архитектура коротко

- **Все изменения делаются обычными HTTP-запросами к REST API.** Создание и
  редактирование досок, колонок и карточек, а также перемещение —
  `POST /cards/{id}/move/` и `POST /columns/{id}/move/`. Через WebSocket данные
  не отправляются: он нужен только чтобы получать чужие изменения.
- **WebSocket показывает изменения других участников в реальном времени.**
  Когда кто-то сохранил правку через REST, сервер отправляет уведомление всем,
  кто открыл эту доску, и у них экран обновляется без перезагрузки. Если
  WebSocket отключить, приложение продолжит работать — просто чужие правки будут
  видны только после обновления страницы.
- **Порядок карточек хранится числом `position`, а не индексом 1, 2, 3…**
  Чтобы поставить карточку между двумя соседями, берётся среднее их позиций —
  это меняет одну строку в БД вместо перенумерации всей колонки. Когда числа
  между соседями заканчиваются, позиции в колонке раздаются заново.
  См. [`backend/boards/positioning.py`](backend/boards/positioning.py).
- **Гибкие поля карточки лежат в `Card.meta` (JSONB).** Лейблы, дедлайн,
  чек-лист и любые будущие поля можно добавлять без новых миграций БД.
- **Карточка двигается сразу, не дожидаясь сервера.** vuedraggable переставляет
  её мгновенно, запрос уходит в фоне; если сервер ответил ошибкой — доска
  возвращается в прежнее состояние. Своё же изменение, вернувшееся по WebSocket,
  не применяется повторно (запрос помечается идентификатором вкладки `X-Client-Id`).

## Запуск

```bash
cp .env.example .env          # при желании поправьте значения
docker compose up --build
```

- Frontend: http://localhost:5173
- REST API: http://localhost:8000/api/
- Django admin: http://localhost:8000/admin/

Миграции применяются автоматически при старте backend. Чтобы создать
суперпользователя для админки:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Основные эндпоинты

| Метод | URL | Назначение |
|-------|-----|-----------|
| POST | `/api/auth/register/` | регистрация |
| POST | `/api/auth/login/` | получить access/refresh JWT |
| POST | `/api/auth/refresh/` | обновить access |
| GET | `/api/auth/me/` | текущий пользователь |
| GET/POST | `/api/boards/` | список / создание досок |
| GET/PATCH/DELETE | `/api/boards/{id}/` | доска с колонками и карточками |
| POST | `/api/columns/` | создать колонку (`{board, title}`) |
| POST | `/api/columns/{id}/move/` | переместить колонку (`{after}`) |
| POST | `/api/cards/` | создать карточку (`{column, title}`) |
| PATCH | `/api/cards/{id}/` | изменить (`title/description/meta`) |
| POST | `/api/cards/{id}/move/` | переместить (`{column, after}`) |

WebSocket: `ws://localhost:8000/ws/boards/{id}/?token=<access>`

## Масштабирование realtime на несколько воркеров

По умолчанию channel layer — in-memory (хватает для одного процесса backend).
Когда backend масштабируется горизонтально:

1. Раскомментируйте сервис `redis` в [`docker-compose.yml`](docker-compose.yml).
2. Задайте `REDIS_URL=redis://redis:6379/0` в `.env`.

Код менять не нужно — [`settings.py`](backend/config/settings.py) сам переключит
channel layer на Redis.

## Возможные доработки

- LexoRank-строки вместо float-позиций (как в Jira).
- Роли участников (модель `BoardMembership.role` уже заложена).
- Presence/курсоры соавторов через тот же WebSocket.
- Загрузка файлов, комментарии, метки как отдельные сущности.
