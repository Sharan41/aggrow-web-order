from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole
from app.schemas.common import FlexibleEmail


class BranchBase(BaseModel):
    name: str
    code: str
    address: str | None = None


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None


class BranchRead(BranchBase):
    id: int

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: FlexibleEmail
    password: str = Field(min_length=6)
    name: str
    role: UserRole
    branch_id: int | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    branch_id: int | None = None
    active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class UserRead(BaseModel):
    id: int
    email: FlexibleEmail
    name: str
    role: UserRole
    branch_id: int | None = None
    branch: BranchRead | None = None
    active: bool

    model_config = ConfigDict(from_attributes=True)
