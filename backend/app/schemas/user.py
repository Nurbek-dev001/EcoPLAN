from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID
from app.core.constants import KTZ_BRANCHES


class UserBase(BaseModel):
    email: str
    role: str
    full_name: Optional[str] = None
    branch: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None
    full_name: Optional[str] = None
    branch: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class CurrentUser(BaseModel):
    id: UUID
    email: str
    role: str
    full_name: Optional[str] = None
    branch: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True
