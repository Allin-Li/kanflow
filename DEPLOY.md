# Деплой kanflow.allinli.ru

Автодеплой при пуше в `main`. GitHub Actions собирает фронт и backend и
раскладывает их на сервер.

## Схема

```
Internet :443
  └─ HAProxy (SNI, TCP-passthrough)
       └─ kanflow.allinli.ru → host-nginx :8443 (терминирует TLS, LE-сертификат)
            ├─ /                     → статика из /var/www/kanflow      (SPA)
            └─ /api /ws /admin       → 127.0.0.1:8100  (контейнер kanflow-backend)
                                          └─ kanflow-db (том kanflow_pgdata)
```

Фронтенд — **статические файлы** в `/var/www/kanflow` (в контейнере не живёт).
Backend — контейнер, образ тянется из GHCR.

## Что делает CI (`.github/workflows/deploy.yml`)

1. `build-backend` — собирает `backend/Dockerfile`, пушит
   `ghcr.io/allin-li/kanflow-backend:latest` (пакет публичный — серверу login не нужен).
2. `deploy` —
   - собирает фронт (`npm run build`, `VITE_*` → `https://kanflow.allinli.ru`);
   - `rsync --delete` собранного `dist/` → `/var/www/kanflow/`;
   - `scp docker-compose.prod.yml` → `/opt/kanflow/`;
   - по SSH: `docker compose -f docker-compose.prod.yml pull && up -d`.

Миграции и `collectstatic` выполняются при старте backend-контейнера.

## Секреты GitHub (уже заведены)

| Секрет | Значение |
|--------|----------|
| `SSH_HOST` | `allinli.ru` |
| `SSH_USER` | `root` |
| `SSH_KEY`  | приватный ключ CI-деплоя (публичный — в `/root/.ssh/authorized_keys`) |

`GITHUB_TOKEN` для пуша образа выдаётся автоматически.

## Состояние сервера (настроено вручную, разово)

- `/opt/kanflow/.env` — прод-секреты (`POSTGRES_PASSWORD`, `DJANGO_SECRET_KEY`,
  `DJANGO_ALLOWED_HOSTS=kanflow.allinli.ru`, `CORS_ALLOWED_ORIGINS=https://kanflow.allinli.ru`).
- `/opt/kanflow/docker-compose.prod.yml` — кладётся из CI.
- `/etc/nginx/sites-enabled/kanflow.conf` — vhost с TLS и проксированием на `:8100`.
- Том `kanflow_pgdata` — данные Postgres (при деплое не пересоздаётся).

## Обслуживание

```bash
# на сервере
cd /opt/kanflow
docker compose -f docker-compose.prod.yml logs -f backend      # логи backend
docker compose -f docker-compose.prod.yml ps                   # статус
docker compose -f docker-compose.prod.yml exec backend \
    python manage.py createsuperuser                            # админ для /admin/
docker compose -f docker-compose.prod.yml exec db \
    pg_dump -U kanflow kanflow > ~/kanflow-$(date +%F).sql      # бэкап БД
```

Ручной прогон деплоя без пуша: вкладка **Actions → Deploy → Run workflow**.

## Заметки

- Репозиторий и образ публичные. Если сделаешь приватным — на сервере
  понадобится `docker login ghcr.io`, а в deploy-job — проброс токена.
- Масштабирование backend на несколько процессов потребует Redis:
  раскомментировать сервис и задать `REDIS_URL` в `.env`.
- Статика Django admin (`/static/`) сейчас в `kanflow.conf` не проксируется —
  админка работает, но без стилей. При необходимости добавить в vhost
  `location ^~ /static/ { proxy_pass http://127.0.0.1:8100; }`.
- Старый `/opt/kanflow/docker-compose.yml` (dev-сборка backend) больше не
  используется — можно удалить.
