"""SMS delivery via Twilio. No-op when SMS_ENABLED is False."""
from __future__ import annotations

import logging
from typing import Iterable

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not _settings.SMS_ENABLED:
        return None
    if not _settings.TWILIO_ACCOUNT_SID or not _settings.TWILIO_AUTH_TOKEN:
        logger.warning("SMS disabled: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
        return None
    try:
        from twilio.rest import Client  # type: ignore

        _client = Client(_settings.TWILIO_ACCOUNT_SID, _settings.TWILIO_AUTH_TOKEN)
        return _client
    except Exception as exc:
        logger.warning("SMS disabled: %s", exc)
        return None


def send_sms(numbers: Iterable[str], body: str) -> None:
    """Send an SMS to each number in *numbers*. Silently skips empty/invalid entries."""
    recipients = [n.strip() for n in numbers if n and n.strip()]
    if not recipients:
        return
    client = _get_client()
    if client is None:
        logger.info("[sms disabled] to=%s body=%s", recipients, body)
        return
    from_number = _settings.TWILIO_FROM_NUMBER
    for number in recipients:
        try:
            client.messages.create(body=body, from_=from_number, to=number)
        except Exception:
            logger.exception("Failed sending SMS to %s", number)
