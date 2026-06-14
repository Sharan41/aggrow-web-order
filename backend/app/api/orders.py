from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_role
from app.models import Order, OrderItem, OrderStatus, Product, User, UserRole
from app.schemas.order import (
    CreateOrderBody,
    DashboardKPI,
    FactoryRespondBody,
    HoEditBody,
    HoRejectBody,
    OrderDetail,
    OrderSummary,
    UpdateDraftBody,
)
from app.services import order_workflow as wf

router = APIRouter(prefix="/orders", tags=["orders"])


def _to_item_inputs(items):
    return [wf.ItemInput(product_id=i.product_id, size_label=i.size_label, qty=i.qty) for i in items]


def _to_remark_inputs(remarks):
    return [wf.ProductRemarkInput(product_id=r.product_id, remarks=r.remarks) for r in remarks]


@router.get("", response_model=list[OrderSummary])
def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    branch_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrderSummary]:
    q = wf.scope_orders_query(user)
    if status_filter:
        q = q.where(Order.status == status_filter)
    if branch_id is not None:
        q = q.where(Order.branch_id == branch_id)
    if customer_id is not None:
        q = q.where(Order.customer_id == customer_id)
    rows = db.execute(q).scalars().unique().all()
    return [OrderSummary.from_model(o) for o in rows]


@router.get("/kpis", response_model=DashboardKPI)
def kpis(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.HEAD_OFFICE)),
) -> DashboardKPI:
    counts = dict(db.execute(select(Order.status, func.count()).group_by(Order.status)).all())
    return DashboardKPI(
        draft=counts.get(OrderStatus.DRAFT, 0),
        submitted_to_ho=counts.get(OrderStatus.SUBMITTED_TO_HO, 0),
        ho_forwarded=counts.get(OrderStatus.HO_FORWARDED, 0),
        factory_responded=counts.get(OrderStatus.FACTORY_RESPONDED, 0),
        completed=counts.get(OrderStatus.COMPLETED, 0),
        rejected=counts.get(OrderStatus.REJECTED, 0),
        total=sum(counts.values()),
    )


@router.post("", response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CUSTOMER)),
) -> OrderDetail:
    order = wf.create_draft(
        db, user, _to_item_inputs(body.items), body.customer_note, _to_remark_inputs(body.product_remarks)
    )
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderDetail:
    order = db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.packing_group),
            selectinload(Order.product_remarks),
            selectinload(Order.events),
            selectinload(Order.customer),
            selectinload(Order.branch),
        )
        .where(Order.id == order_id)
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not wf.can_view(order, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.patch("/{order_id}", response_model=OrderDetail)
def update_draft(
    order_id: int,
    body: UpdateDraftBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CUSTOMER)),
) -> OrderDetail:
    items = _to_item_inputs(body.items) if body.items is not None else None
    remarks = _to_remark_inputs(body.product_remarks) if body.product_remarks is not None else None
    order = wf.update_customer_draft(db, order_id, user, items, body.customer_note, remarks)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.post("/{order_id}/submit", response_model=OrderDetail)
def submit_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CUSTOMER)),
) -> OrderDetail:
    order = wf.submit_to_ho(db, order_id, user)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.patch("/{order_id}/ho", response_model=OrderDetail)
def ho_edit_order(
    order_id: int,
    body: HoEditBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.HEAD_OFFICE)),
) -> OrderDetail:
    items = _to_item_inputs(body.items) if body.items is not None else None
    remarks = _to_remark_inputs(body.product_remarks) if body.product_remarks is not None else None
    order = wf.ho_edit(db, order_id, user, items, body.ho_note, remarks)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.post("/{order_id}/forward", response_model=OrderDetail)
def forward_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.HEAD_OFFICE)),
) -> OrderDetail:
    order = wf.ho_forward(db, order_id, user)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.post("/{order_id}/reject", response_model=OrderDetail)
def reject_order(
    order_id: int,
    body: HoRejectBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.HEAD_OFFICE)),
) -> OrderDetail:
    order = wf.ho_reject(db, order_id, user, body.reason)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.post("/{order_id}/respond", response_model=OrderDetail)
def factory_respond_order(
    order_id: int,
    body: FactoryRespondBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FACTORY)),
) -> OrderDetail:
    items = [
        wf.FactoryItemInput(
            product_id=i.product_id,
            size_label=i.size_label,
            available=i.available,
            note=i.note,
        )
        for i in body.items
    ]
    order = wf.factory_respond(db, order_id, user, items, body.factory_note)
    return OrderDetail.from_model(order, viewer_role=user.role)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.HEAD_OFFICE)),
) -> None:
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Only COMPLETED orders can be deleted",
        )
    db.delete(order)
    db.commit()
