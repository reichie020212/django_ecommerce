"""Smoke tests for the media-storage adapter.

Default behaviour (MEDIA_BACKEND=local) keeps Django's filesystem storage
so the dev/Mac mini path is unchanged. The S3 path is verified by
asserting the MediaStorage class is wired correctly to django-storages
(no live S3 call — that belongs in an integration test against MinIO).
"""

from __future__ import annotations

from django.core.files.storage import FileSystemStorage, default_storage


def test_default_media_storage_is_local() -> None:
    assert isinstance(default_storage, FileSystemStorage)


def test_media_storage_class_subclasses_s3storage_with_expected_defaults() -> None:
    from storages.backends.s3 import S3Storage

    from lumen.storage_backends import MediaStorage

    assert issubclass(MediaStorage, S3Storage)
    assert MediaStorage.location == "media"
    assert MediaStorage.file_overwrite is False
    assert MediaStorage.default_acl is None
