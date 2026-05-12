from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserResponse, TokenResponse
from datetime import datetime
from uuid import UUID
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint - returns demo access token (auth disabled)"""
    demo_user = UserResponse(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        email="demo@ecoplan.kz",
        role="director",
        active=True,
        created_at=datetime(2024, 1, 1)
    )
    access_token = create_access_token(data={"sub": "demo-user", "role": "director"})

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=demo_user
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(db: Session = Depends(get_db)):
    """Refresh access token endpoint"""
    access_token = create_access_token(data={"sub": "demo-user", "role": "director"})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        email="demo@ecoplan.kz",
        role="director",
        active=True,
        created_at=datetime(2024, 1, 1)
    )
