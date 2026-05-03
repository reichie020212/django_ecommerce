# Lumen Goods — Hetzner Cloud (ARM64 VM) deploy runbook

> Step-by-step guide for deploying the stack on a single Hetzner Cloud
> CAX21 (or larger) ARM64 instance, with Cloudflare R2 for media + backups
> and Cloudflare Tunnel (or Hetzner Load Balancer + DNS A record) for
> public ingress. The Mac mini path is documented separately in
> [`infra/README.md`](README.md) and is unaffected by this guide.

The cloud-portability work behind this runbook is the five-PR Blueprint
documented in commit messages on `main` (S3-compatible media,
DATABASE_URL, JSON logging, multi-arch CI builds, containerised pg_dump
sidecar). Read those before deviating from the steps below.

## 0. Assumptions

- **Provider**: Hetzner Cloud, with billing enabled. SSH key uploaded.
- **Server**: CAX21 (4 vCPU / 8 GB RAM / 80 GB disk, ARM64 Ampere) or
  larger. CAX31 if you expect catalog growth + concurrent checkout
  traffic.
- **OS image**: Ubuntu 24.04 LTS (arm64). Debian works too.
- **DNS**: a domain you control. Cloudflare account recommended (R2
  needs it; Tunnel is the path of least resistance for ingress).
- **Storage**: two Cloudflare R2 buckets — `lumen-media` (product
  imagery) and `lumen-backups` (Postgres dumps). Distinct buckets so
  the backup sidecar can't clobber media.
- **Stripe**: real keys in *test mode* first. Switch to live only after
  the smoke run is clean.

The handoff brief's "self-hostable preferred" rule still applies: every
SaaS in this runbook (Cloudflare R2, Cloudflare Tunnel) has a
self-hosted alternative documented inline.

## 1. Provision the instance

In the Hetzner Cloud Console (or via the `hcloud` CLI):

1. *Servers → Add Server*. Location near your customers; image
   *Ubuntu 24.04*; type *CAX21* (Ampere ARM64); attach your SSH key;
   no Cloud-init script needed.
2. Optional: attach a 50 GB+ Volume for the Postgres + media + image
   data. Mount it at `/srv/lumen` in step 3 if you do.
3. Once the server is up, take note of the public IPv4 address. SSH
   in as `root`.

```bash
ssh root@<server-ip>
```

## 2. Bootstrap the host

```bash
# Refresh + base tools
apt-get update && apt-get -y upgrade
apt-get -y install ca-certificates curl gnupg ufw unattended-upgrades

# Docker (arm64 packages from the official repo)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Non-root user for stack ops
adduser --disabled-password --gecos "" lumen
usermod -aG docker lumen
mkdir -p /home/lumen/.ssh
cp ~/.ssh/authorized_keys /home/lumen/.ssh/
chown -R lumen:lumen /home/lumen/.ssh
chmod 700 /home/lumen/.ssh
chmod 600 /home/lumen/.ssh/authorized_keys

# Lock SSH down
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall: allow 22/tcp; 80/443 only if you're using a public cert,
# not Cloudflare Tunnel.
ufw allow 22/tcp
ufw --force enable
```

Re-connect as `lumen@<server-ip>` for the rest of this guide.

## 3. Clone + secrets

```bash
sudo mkdir -p /srv/lumen && sudo chown lumen:lumen /srv/lumen
cd /srv/lumen
git clone https://github.com/<your-org>/django_ecommerce.git goods
cd goods

# Optional: pin a known-good commit instead of tracking main
# git checkout <sha>

mkdir -p infra/secrets
chmod 700 infra/secrets
cp .env.example .env
chmod 600 .env
```

Edit `.env` in your editor of choice. Production-relevant fields:

```bash
DJANGO_SETTINGS_MODULE=lumen.settings.prod
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=<50+ char random string>
DJANGO_ALLOWED_HOSTS=lumen.example.com,api.lumen.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://lumen.example.com

# Database — keep the bundled postgres:16 container on a single VM.
# When you eventually move to managed Postgres, just swap DATABASE_URL.
POSTGRES_PASSWORD=<random 32+ chars>
DATABASE_URL=postgres://lumen:<that-password>@db:5432/lumen

# Stripe (test keys first; switch to live after a clean smoke run)
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
NEXT_PUBLIC_SITE_URL=https://lumen.example.com
NEXT_PUBLIC_API_URL=https://api.lumen.example.com

# Media: route product images to R2. See section 4 for the bucket setup.
MEDIA_BACKEND=s3
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret>
AWS_STORAGE_BUCKET_NAME=lumen-media
AWS_S3_ENDPOINT_URL=https://<r2-account-id>.r2.cloudflarestorage.com
AWS_S3_REGION_NAME=auto
AWS_S3_ADDRESSING_STYLE=virtual

# Backups: same R2 account, different bucket.
BACKUP_S3_BUCKET=lumen-backups
BACKUP_S3_PREFIX=pg/
AWS_DEFAULT_REGION=auto
BACKUP_TZ=UTC

# JSON logs — recommended once you wire a log aggregator.
JSON_LOGGING=1
LOG_LEVEL=INFO
```

> If you'd rather self-host object storage, swap R2 for a MinIO
> container and set `AWS_S3_ADDRESSING_STYLE=path`. The rest of the
> config is identical. R2 is recommended for the cost profile ($0
> egress) but is not required.

## 4. Cloudflare R2 setup

1. *R2 → Create bucket*. Two buckets: `lumen-media` and
   `lumen-backups`. Choose a region close to the Hetzner DC; for R2
   the region is `auto`.
2. *Bucket → Settings → CORS Policy* (media bucket only): allow
   `GET, HEAD` from `https://lumen.example.com` so the browser can
   load product imagery.
3. *Bucket → Settings → Lifecycle Rules* (backups bucket): add a rule
   that expires objects with prefix `pg/` after the desired number of
   days (30/60/90 — your call; the script does **not** do retention
   itself).
4. *R2 → Manage R2 API Tokens → Create API Token*. Scope to *Object
   Read & Write* on both buckets. Copy the access key + secret into
   `.env`.

## 5. Container images

Two paths — pull from GHCR (built by the CI workflow we just shipped)
or build locally. CI is the supported path.

### Option A — Pull from GHCR (preferred)

The CI workflow tags images on every push to `main`. Default
visibility is **private**, so either flip them to public on
github.com → *Packages*, or authenticate the VM to pull:

```bash
echo $GHCR_PAT | docker login ghcr.io -u <gh-user> --password-stdin
```

Then update `docker-compose.prod.yml` to point at GHCR images instead
of the local build context, or add an override file:

```yaml
# docker-compose.hetzner.yml (kept out of git; sits next to the rest)
services:
  api:
    image: ghcr.io/<gh-user>/django_ecommerce-api:latest
    build: !reset null
  web:
    image: ghcr.io/<gh-user>/django_ecommerce-web:latest
    build: !reset null
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
               -f docker-compose.hetzner.yml \
               --profile backup pull
```

### Option B — Build locally on the VM

Skip the override file. Compose builds api + web from source on the
VM. Slower first time (~5–10 min for an arm64 cold build) but no
GHCR auth needed.

## 6. Bring up the stack

```bash
# First boot — build (or pull), migrate, collect static, seed catalog.
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    --profile backup up -d --build

docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py collectstatic --noinput
docker compose exec api python manage.py import_catalog
docker compose exec api python manage.py createsuperuser
```

The `--profile backup` flag activates the cloud backup sidecar (see
[§7a of the Mac mini runbook](README.md#7a-cloud-backup-sidecar-non-mac-deployments)
for what it does). Confirm it's running:

```bash
docker compose ps backup
docker compose logs --tail=50 backup
```

## 7. Public ingress — pick one

### Option A — Cloudflare Tunnel (no inbound ports)

The `cloudflared` profile is already in `docker-compose.prod.yml`. On
your dev machine, log into Cloudflare and create a tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create lumen-prod
# copy the resulting credentials.json + the tunnel UUID
```

Drop the credentials into `infra/secrets/cloudflared.json` on the VM
and edit `infra/cloudflared/config.yml` with your tunnel UUID and the
`lumen.example.com` / `api.lumen.example.com` hostnames. Then:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
               --profile tunnel --profile backup up -d cloudflared
```

Cloudflare handles the TLS cert; nothing on the Hetzner side ever
opens 80/443 to the public internet.

### Option B — Hetzner LB or direct A record + Caddy

If you'd rather not depend on Cloudflare:

1. Create a Hetzner Load Balancer in front of the VM, or point an A
   record at the VM's public IP.
2. Open 80 and 443: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`.
3. The bundled Caddy in `docker-compose.yml` already has a stanza for
   `lumen.local`; edit `Caddyfile` to point at your real domain and
   enable Let's Encrypt:

   ```
   lumen.example.com, api.lumen.example.com {
       encode gzip
       reverse_proxy /api/* api:8000
       reverse_proxy /admin/* api:8000
       reverse_proxy * web:3000
   }
   ```

4. Restart Caddy: `docker compose restart caddy`.

## 8. Stripe webhook

Once the public hostname resolves:

1. Stripe Dashboard → *Developers → Webhooks → Add endpoint*.
2. Endpoint URL: `https://api.lumen.example.com/api/webhooks/stripe/`
3. Events: at minimum `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `charge.refunded`.
4. Copy the new `whsec_…` secret into `.env`'s `STRIPE_WEBHOOK_SECRET`
   and restart api: `docker compose restart api`.

## 9. Process supervision

Docker Compose with `restart: unless-stopped` (already configured per
service) handles crashes. To survive a host reboot, install a
systemd unit:

```bash
sudo tee /etc/systemd/system/lumen.service > /dev/null <<'UNIT'
[Unit]
Description=Lumen Goods stack (docker compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=lumen
WorkingDirectory=/srv/lumen/goods
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup --profile tunnel up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup --profile tunnel down

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now lumen.service
```

Drop `--profile tunnel` if you went with the LB / Caddy path.

## 10. Health checks

```bash
# Liveness — process is up
curl -fsS https://api.lumen.example.com/api/healthz

# Readiness — DB + Redis reachable
curl -fsS https://api.lumen.example.com/api/readyz | jq

# A working order through the storefront
open https://lumen.example.com/shop
```

## 11. Backups: verify and restore

A first-run smoke can be triggered without waiting for 03:15 UTC:

```bash
# Add to .env temporarily, then docker compose up -d backup
BACKUP_ON_START=1
```

The container will dump immediately, log the upload, then settle into
the cron schedule. Tail with `docker compose logs -f backup`. List
snapshots:

```bash
docker compose exec api aws --endpoint-url "$AWS_S3_ENDPOINT_URL" \
    s3 ls s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX
```

Restore from a snapshot:

```bash
infra/scripts/restore-from-s3.sh pg/lumen-20260503T031500Z.sql.gz
```

## 12. Resource budget

| Service | Suggested limit on CAX21 (8 GB RAM) |
|---|---|
| Postgres | `shared_buffers=512MB`, `max_connections=100` (adjust in `docker-compose.yml`) |
| Celery worker | `--concurrency=2` (default) |
| Next.js | one Node process, `pnpm start` against the built bundle |
| API gunicorn | 3 workers (default) |
| Redis | default; trivial RAM |
| Caddy / cloudflared | default; trivial RAM |

If you trip OOMs, jump to CAX31 (16 GB) before adjusting per-service
limits.

## 13. Things this runbook intentionally does *not* do

- **No managed Postgres.** The bundled `postgres:16` container is
  fine for a single-VM deploy. `DATABASE_URL` is the only switch you
  need to flip when you're ready for Neon / RDS / Cloud SQL.
- **No autoscaling.** Single VM. Vertical scale by resizing.
- **No multi-region.** Single VM, single region.
- **No edge CDN for product imagery.** R2's origin is good enough for
  v1. Drop Cloudflare CDN in front later if you need it.
- **No telemetry / phone-home.** Per `CLAUDE.md` §10. If you need
  observability, self-host (Loki + Grafana, or `docker logs` →
  `vector`).

## 14. Common ops

```bash
# Update to the latest main
cd /srv/lumen/goods && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    --profile backup pull        # if pulling from GHCR
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    --profile backup up -d --build
docker compose exec api python manage.py migrate --noinput
docker compose exec api python manage.py collectstatic --noinput

# Tail logs
docker compose logs -f api web worker backup

# Restart a single service
docker compose restart api

# Drain + reboot
sudo systemctl restart lumen.service
```
