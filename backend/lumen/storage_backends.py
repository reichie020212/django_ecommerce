"""Media storage backends.

Used when MEDIA_BACKEND=s3. The S3Storage base from django-storages talks
to any S3-compatible service: AWS S3, Cloudflare R2, Backblaze B2, or a
self-hosted MinIO. The choice is driven entirely by env vars
(AWS_S3_ENDPOINT_URL, AWS_S3_REGION_NAME, AWS_STORAGE_BUCKET_NAME, etc.).
"""

from __future__ import annotations

from storages.backends.s3 import S3Storage


class MediaStorage(S3Storage):
    location = "media"
    file_overwrite = False
    default_acl = None
