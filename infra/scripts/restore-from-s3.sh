#!/usr/bin/env bash
# Restore the DB from an S3 backup created by the cloud backup sidecar.
#
# Usage:
#   infra/scripts/restore-from-s3.sh <s3-key>
#
# Example:
#   infra/scripts/restore-from-s3.sh pg/lumen-20260503T031500Z.sql.gz
#
# List available keys:
#   aws s3 ls s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
[[ -f .env ]] && set -a && . ./.env && set +a

key="${1:-}"
if [[ -z "$key" ]]; then
    echo "usage: $0 <s3-key>" >&2
    echo "  list keys: aws s3 ls s3://${BACKUP_S3_BUCKET:-<bucket>}/${BACKUP_S3_PREFIX:-pg/}" >&2
    exit 1
fi

read -r -p "Overwrite '${POSTGRES_DB}' with ${key}? [y/N] " ok
[[ "$ok" == "y" || "$ok" == "Y" ]] || { echo "aborted"; exit 1; }

aws_args=()
[[ -n "${AWS_S3_ENDPOINT_URL:-}" ]] && aws_args+=(--endpoint-url "$AWS_S3_ENDPOINT_URL")

aws s3 cp "${aws_args[@]}" "s3://${BACKUP_S3_BUCKET}/${key}" - \
  | gunzip -c \
  | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "restored from s3://${BACKUP_S3_BUCKET}/${key}"
