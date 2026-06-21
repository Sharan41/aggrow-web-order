"""WhatsApp delivery via Twilio. No-op when WHATSAPP_ENABLED is False."""
from __future__ import annotations

import logging
import re
from typing import Iterable

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not _settings.WHATSAPP_ENABLED:
        return None
    if not _settings.TWILIO_ACCOUNT_SID or not _settings.TWILIO_AUTH_TOKEN:
        logger.warning("WhatsApp disabled: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
        return None
    try:
        from twilio.rest import Client  # type: ignore

        _client = Client(_settings.TWILIO_ACCOUNT_SID, _settings.TWILIO_AUTH_TOKEN)
        return _client
    except Exception as exc:
        logger.warning("WhatsApp disabled: %s", exc)
        return None


def _normalize_whatsapp_address(number: str) -> str | None:
    """Return a Twilio WhatsApp address (whatsapp:+E164) or None if invalid."""
    raw = number.strip()
    if not raw:
        return None
    if raw.lower().startswith("whatsapp:"):
        digits = re.sub(r"\D", "", raw.split(":", 1)[1])
    else:
        digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if not raw.startswith("+") and not raw.lower().startswith("whatsapp:+"):
        # Default to India country code when users omit +91.
        if len(digits) == 10:
            digits = f"91{digits}"
    return f"whatsapp:+{digits.lstrip('+')}"


def _normalize_whatsapp_from(from_number: str) -> str:
    raw = from_number.strip()
    if raw.lower().startswith("whatsapp:"):
        return raw if raw.startswith("whatsapp:+") else f"whatsapp:+{raw.split(':', 1)[1].lstrip('+')}"
    digits = re.sub(r"\D", "", raw)
    return f"whatsapp:+{digits}"


def send_whatsapp(numbers: Iterable[str], body: str) -> None:
    """Send a WhatsApp message to each number. Silently skips empty/invalid entries."""
    recipients = []
    for number in numbers:
        address = _normalize_whatsapp_address(number)
        if address:
            recipients.append(address)
    if not recipients:
        return
    client = _get_client()
    if client is None:
        logger.info("[whatsapp disabled] to=%s body=%s", recipients, body)
        return
    from_number = _normalize_whatsapp_from(_settings.TWILIO_WHATSAPP_FROM)
    for address in recipients:
        try:
            client.messages.create(body=body, from_=from_number, to=address)
        except Exception:
            logger.exception("Failed sending WhatsApp to %s", address)
