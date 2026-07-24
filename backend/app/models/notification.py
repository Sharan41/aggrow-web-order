import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class NotificationType(str, enum.Enum):
    ORDER_SUBMITTED = "ORDER_SUBMITTED"
    ORDER_FORWARDED = "ORDER_FORWARDED"
    ORDER_RESPONDED = "ORDER_RESPONDED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_REJECTED = "ORDER_REJECTED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    message: Mapped[str] = mapped_column(String(1024), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
