"""Development settings — debug on, console email, permissive CORS for the dev frontend."""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Cookies are non-Secure in dev so localhost works without TLS.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
