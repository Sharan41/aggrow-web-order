from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.core.deps import require_role
from app.core.security import hash_password
from app.models import Branch, User, UserRole
from app.schemas.user import (
    BranchCreate,
    BranchRead,
    BranchUpdate,
    UserCreate,
    UserRead,
    UserUpdate,
)

router = APIRouter(tags=["users"])

ho_only = require_role(UserRole.HEAD_OFFICE)


# ---------- Branches ----------

@router.get("/branches", response_model=list[BranchRead])
def list_branches(db: Session = Depends(get_db), _: User = Depends(ho_only)) -> list[BranchRead]:
    rows = db.execute(select(Branch).order_by(Branch.name)).scalars().all()
    return [BranchRead.model_validate(r) for r in rows]


@router.post("/branches", response_model=BranchRead, status_code=status.HTTP_201_CREATED)
def create_branch(body: BranchCreate, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> BranchRead:
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
    _: User = Depends(ho_only),
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
def list_users(db: Session = Depends(get_db), _: User = Depends(ho_only)) -> list[UserRead]:
    rows = db.execute(
        select(User).options(selectinload(User.branch)).order_by(User.name)
    ).scalars().all()
    return [UserRead.model_validate(r) for r in rows]


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> UserRead:
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")
    if body.role == UserRole.CUSTOMER and body.branch_id is None:
        raise HTTPException(status_code=400, detail="Customer users must have a branch_id")
    if body.branch_id is not None and not db.get(Branch, body.branch_id):
        raise HTTPException(status_code=400, detail="Branch not found")
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
    _: User = Depends(ho_only),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_unset=True)
    
    # Handle email update - check uniqueness
    if "email" in data and data["email"]:
        existing = db.execute(select(User).where(User.email == data["email"], User.id != user_id)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
    
    # Handle password update
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    elif "password" in data:
        data.pop("password")
    
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)
