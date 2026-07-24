from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationRead(BaseModel):
    id: int
    user_id: int
    order_id: int | None = None
    type: NotificationType
    message: str
    read_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCount(BaseModel):
    unread: int
