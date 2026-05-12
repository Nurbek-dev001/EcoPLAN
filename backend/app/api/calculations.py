from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import Calculation, User
from app.schemas import (
    CalculationCreate, CalculationUpdate, CalculationResponse, CalculationListResponse
)
from app.services import CalculationService, AuditService, RBACService
from app.core.security import get_current_user
from app.core.constants import CalculationStatus

router = APIRouter(prefix="/api/calculations", tags=["calculations"])


@router.post("/", response_model=CalculationResponse)
async def create_calculation(
    calculation: CalculationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new calculation"""
    if not RBACService.can_calculate(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    # Manager can only create calculations for their own branch
    branch = calculation.branch or current_user.branch
    if current_user.role == "manager" and branch != current_user.branch:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only create calculations for your own branch")

    db_calculation = Calculation(
        user_id=current_user.id,
        train_number=calculation.train_number,
        branch=branch,
        train_info=calculation.train_info,
        wagon_types=calculation.wagon_types,
        occupancy=calculation.occupancy,
        route_type=calculation.route_type,
        train_type=calculation.train_type,
        revenue=calculation.revenue,
        expenses=calculation.expenses,
        anomaly_explanation=calculation.anomaly_explanation,
    )

    db.add(db_calculation)
    db.commit()
    db.refresh(db_calculation)

    AuditService.log_calculation_created(db, current_user.id, db_calculation.id, calculation.dict())

    return CalculationResponse.from_orm(db_calculation)


@router.get("/", response_model=List[CalculationListResponse])
async def list_calculations(
    skip: int = 0,
    limit: int = 100,
    branch: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List calculations with branch-based RBAC"""
    query = db.query(Calculation)

    # Branch-based filtering
    if current_user.role == "manager":
        # Manager sees only their own calculations in their branch
        query = query.filter(Calculation.user_id == current_user.id)
        if current_user.branch:
            query = query.filter(Calculation.branch == current_user.branch)
    elif current_user.role in ["analyst", "director", "checker"]:
        # Analysts/directors/checkers can see all but filter by branch if requested
        if branch:
            query = query.filter(Calculation.branch == branch)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = query.offset(skip).limit(limit).all()
    return [CalculationListResponse.from_orm(calc) for calc in calculations]


@router.get("/{calculation_id}", response_model=CalculationResponse)
async def get_calculation(
    calculation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific calculation"""
    calculation = db.query(Calculation).filter(Calculation.id == calculation_id).first()
    if not calculation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    # Check permissions with branch RBAC
    if current_user.role == "manager":
        if calculation.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only view own calculations")
        if current_user.branch and calculation.branch != current_user.branch:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Calculation belongs to another branch")
    elif not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return CalculationResponse.from_orm(calculation)


@router.put("/{calculation_id}", response_model=CalculationResponse)
async def update_calculation(
    calculation_id: UUID,
    calculation_update: CalculationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a calculation"""
    calculation = db.query(Calculation).filter(Calculation.id == calculation_id).first()
    if not calculation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    # Check permissions with branch RBAC
    if current_user.role == "manager":
        if calculation.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only edit own calculations")
        if current_user.branch and calculation.branch != current_user.branch:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Calculation belongs to another branch")
    elif not RBACService.can_edit_calculations(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    old_values = {
        "wagon_types": calculation.wagon_types,
        "occupancy": calculation.occupancy,
        "revenue": calculation.revenue,
        "expenses": calculation.expenses,
        "anomaly_explanation": calculation.anomaly_explanation,
    }

    for field, value in calculation_update.dict(exclude_unset=True).items():
        setattr(calculation, field, value)

    calculation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(calculation)

    new_values = {
        "wagon_types": calculation.wagon_types,
        "occupancy": calculation.occupancy,
        "revenue": calculation.revenue,
        "expenses": calculation.expenses,
        "anomaly_explanation": calculation.anomaly_explanation,
    }
    AuditService.log_action(
        db, current_user.id, "calculation", calculation.id, "update",
        old_values=old_values, new_values=new_values
    )

    return CalculationResponse.from_orm(calculation)


@router.post("/{calculation_id}/submit")
async def submit_calculation(
    calculation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit calculation for approval"""
    calculation = db.query(Calculation).filter(Calculation.id == calculation_id).first()
    if not calculation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    if calculation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only submit own calculations")

    if calculation.status != CalculationStatus.DRAFT.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Calculation already submitted")

    calculation.status = CalculationStatus.SUBMITTED.value
    calculation.submitted_at = datetime.utcnow()
    calculation.submitted_by = current_user.id

    db.commit()

    AuditService.log_calculation_submitted(db, current_user.id, calculation.id)

    return {"message": "Calculation submitted for approval"}


@router.post("/{calculation_id}/approve")
async def approve_calculation(
    calculation_id: UUID,
    comment: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a calculation"""
    if not RBACService.can_approve_calculations(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculation = db.query(Calculation).filter(Calculation.id == calculation_id).first()
    if not calculation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    if calculation.status != CalculationStatus.SUBMITTED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Calculation not submitted")

    calculation.status = CalculationStatus.APPROVED.value
    calculation.approved_at = datetime.utcnow()
    calculation.approved_by = current_user.id

    db.commit()

    AuditService.log_calculation_approved(db, current_user.id, calculation.id, comment)

    return {"message": "Calculation approved"}


@router.post("/{calculation_id}/reject")
async def reject_calculation(
    calculation_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a calculation"""
    if not RBACService.can_approve_calculations(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculation = db.query(Calculation).filter(Calculation.id == calculation_id).first()
    if not calculation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    if calculation.status != CalculationStatus.SUBMITTED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Calculation not submitted")

    calculation.status = CalculationStatus.REJECTED.value
    calculation.rejected_at = datetime.utcnow()
    calculation.rejected_by = current_user.id
    calculation.rejection_reason = reason

    db.commit()

    AuditService.log_action(
        db, current_user.id, "calculation", calculation.id, "reject",
        comment=reason
    )

    return {"message": "Calculation rejected"}
