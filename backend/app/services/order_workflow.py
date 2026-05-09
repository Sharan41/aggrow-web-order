"""Order state machine + role-aware mutation helpers."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Order,
    OrderEvent,
    OrderItem,
    OrderStatus,
    Product,
    ProductPacking,
    User,
    UserRole,
)
from app.models.order import OrderEventAction
from app.services import notification as notif


@dataclass
class ItemInput:
    product_id: int
    size_label: str
    qty: int


@dataclass
class FactoryItemInput:
    product_id: int
    size_label: str
    available: bool
    note: str | None = None


# --- helpers ---

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _record_event(
    db: Session,
    order: Order,
    actor: User,
    action: OrderEventAction,
    payload: dict | None = None,
) -> None:
    db.add(
        OrderEvent(
            order_id=order.id,
            actor_user_id=actor.id,
            action=action,
            payload=payload,
        )
    )


def _load_order(db: Session, order_id: int) -> Order:
    order = db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.customer),
            selectinload(Order.branch),
        )
        .where(Order.id == order_id)
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _assert_packing_available(db: Session, product_id: int, size_label: str) -> None:
    pp = db.execute(
        select(ProductPacking).where(
            ProductPacking.product_id == product_id,
            ProductPacking.size_label == size_label,
            ProductPacking.available.is_(True),
        )
    ).scalar_one_or_none()
    if not pp:
        raise HTTPException(
            status_code=400,
            detail=f"Packing not available: product {product_id} @ {size_label}",
        )


# --- customer draft/submit ---

def create_draft(
    db: Session,
    customer: User,
    items: list[ItemInput],
    customer_note: str | None,
) -> Order:
    if customer.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can create orders")
    order = Order(
        customer_id=customer.id,
        branch_id=customer.branch_id,
        status=OrderStatus.DRAFT,
        customer_note=customer_note,
    )
    db.add(order)
    db.flush()
    _apply_customer_items(db, order, items)
    _record_event(db, order, customer, OrderEventAction.CREATED)
    db.commit()
    return _load_order(db, order.id)


def _apply_customer_items(db: Session, order: Order, items: list[ItemInput]) -> None:
    db.query(OrderItem).filter(OrderItem.order_id == order.id).delete(synchronize_session=False)
    for it in items:
        if it.qty <= 0:
            continue
        _assert_packing_available(db, it.product_id, it.size_label)
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=it.product_id,
                size_label=it.size_label,
                customer_qty=it.qty,
                ho_qty=0,
            )
        )
    db.flush()


def update_customer_draft(
    db: Session,
    order_id: int,
    customer: User,
    items: list[ItemInput] | None,
    customer_note: str | None,
) -> Order:
    order = _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status != OrderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT orders can be edited by customer")
    if customer_note is not None:
        order.customer_note = customer_note
    if items is not None:
        _apply_customer_items(db, order, items)
    db.commit()
    return _load_order(db, order.id)


def submit_to_ho(db: Session, order_id: int, customer: User) -> Order:
    order = _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status != OrderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT orders can be submitted")
    if not order.items:
        raise HTTPException(status_code=400, detail="Order has no items")
    order.status = OrderStatus.SUBMITTED_TO_HO
    order.submitted_at = _now()
    _record_event(db, order, customer, OrderEventAction.CUSTOMER_SUBMITTED)
    notif.fan_out_submitted(db, order)
    db.commit()
    return _load_order(db, order.id)


# --- HO edit & forward ---

def ho_edit(
    db: Session,
    order_id: int,
    actor: User,
    items: list[ItemInput] | None,
    ho_note: str | None,
) -> Order:
    if actor.role != UserRole.HEAD_OFFICE:
        raise HTTPException(status_code=403, detail="Head office only")
    order = _load_order(db, order_id)
    if order.status not in (OrderStatus.SUBMITTED_TO_HO,):
        raise HTTPException(status_code=400, detail="Order not in SUBMITTED_TO_HO state")
    if ho_note is not None:
        order.ho_note = ho_note
    if items is not None:
        existing = {(i.product_id, i.size_label): i for i in order.items}
        incoming = {(it.product_id, it.size_label): it for it in items}
        for key, item in list(existing.items()):
            if key not in incoming:
                item.ho_qty = 0
        for key, it in incoming.items():
            if it.qty < 0:
                raise HTTPException(status_code=400, detail="Quantity cannot be negative")
            if key in existing:
                existing[key].ho_qty = it.qty
            else:
                _assert_packing_available(db, it.product_id, it.size_label)
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=it.product_id,
                        size_label=it.size_label,
                        customer_qty=0,
                        ho_qty=it.qty,
                    )
                )
        db.flush()
    _record_event(db, order, actor, OrderEventAction.HO_EDITED)
    db.commit()
    return _load_order(db, order.id)


def ho_forward(db: Session, order_id: int, actor: User) -> Order:
    if actor.role != UserRole.HEAD_OFFICE:
        raise HTTPException(status_code=403, detail="Head office only")
    order = _load_order(db, order_id)
    if order.status != OrderStatus.SUBMITTED_TO_HO:
        raise HTTPException(status_code=400, detail="Order not in SUBMITTED_TO_HO state")
    if not any(i.ho_qty > 0 for i in order.items):
        raise HTTPException(
            status_code=400,
            detail="Set at least one ho_qty > 0 before forwarding to factory",
        )
    order.status = OrderStatus.HO_FORWARDED
    order.ho_forwarded_at = _now()
    _record_event(db, order, actor, OrderEventAction.HO_FORWARDED)
    notif.fan_out_forwarded(db, order)
    db.commit()
    return _load_order(db, order.id)


def ho_reject(db: Session, order_id: int, actor: User, reason: str | None) -> Order:
    if actor.role != UserRole.HEAD_OFFICE:
        raise HTTPException(status_code=403, detail="Head office only")
    order = _load_order(db, order_id)
    if order.status != OrderStatus.SUBMITTED_TO_HO:
        raise HTTPException(status_code=400, detail="Only SUBMITTED_TO_HO orders can be rejected")
    order.status = OrderStatus.REJECTED
    order.ho_note = reason or order.ho_note
    _record_event(db, order, actor, OrderEventAction.HO_REJECTED, {"reason": reason})
    notif.fan_out_rejected(db, order)
    db.commit()
    return _load_order(db, order.id)


# --- Factory respond ---

def factory_respond(
    db: Session,
    order_id: int,
    actor: User,
    items: list[FactoryItemInput],
    factory_note: str | None,
) -> Order:
    if actor.role != UserRole.FACTORY:
        raise HTTPException(status_code=403, detail="Factory only")
    order = _load_order(db, order_id)
    if order.status != OrderStatus.HO_FORWARDED:
        raise HTTPException(status_code=400, detail="Order not in HO_FORWARDED state")

    by_key = {(i.product_id, i.size_label): i for i in order.items if i.ho_qty > 0}
    if not by_key:
        raise HTTPException(status_code=400, detail="No ho_qty>0 items to respond to")
    touched: set[tuple[int, str]] = set()
    for fi in items:
        key = (fi.product_id, fi.size_label)
        item = by_key.get(key)
        if not item:
            raise HTTPException(
                status_code=400,
                detail=f"Item not in HO-approved set: product {fi.product_id} @ {fi.size_label}",
            )
        item.factory_available = fi.available
        item.factory_item_note = fi.note
        touched.add(key)
    missing = [k for k in by_key if k not in touched]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Factory must respond to all HO-approved items; missing: {missing}",
        )

    order.factory_note = factory_note
    order.status = OrderStatus.FACTORY_RESPONDED
    order.factory_responded_at = _now()
    _record_event(db, order, actor, OrderEventAction.FACTORY_RESPONDED)
    order.status = OrderStatus.COMPLETED
    _record_event(db, order, actor, OrderEventAction.COMPLETED)
    notif.fan_out_factory_responded(db, order)
    db.commit()
    return _load_order(db, order.id)


# --- list / scope helpers ---

def scope_orders_query(user: User):
    q = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.packing_group),
        selectinload(Order.customer),
        selectinload(Order.branch),
    )
    if user.role == UserRole.CUSTOMER:
        q = q.where(Order.customer_id == user.id)
    elif user.role == UserRole.FACTORY:
        q = q.where(
            Order.status.in_(
                [OrderStatus.HO_FORWARDED, OrderStatus.FACTORY_RESPONDED, OrderStatus.COMPLETED]
            )
        )
    # HEAD_OFFICE sees all
    return q.order_by(Order.created_at.desc())


def can_view(order: Order, user: User) -> bool:
    if user.role == UserRole.HEAD_OFFICE:
        return True
    if user.role == UserRole.CUSTOMER:
        return order.customer_id == user.id
    if user.role == UserRole.FACTORY:
        return order.status in (
            OrderStatus.HO_FORWARDED,
            OrderStatus.FACTORY_RESPONDED,
            OrderStatus.COMPLETED,
        )
    return False
