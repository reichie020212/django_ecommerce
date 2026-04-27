#!/usr/bin/env bash
# Nightly Postgres backup — pg_dump into the external backup volume.
# Schedule via launchd (see infra/launchd/) or cron.
#
# Env:
#   BACKUP_DIR  destination directory (default: /Volumes/LumenBackup/pg)
#   POSTGRES_DB / POSTGRES_USER read from .env
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
[[ -f .env ]] && set -a && . ./.env && set +a

BACKUP_DIR="${BACKUP_DIR:-/Volumes/LumenBackup/pg}"
mkdir -p "$BACKUP_DIR"

stamp="$(date +%F-%H%M%S)"
out="$BACKUP_DIR/lumen-$stamp.sql.gz"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$out"
echo "wrote $out"

# Keep last 30 days
find "$BACKUP_DIR" -name 'lumen-*.sql.gz' -mtime +30 -delete
