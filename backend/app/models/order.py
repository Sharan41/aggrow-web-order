import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models._types import JSONType


from app.models.form_type import OrderFormType


class OrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED_TO_HO = "SUBMITTED_TO_HO"
    SUBMITTED_TO_ADMIN = "SUBMITTED_TO_ADMIN"
    HO_FORWARDED = "HO_FORWARDED"
    FACTORY_RESPONDED = "FACTORY_RESPONDED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class OrderEventAction(str, enum.Enum):
    CREATED = "CREATED"
    CUSTOMER_SUBMITTED = "CUSTOMER_SUBMITTED"
    HO_EDITED = "HO_EDITED"
    HO_FORWARDED_TO_ADMIN = "HO_FORWARDED_TO_ADMIN"
    HO_REJECTED = "HO_REJECTED"
    ADMIN_EDITED = "ADMIN_EDITED"
    ADMIN_FORWARDED = "ADMIN_FORWARDED"
    ADMIN_REJECTED = "ADMIN_REJECTED"
    ADMIN_REVOKED = "ADMIN_REVOKED"
    FACTORY_RESPONDED = "FACTORY_RESPONDED"
    COMPLETED = "COMPLETED"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), default=OrderStatus.DRAFT, nullable=False, index=True
    )
    order_form_type: Mapped[OrderFormType] = mapped_column(
        Enum(OrderFormType, name="order_form_type"), default=OrderFormType.AG_GROW, nullable=False, index=True
    )

    customer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    ho_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    factory_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    ho_reviewer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    admin_reviewer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ho_forwarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_forwarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    factory_responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    customer: Mapped["User"] = relationship(back_populates="orders", foreign_keys=[customer_id])  # noqa: F821
    ho_reviewer: Mapped["User | None"] = relationship(foreign_keys=[ho_reviewer_id])  # noqa: F821
    admin_reviewer: Mapped["User | None"] = relationship(foreign_keys=[admin_reviewer_id])  # noqa: F821
    branch: Mapped["Branch | None"] = relationship(back_populates="orders")  # noqa: F821
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    product_remarks: Mapped[list["OrderProductRemark"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    events: Mapped[list["OrderEvent"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderEvent.created_at"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (UniqueConstraint("order_id", "product_id", "size_label", name="uq_orderitem_line"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    size_label: Mapped[str] = mapped_column(String(64), nullable=False)

    customer_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ho_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    factory_available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    factory_item_note: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()  # noqa: F821


class OrderProductRemark(Base):
    __tablename__ = "order_product_remarks"
    __table_args__ = (UniqueConstraint("order_id", "product_id", name="uq_order_product_remark"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    order: Mapped[Order] = relationship(back_populates="product_remarks")
    product: Mapped["Product"] = relationship()  # noqa: F821


class OrderEvent(Base):
    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[OrderEventAction] = mapped_column(Enum(OrderEventAction, name="order_event_action"), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order: Mapped[Order] = relationship(back_populates="events")
