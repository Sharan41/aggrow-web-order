from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole
from app.schemas.common import FlexibleEmail


class LoginRequest(BaseModel):
    email: FlexibleEmail
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: FlexibleEmail
    name: str
    role: UserRole
    branch_id: int | None = None
    active: bool

    model_config = ConfigDict(from_attributes=True)
