"""Tests for the LOGGING dict.

The dictConfig validation catches the cheap mistakes (typo'd handler,
missing formatter). The JSON formatter is verified by emitting a record
through python-json-logger directly so the test stays independent of
settings reload.
"""

from __future__ import annotations

import json
import logging
import logging.config
from io import StringIO

from django.conf import settings


def test_settings_logging_dict_is_valid() -> None:
    logging.config.dictConfig(settings.LOGGING)


def test_default_formatter_is_plain() -> None:
    handler = settings.LOGGING["handlers"]["console"]
    assert handler["formatter"] in {"plain", "json"}
    assert handler["stream"] == "ext://sys.stdout"


def test_json_formatter_emits_parseable_json() -> None:
    from pythonjsonlogger.json import JsonFormatter

    buf = StringIO()
    handler = logging.StreamHandler(buf)
    handler.setFormatter(JsonFormatter("%(levelname)s %(name)s %(message)s"))

    logger = logging.getLogger("lumen.tests.json")
    logger.handlers = [handler]
    logger.setLevel(logging.INFO)
    logger.propagate = False

    logger.info("hello", extra={"order_id": 42})

    payload = json.loads(buf.getvalue())
    assert payload["levelname"] == "INFO"
    assert payload["message"] == "hello"
    assert payload["order_id"] == 42
