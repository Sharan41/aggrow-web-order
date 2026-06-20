"""Create in-app notifications and enqueue emails and SMS for order events."""
from __future__ import annotations

import asyncio
import logging
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Notification, Order, User, UserRole
from app.models.notification import NotificationType
from app.services.email import send_email
from app.services.sms import send_sms

logger = logging.getLogger(__name__)


def _users_by_role(db: Session, role: UserRole) -> list[User]:
    return list(
        db.execute(select(User).where(User.role == role, User.active.is_(True))).scalars()
    )


def _notify(
    db: Session,
    users: Iterable[User],
    order: Order,
    ntype: NotificationType,
    message: str,
) -> list[User]:
    recipients = list({u.id: u for u in users if u.active}.values())
    for u in recipients:
        db.add(Notification(user_id=u.id, order_id=order.id, type=ntype, message=message))
    return recipients


def _send_emails_bg(recipients: list[User], subject: str, body_html: str) -> None:
    emails = [u.email for u in recipients]
    if not emails:
        return
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(send_email(emails, subject, body_html))
        else:  # pragma: no cover - unlikely in a running FastAPI app
            loop.run_until_complete(send_email(emails, subject, body_html))
    except RuntimeError:
        asyncio.run(send_email(emails, subject, body_html))
    except Exception:  # pragma: no cover
        logger.exception("Email dispatch failed")


def _send_sms_bg(recipients: list[User], body: str) -> None:
    numbers = [u.mobile_number for u in recipients if u.mobile_number]
    if not numbers:
        return
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(asyncio.to_thread(send_sms, numbers, body))
        else:  # pragma: no cover
            loop.run_until_complete(asyncio.to_thread(send_sms, numbers, body))
    except RuntimeError:
        send_sms(numbers, body)
    except Exception:  # pragma: no cover
        logger.exception("SMS dispatch failed")


def fan_out_submitted(db: Session, order: Order) -> None:
    """Customer -> HO."""
    ho_users = _users_by_role(db, UserRole.HEAD_OFFICE)
    message = f"Order #{order.id} submitted by {order.customer.name} for review."
    recipients = _notify(db, ho_users, order, NotificationType.ORDER_SUBMITTED, message)
    _send_emails_bg(
        recipients,
        subject=f"[AG Grow] New order #{order.id} awaiting approval",
        body_html=(
            f"<p>Hi Head Office team,</p>"
            f"<p>A new order <b>#{order.id}</b> has been submitted by "
            f"<b>{order.customer.name}</b>.</p>"
            f"<p>Please review and forward to admin.</p>"
        ),
    )
    _send_sms_bg(recipients, f"[AG Grow] New order #{order.id} submitted by {order.customer.name}. Please review.")


def fan_out_ho_forwarded_to_admin(db: Session, order: Order, ho_actor: User) -> None:
    """HO -> Admin."""
    admin_users = _users_by_role(db, UserRole.ADMIN)
    message = (
        f"Order #{order.id} forwarded by Head Office ({ho_actor.name}) for admin review."
    )
    recipients = _notify(db, admin_users, order, NotificationType.ORDER_SUBMITTED, message)
    _send_emails_bg(
        recipients,
        subject=f"[AG Grow] Order #{order.id} awaiting admin review",
        body_html=(
            f"<p>Hi Admin,</p>"
            f"<p>Head Office user <b>{ho_actor.name}</b> has forwarded order "
            f"<b>#{order.id}</b> from <b>{order.customer.name}</b> for your review.</p>"
            f"<p>Please review and forward to the factory.</p>"
        ),
    )
    _send_sms_bg(
        recipients,
        f"[AG Grow] Order #{order.id} forwarded by {ho_actor.name} (HO). Please review.",
    )


def fan_out_forwarded(db: Session, order: Order) -> None:
    """Admin -> Factory."""
    factory_users = _users_by_role(db, UserRole.FACTORY)
    message = f"Order #{order.id} forwarded by Admin to factory."
    recipients = _notify(db, factory_users, order, NotificationType.ORDER_FORWARDED, message)
    _send_emails_bg(
        recipients,
        subject=f"[AG Grow] Order #{order.id} forwarded for dispatch",
        body_html=(
            f"<p>Hi Factory team,</p>"
            f"<p>Admin has forwarded order <b>#{order.id}</b>.</p>"
            f"<p>Please respond with item availability.</p>"
        ),
    )
    _send_sms_bg(recipients, f"[AG Grow] Order #{order.id} forwarded by Admin. Please respond with availability.")


def fan_out_factory_responded(db: Session, order: Order) -> None:
    """Factory -> HO + Admin + Customer."""
    ho_users = _users_by_role(db, UserRole.HEAD_OFFICE)
    admin_users = _users_by_role(db, UserRole.ADMIN)

    ho_message = f"Factory has responded to order #{order.id}. Please review availability."
    ho_recipients = _notify(db, ho_users, order, NotificationType.ORDER_RESPONDED, ho_message)
    admin_recipients = _notify(db, admin_users, order, NotificationType.ORDER_RESPONDED, ho_message)
    all_ops = list({u.id: u for u in ho_recipients + admin_recipients}.values())
    _send_emails_bg(
        all_ops,
        subject=f"[AG Grow] Factory response on order #{order.id}",
        body_html=(
            f"<p>Hi team,</p>"
            f"<p>The factory has completed its response to order <b>#{order.id}</b>.</p>"
            f"<p>Please log in to review item availability and the factory note.</p>"
        ),
    )
    _send_sms_bg(all_ops, f"[AG Grow] Factory responded to order #{order.id}. Log in to review.")

    customer_message = f"Your order #{order.id} has been processed and completed."
    customer_recipients = _notify(db, [order.customer], order, NotificationType.ORDER_RESPONDED, customer_message)
    _send_emails_bg(
        customer_recipients,
        subject=f"[AG Grow] Order #{order.id} completed",
        body_html=(
            f"<p>Hi {order.customer.name},</p>"
            f"<p>Your order <b>#{order.id}</b> has been completed. Please log in to view the status.</p>"
        ),
    )
    _send_sms_bg(customer_recipients, f"[AG Grow] Your order #{order.id} has been completed. Log in to view details.")


def fan_out_ho_rejected(db: Session, order: Order) -> None:
    """HO reject -> Customer + Admin."""
    admin_users = _users_by_role(db, UserRole.ADMIN)
    customer_message = f"Order #{order.id} was rejected by Head Office."
    customer_recipients = _notify(
        db,
        [order.customer],
        order,
        NotificationType.ORDER_REJECTED,
        customer_message,
    )
    admin_message = f"Order #{order.id} was rejected by Head Office."
    admin_recipients = _notify(db, admin_users, order, NotificationType.ORDER_REJECTED, admin_message)
    _send_emails_bg(
        customer_recipients,
        subject=f"[AG Grow] Order #{order.id} rejected",
        body_html=(
            f"<p>Your order <b>#{order.id}</b> was rejected by Head Office.</p>"
            f"<p>Please log in to view the note.</p>"
        ),
    )
    _send_sms_bg(customer_recipients, f"[AG Grow] Your order #{order.id} was rejected by Head Office. Log in for details.")
    _send_emails_bg(
        admin_recipients,
        subject=f"[AG Grow] Order #{order.id} rejected by Head Office",
        body_html=(
            f"<p>Head Office rejected order <b>#{order.id}</b> from "
            f"<b>{order.customer.name}</b>.</p>"
            f"<p>Please log in to view details.</p>"
        ),
    )
    _send_sms_bg(admin_recipients, f"[AG Grow] Order #{order.id} rejected by Head Office.")


def fan_out_admin_rejected(db: Session, order: Order) -> None:
    """Admin reject -> HO + Customer."""
    ho_users = _users_by_role(db, UserRole.HEAD_OFFICE)
    customer_message = f"Order #{order.id} was rejected by Admin."
    customer_recipients = _notify(
        db,
        [order.customer],
        order,
        NotificationType.ORDER_REJECTED,
        customer_message,
    )
    ho_message = f"Order #{order.id} was rejected by Admin."
    ho_recipients = _notify(db, ho_users, order, NotificationType.ORDER_REJECTED, ho_message)
    _send_emails_bg(
        customer_recipients,
        subject=f"[AG Grow] Order #{order.id} rejected",
        body_html=(
            f"<p>Your order <b>#{order.id}</b> was rejected by Admin.</p>"
            f"<p>Please log in to view the note.</p>"
        ),
    )
    _send_sms_bg(customer_recipients, f"[AG Grow] Your order #{order.id} was rejected by Admin. Log in for details.")
    _send_emails_bg(
        ho_recipients,
        subject=f"[AG Grow] Order #{order.id} rejected by Admin",
        body_html=(
            f"<p>Admin rejected order <b>#{order.id}</b> from "
            f"<b>{order.customer.name}</b>.</p>"
            f"<p>Please log in to view details.</p>"
        ),
    )
    _send_sms_bg(ho_recipients, f"[AG Grow] Order #{order.id} rejected by Admin.")
