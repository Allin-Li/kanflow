# Python 3.13 — стабильно совместим с Django 5.1 (хост может быть 3.14)
FROM python:3.13-slim

# Бинарник uv берём из официального образа — pip для установки не нужен
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # .venv кладём вне /app: в dev каталог проекта монтируется bind-mount'ом
    # и спрятал бы окружение, лежащее внутри образа
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Слой с зависимостями кешируется, пока не меняются pyproject.toml/uv.lock.
# --locked: версии строго из uv.lock, при рассинхроне с pyproject — ошибка.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
