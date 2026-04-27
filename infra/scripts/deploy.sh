#!/usr/bin/env bash
# Pull latest, rebuild, restart, migrate. Idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec -T api python manage.py migrate --noinput
docker compose exec -T api python manage.py collectstatic --noinput
echo "deploy complete"
