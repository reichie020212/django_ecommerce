#!/usr/bin/env bash
# Nightly restic snapshot of the media volume.
# First-time setup:
#   restic -r "$RESTIC_REPOSITORY" init
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
[[ -f .env ]] && set -a && . ./.env && set +a

: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY in .env (e.g. /Volumes/LumenBackup/restic)}"
: "${RESTIC_PASSWORD_FILE:?set RESTIC_PASSWORD_FILE in .env}"

# media volume is named lumen_media in docker-compose.yml
mountpoint="$(docker volume inspect lumen_lumen_media --format '{{ .Mountpoint }}')"
restic backup "$mountpoint" --tag media --tag nightly
restic forget --keep-daily 14 --keep-weekly 8 --prune
