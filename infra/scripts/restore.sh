#!/usr/bin/env bash
# Restore the DB from a pg_dump file produced by infra/backups/pg_backup.sh.
# Usage: infra/scripts/restore.sh /path/to/lumen-2026-04-27-030000.sql.gz
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
[[ -f .env ]] && set -a && . ./.env && set +a

dump="${1:-}"
if [[ -z "$dump" || ! -f "$dump" ]]; then
  echo "usage: $0 <path-to-pg_dump.sql.gz>" >&2
  exit 1
fi

read -r -p "This will overwrite the '$POSTGRES_DB' database. Continue? [y/N] " ok
[[ "$ok" == "y" || "$ok" == "Y" ]] || { echo "aborted"; exit 1; }

gunzip -c "$dump" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "restored from $dump"
