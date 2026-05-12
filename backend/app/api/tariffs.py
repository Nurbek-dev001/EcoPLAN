from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import date

from app.database import get_db
from app.models import Tariff, User
from app.schemas import TariffCreate, TariffUpdate, TariffResponse, TariffListResponse
from app.services import TariffService, AuditService, RBACService
from app.core.security import get_current_user

router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])


@router.post("/", response_model=TariffResponse)
async def create_tariff(
    tariff: TariffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tariff"""
    if not RBACService.can_manage_tariffs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    try:
        db_tariff = TariffService.create_tariff(db, tariff, current_user.id)
        return TariffResponse.from_orm(db_tariff)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[TariffListResponse])
async def list_tariffs(
    region: str = None,
    category: str = None,
    valid_date: date = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tariffs with optional filtering"""
    query = db.query(Tariff)

    if region:
        query = query.filter(Tariff.region == region)
    if category:
        query = query.filter(Tariff.category == category)
    if valid_date:
        query = query.filter(
            Tariff.valid_from <= valid_date,
            (Tariff.valid_to.is_(None)) | (Tariff.valid_to >= valid_date)
        )

    tariffs = query.offset(skip).limit(limit).all()
    return [TariffListResponse.from_orm(tariff) for tariff in tariffs]


@router.get("/{tariff_id}", response_model=TariffResponse)
async def get_tariff(
    tariff_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific tariff"""
    tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")

    return TariffResponse.from_orm(tariff)


@router.get("/{tariff_id}/history", response_model=List[TariffResponse])
async def get_tariff_history(
    tariff_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tariff history/versions"""
    if not RBACService.can_manage_tariffs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    history = TariffService.get_tariff_history(db, tariff_id)
    return [TariffResponse.from_orm(tariff) for tariff in history]


@router.put("/{tariff_id}", response_model=TariffResponse)
async def update_tariff(
    tariff_id: UUID,
    tariff_update: TariffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a tariff (creates new version)"""
    if not RBACService.can_manage_tariffs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")

    # Store old values
    old_values = {
        "value": tariff.value,
        "valid_to": tariff.valid_to,
    }

    # Update tariff
    if tariff_update.value is not None:
        tariff.value = tariff_update.value
    if tariff_update.valid_to is not None:
        tariff.valid_to = tariff_update.valid_to

    tariff.updated_at = date.today()
    tariff.updated_by = current_user.id

    db.commit()
    db.refresh(tariff)

    # Log audit
    new_values = {
        "value": tariff.value,
        "valid_to": tariff.valid_to,
    }
    AuditService.log_action(
        db, current_user.id, "tariff", tariff.id, "update",
        old_values=old_values, new_values=new_values
    )

    return TariffResponse.from_orm(tariff)


@router.post("/bulk-import")
async def bulk_import_tariffs(
    tariffs: List[TariffCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk import tariffs"""
    if not RBACService.can_manage_tariffs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    try:
        count = TariffService.bulk_import_tariffs(db, tariffs, current_user.id)
        return {"message": f"Imported {count} tariffs successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))