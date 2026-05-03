#!/bin/sh
# Optionally take an immediate dump (useful for first-run smoke testing),
# then hand off to busybox crond as PID 1.
set -e

if [ "${BACKUP_ON_START:-0}" = "1" ]; then
    /usr/local/bin/backup.sh > /proc/1/fd/1 2>&1 || \
        echo "[$(date -u +%FT%TZ)] startup backup failed (continuing)" >&2
fi

exec crond -f -L /dev/stdout
