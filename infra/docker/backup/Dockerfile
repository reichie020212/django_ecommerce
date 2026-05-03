# syntax=docker/dockerfile:1.7
# Cloud-portable Postgres backup sidecar.
# Runs busybox crond and pipes pg_dump output to S3-compatible storage.
# Replaces the macOS launchd plists for non-Mac deployments.
FROM alpine:3.20

RUN apk add --no-cache \
        postgresql16-client \
        aws-cli \
        bash \
        coreutils \
        tzdata

COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

ENV TZ=UTC

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
