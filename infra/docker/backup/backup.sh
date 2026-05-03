#!/usr/bin/env bash
# Pipe a fresh pg_dump into S3-compatible object storage.
#
# Retention is delegated to a bucket lifecycle rule on
# BACKUP_S3_BUCKET / BACKUP_S3_PREFIX — supported by AWS S3,
# Cloudflare R2, and MinIO. Set the rule to expire objects after
# the desired number of days.
#
# Required env (compose injects from .env):
#   POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#   POSTGRES_HOST            (default: db)
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION       (e.g. auto for R2, us-east-1 for AWS)
#   BACKUP_S3_BUCKET         (must be distinct from AWS_STORAGE_BUCKET_NAME)
#   BACKUP_S3_PREFIX         (default: pg/)
#   AWS_S3_ENDPOINT_URL      (set for R2 / MinIO; leave unset for AWS)
set -euo pipefail

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
prefix="${BACKUP_S3_PREFIX:-pg/}"
key="${prefix%/}/lumen-${stamp}.sql.gz"

# Stage to disk first so a failed pg_dump can't produce a truncated
# upload — aws s3 cp from a pipe consumes bytes before pg_dump's exit
# code is known and would silently store a partial dump.
tmp="$(mktemp /tmp/lumen-pgdump.XXXXXX.sql.gz)"
trap 'rm -f "$tmp"' EXIT

PGHOST="${POSTGRES_HOST:-db}" \
PGUSER="${POSTGRES_USER}" \
PGPASSWORD="${POSTGRES_PASSWORD}" \
pg_dump --no-owner --no-acl "${POSTGRES_DB}" \
  | gzip -9 > "$tmp"

aws_args=()
[[ -n "${AWS_S3_ENDPOINT_URL:-}" ]] && aws_args+=(--endpoint-url "$AWS_S3_ENDPOINT_URL")

aws s3 cp "${aws_args[@]}" "$tmp" "s3://${BACKUP_S3_BUCKET}/${key}"

echo "[$(date -u +%FT%TZ)] uploaded s3://${BACKUP_S3_BUCKET}/${key} ($(stat -c %s "$tmp") bytes)"
