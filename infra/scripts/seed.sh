#!/usr/bin/env bash
# Wipe and re-seed from prototype/data.js. DESTRUCTIVE — refuses to run unless DJANGO_DEBUG=1.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
[[ -f .env ]] && set -a && . ./.env && set +a

if [[ "${DJANGO_DEBUG:-0}" != "1" ]]; then
  echo "refusing to seed — DJANGO_DEBUG must be 1 (this script wipes the DB)" >&2
  exit 1
fi

docker compose exec -T api python manage.py flush --noinput
docker compose exec -T api python manage.py migrate
docker compose exec -T api python manage.py import_catalog
echo "seeded"
