from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse
from app.services import RBACService, AuditService
from app.core.security import get_password_hash, get_current_user
from app.core.constants import UserRole

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/", response_model=UserResponse)
async def create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new user (admin only)"""
    if not RBACService.is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create users")

    existing = db.query(User).filter(User.email == user_create.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    db_user = User(
        email=user_create.email,
        password_hash=get_password_hash(user_create.password),
        role=user_create.role,
        full_name=user_create.full_name,
        branch=user_create.branch,
        active=True
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    AuditService.log_action(
        db, current_user.id, "user", db_user.id, "create",
        new_values={"email": db_user.email, "role": db_user.role, "branch": db_user.branch}
    )

    return UserResponse.from_orm(db_user)


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: str = None,
    active: bool = None,
    branch: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List users (admin only)"""
    if not RBACService.is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can list users")

    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if active is not None:
        query = query.filter(User.active == active)
    if branch:
        query = query.filter(User.branch == branch)

    users = query.offset(skip).limit(limit).all()
    return [UserResponse.from_orm(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_id != current_user.id and not RBACService.is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view other users")

    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user (admin or self)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_id != current_user.id and not RBACService.is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update other users")

    old_values = {
        "role": user.role,
        "active": user.active,
        "full_name": user.full_name,
        "branch": user.branch,
    }

    if user_update.role is not None:
        if not RBACService.is_admin(current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change roles")
        user.role = user_update.role

    if user_update.active is not None:
        if not RBACService.is_admin(current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can activate/deactivate")
        user.active = user_update.active

    if user_update.full_name is not None:
        user.full_name = user_update.full_name

    if user_update.branch is not None:
        if not RBACService.is_admin(current_user) and user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change branch")
        user.branch = user_update.branch

    db.commit()
    db.refresh(user)

    new_values = {
        "role": user.role,
        "active": user.active,
        "full_name": user.full_name,
        "branch": user.branch,
    }
    AuditService.log_action(
        db, current_user.id, "user", user.id, "update",
        old_values=old_values, new_values=new_values
    )

    return UserResponse.from_orm(user)


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: UUID,
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only change own password")

    from app.core.security import verify_password
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    user.password_hash = get_password_hash(new_password)
    db.commit()

    AuditService.log_action(
        db, current_user.id, "user", user.id, "update",
        comment="Password changed"
    )

    return {"message": "Password changed successfully"}


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate user (admin only)"""
    if not RBACService.is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can deactivate users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.active = False
    db.commit()

    AuditService.log_action(
        db, current_user.id, "user", user.id, "delete",
        comment="User deactivated"
    )

    return {"message": "User deactivated"}
