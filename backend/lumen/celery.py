"""Celery app for Lumen Goods."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lumen.settings.dev")

app = Celery("lumen")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
