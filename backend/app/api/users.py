from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.core.deps import require_role
from app.core.security import hash_password
from app.models import Branch, Notification, Order, OrderEvent, User, UserRole
from app.schemas.user import (
    BranchCreate,
    BranchRead,
    BranchUpdate,
    UserCreate,
    UserRead,
    UserUpdate,
)

router = APIRouter(tags=["users"])

admin_only = require_role(UserRole.ADMIN)


# ---------- Branches ----------

@router.get("/branches", response_model=list[BranchRead])
def list_branches(db: Session = Depends(get_db), _: User = Depends(admin_only)) -> list[BranchRead]:
    rows = db.execute(select(Branch).order_by(Branch.name)).scalars().all()
    return [BranchRead.model_validate(r) for r in rows]


@router.post("/branches", response_model=BranchRead, status_code=status.HTTP_201_CREATED)
def create_branch(body: BranchCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)) -> BranchRead:
    if db.execute(select(Branch).where(Branch.code == body.code)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Branch code already exists")
    branch = Branch(**body.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return BranchRead.model_validate(branch)


@router.patch("/branches/{branch_id}", response_model=BranchRead)
def update_branch(
    branch_id: int,
    body: BranchUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> BranchRead:
    branch = db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(branch, k, v)
    db.commit()
    db.refresh(branch)
    return BranchRead.model_validate(branch)


# ---------- Users ----------

@router.get("/users", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(admin_only)) -> list[UserRead]:
    rows = db.execute(
        select(User).options(selectinload(User.branch)).order_by(User.name)
    ).scalars().all()
    return [UserRead.model_validate(r) for r in rows]


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)) -> UserRead:
    if body.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin users cannot be created via API. Use bootstrap_admin.",
        )
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")
    if body.branch_id is not None and not db.get(Branch, body.branch_id):
        raise HTTPException(status_code=400, detail="Location not found")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        mobile_number=body.mobile_number,
        role=body.role,
        branch_id=body.branch_id,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_unset=True)

    if data.get("role") == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin role cannot be assigned via API. Use bootstrap_admin.",
        )

    if "email" in data and data["email"]:
        existing = db.execute(select(User).where(User.email == data["email"], User.id != user_id)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")

    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    elif "password" in data:
        data.pop("password")

    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(admin_only),
) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin users cannot be deleted")

    # Orders reference the customer with RESTRICT — refuse rather than orphan them.
    has_orders = db.execute(
        select(Order.id).where(Order.customer_id == user_id).limit(1)
    ).first()
    if has_orders:
        raise HTTPException(
            status_code=409,
            detail="This user has existing orders and cannot be deleted. Deactivate the user instead.",
        )

    # Clear remaining references explicitly so behaviour is identical on SQLite
    # (no FK enforcement) and Postgres (SET NULL / CASCADE).
    db.execute(update(Order).where(Order.ho_reviewer_id == user_id).values(ho_reviewer_id=None))
    db.execute(update(Order).where(Order.admin_reviewer_id == user_id).values(admin_reviewer_id=None))
    db.execute(update(OrderEvent).where(OrderEvent.actor_user_id == user_id).values(actor_user_id=None))
    db.execute(delete(Notification).where(Notification.user_id == user_id))
    db.delete(user)
    db.commit()
    return None
