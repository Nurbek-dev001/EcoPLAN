from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import ClaimExpense, User
from app.schemas import (
    ClaimExpenseCreate, ClaimExpenseUpdate, ClaimExpenseResponse, ClaimExpenseListResponse
)
from app.services import AuditService, RBACService
from app.core.security import get_current_user

router = APIRouter(prefix="/api/claims", tags=["claim-expenses"])


@router.post("/", response_model=ClaimExpenseResponse)
async def create_claim(
    claim: ClaimExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new claim expense"""
    if not RBACService.can_edit_calculations(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    total = claim.duty_amount + claim.penalty_amount + claim.attorney_fee

    db_claim = ClaimExpense(
        bin=claim.bin,
        company_name=claim.company_name,
        city=claim.city,
        judge_name=claim.judge_name,
        duty_amount=claim.duty_amount,
        penalty_amount=claim.penalty_amount,
        attorney_fee=claim.attorney_fee,
        total_amount=total,
        description=claim.description,
        created_by=current_user.id,
    )

    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)

    AuditService.log_action(
        db, current_user.id, "claim_expense", db_claim.id, "create",
        new_values={
            "bin": claim.bin,
            "company_name": claim.company_name,
            "city": claim.city,
            "total_amount": float(total),
        }
    )

    return ClaimExpenseResponse.from_orm(db_claim)


@router.get("/", response_model=ClaimExpenseListResponse)
async def list_claims(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    bin: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List claim expenses"""
    query = db.query(ClaimExpense)

    if status:
        query = query.filter(ClaimExpense.status == status)
    if bin:
        query = query.filter(ClaimExpense.bin == bin)

    # Managers see only their own claims
    if current_user.role == "manager":
        query = query.filter(ClaimExpense.created_by == current_user.id)

    total = query.count()
    claims = query.offset(skip).limit(limit).all()

    return ClaimExpenseListResponse(
        claims=[ClaimExpenseResponse.from_orm(c) for c in claims],
        total=total,
        limit=limit,
        offset=skip,
    )


@router.get("/{claim_id}", response_model=ClaimExpenseResponse)
async def get_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific claim expense"""
    claim = db.query(ClaimExpense).filter(ClaimExpense.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    if current_user.role == "manager" and claim.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only view own claims")

    return ClaimExpenseResponse.from_orm(claim)


@router.put("/{claim_id}", response_model=ClaimExpenseResponse)
async def update_claim(
    claim_id: UUID,
    claim_update: ClaimExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a claim expense"""
    claim = db.query(ClaimExpense).filter(ClaimExpense.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    if current_user.role == "manager" and claim.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only edit own claims")

    old_values = {
        "bin": claim.bin,
        "company_name": claim.company_name,
        "city": claim.city,
        "status": claim.status,
        "duty_amount": float(claim.duty_amount),
        "penalty_amount": float(claim.penalty_amount),
        "attorney_fee": float(claim.attorney_fee),
    }

    for field, value in claim_update.dict(exclude_unset=True).items():
        setattr(claim, field, value)

    # Recalculate total
    claim.total_amount = claim.duty_amount + claim.penalty_amount + claim.attorney_fee
    claim.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(claim)

    new_values = {
        "bin": claim.bin,
        "company_name": claim.company_name,
        "city": claim.city,
        "status": claim.status,
        "duty_amount": float(claim.duty_amount),
        "penalty_amount": float(claim.penalty_amount),
        "attorney_fee": float(claim.attorney_fee),
        "total_amount": float(claim.total_amount),
    }
    AuditService.log_action(
        db, current_user.id, "claim_expense", claim.id, "update",
        old_values=old_values, new_values=new_values
    )

    return ClaimExpenseResponse.from_orm(claim)
