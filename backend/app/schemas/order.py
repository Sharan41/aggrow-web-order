from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.form_type import OrderFormType
from app.models.order import OrderEventAction, OrderStatus
from app.models.user import UserRole


class OrderItemInput(BaseModel):
    product_id: int
    size_label: str
    qty: int = Field(ge=0)


class ProductRemarkInput(BaseModel):
    product_id: int
    remarks: str | None = Field(default=None, max_length=255)


class FactoryItemInput(BaseModel):
    product_id: int
    size_label: str
    available: bool
    note: str | None = None


class ProductRemarkRead(BaseModel):
    product_id: int
    remarks: str | None


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    size_label: str
    customer_qty: int
    ho_qty: int
    factory_available: bool | None
    factory_item_note: str | None

    @classmethod
    def from_model(cls, item, viewer_role: UserRole | None = None) -> "OrderItemRead":
        return cls(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name if item.product else "",
            size_label=item.size_label,
            customer_qty=item.customer_qty,
            ho_qty=item.ho_qty,
            factory_available=item.factory_available,
            # Customers must not see factory per-item notes
            factory_item_note=None if viewer_role == UserRole.CUSTOMER else item.factory_item_note,
        )


class OrderEventRead(BaseModel):
    id: int
    actor_user_id: int | None
    action: OrderEventAction
    payload: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    branch_id: int | None
    branch_name: str | None
    status: OrderStatus
    created_at: datetime
    submitted_at: datetime | None
    ho_forwarded_at: datetime | None
    admin_forwarded_at: datetime | None
    factory_responded_at: datetime | None
    ho_reviewer_id: int | None = None
    ho_reviewer_name: str | None = None
    item_count: int
    order_form_type: OrderFormType

    @classmethod
    def from_model(cls, order) -> "OrderSummary":
        return cls(
            id=order.id,
            customer_id=order.customer_id,
            customer_name=order.customer.name if order.customer else "",
            branch_id=order.branch_id,
            branch_name=order.branch.name if order.branch else None,
            status=order.status,
            created_at=order.created_at,
            submitted_at=order.submitted_at,
            ho_forwarded_at=order.ho_forwarded_at,
            admin_forwarded_at=order.admin_forwarded_at,
            factory_responded_at=order.factory_responded_at,
            ho_reviewer_id=order.ho_reviewer_id,
            ho_reviewer_name=order.ho_reviewer.name if order.ho_reviewer else None,
            item_count=len(order.items or []),
            order_form_type=order.order_form_type,
        )


class OrderDetail(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    branch_id: int | None
    branch_name: str | None
    status: OrderStatus
    customer_note: str | None
    ho_note: str | None
    admin_note: str | None
    factory_note: str | None
    created_at: datetime
    submitted_at: datetime | None
    ho_forwarded_at: datetime | None
    admin_forwarded_at: datetime | None
    factory_responded_at: datetime | None
    ho_reviewer_id: int | None = None
    ho_reviewer_name: str | None = None
    order_form_type: OrderFormType
    items: list[OrderItemRead]
    product_remarks: list[ProductRemarkRead] = Field(default_factory=list)
    events: list[OrderEventRead] = Field(default_factory=list)

    @classmethod
    def from_model(cls, order, viewer_role: UserRole | None = None) -> "OrderDetail":
        return cls(
            id=order.id,
            customer_id=order.customer_id,
            customer_name=order.customer.name if order.customer else "",
            branch_id=order.branch_id,
            branch_name=order.branch.name if order.branch else None,
            status=order.status,
            customer_note=None if viewer_role == UserRole.FACTORY else order.customer_note,
            ho_note=None if viewer_role == UserRole.CUSTOMER else order.ho_note,
            admin_note=None if viewer_role == UserRole.CUSTOMER else order.admin_note,
            factory_note=None if viewer_role == UserRole.CUSTOMER else order.factory_note,
            created_at=order.created_at,
            submitted_at=order.submitted_at,
            ho_forwarded_at=order.ho_forwarded_at,
            admin_forwarded_at=order.admin_forwarded_at,
            factory_responded_at=order.factory_responded_at,
            ho_reviewer_id=order.ho_reviewer_id,
            ho_reviewer_name=order.ho_reviewer.name if order.ho_reviewer else None,
            order_form_type=order.order_form_type,
            items=[OrderItemRead.from_model(i, viewer_role) for i in (order.items or [])],
            product_remarks=(
                []
                if viewer_role == UserRole.FACTORY
                else [
                    ProductRemarkRead(product_id=r.product_id, remarks=r.remarks)
                    for r in (order.product_remarks or [])
                ]
            ),
            events=[OrderEventRead.model_validate(e) for e in (order.events or [])],
        )


class CreateOrderBody(BaseModel):
    items: list[OrderItemInput] = Field(default_factory=list)
    customer_note: str | None = None
    product_remarks: list[ProductRemarkInput] = Field(default_factory=list)
    order_form_type: OrderFormType = OrderFormType.AG_GROW


class UpdateDraftBody(BaseModel):
    items: list[OrderItemInput] | None = None
    customer_note: str | None = None
    product_remarks: list[ProductRemarkInput] | None = None


class HoEditBody(BaseModel):
    items: list[OrderItemInput] | None = None
    ho_note: str | None = None
    product_remarks: list[ProductRemarkInput] | None = None


class HoRejectBody(BaseModel):
    reason: str | None = None


class AdminEditBody(BaseModel):
    items: list[OrderItemInput] | None = None
    admin_note: str | None = None
    product_remarks: list[ProductRemarkInput] | None = None


class AdminRejectBody(BaseModel):
    reason: str | None = None


class FactoryRespondBody(BaseModel):
    items: list[FactoryItemInput]
    factory_note: str | None = None


class DashboardKPI(BaseModel):
    draft: int = 0
    submitted_to_ho: int = 0
    submitted_to_admin: int = 0
    ho_forwarded: int = 0
    factory_responded: int = 0
    completed: int = 0
    rejected: int = 0
    total: int = 0
