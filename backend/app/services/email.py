"""Email delivery via fastapi-mail. No-op when MAIL_ENABLED is False."""
from __future__ import annotations

import logging
from typing import Iterable

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()


_fm = None


def _get_fm():
    global _fm
    if _fm is not None:
        return _fm
    if not _settings.MAIL_ENABLED:
        return None
    try:
        from fastapi_mail import ConnectionConfig, FastMail

        conf = ConnectionConfig(
            MAIL_USERNAME=_settings.MAIL_USERNAME,
            MAIL_PASSWORD=_settings.MAIL_PASSWORD,
            MAIL_FROM=_settings.MAIL_FROM,
            MAIL_PORT=_settings.MAIL_PORT,
            MAIL_SERVER=_settings.MAIL_SERVER,
            MAIL_FROM_NAME=_settings.MAIL_FROM_NAME,
            MAIL_STARTTLS=_settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=_settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=bool(_settings.MAIL_USERNAME),
            VALIDATE_CERTS=True,
        )
        _fm = FastMail(conf)
        return _fm
    except Exception as exc:  # pragma: no cover - optional dep
        logger.warning("Email disabled: %s", exc)
        return None


async def send_email(to: Iterable[str], subject: str, body_html: str) -> None:
    recipients = [r for r in to if r]
    if not recipients:
        return
    fm = _get_fm()
    if fm is None:
        logger.info("[email disabled] to=%s subject=%s", recipients, subject)
        return
    from fastapi_mail import MessageSchema, MessageType  # type: ignore

    msg = MessageSchema(
        subject=subject,
        recipients=list(recipients),
        body=body_html,
        subtype=MessageType.html,
    )
    try:
        await fm.send_message(msg)
    except Exception:  # pragma: no cover
        logger.exception("Failed sending email subject=%s", subject)
