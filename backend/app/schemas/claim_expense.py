from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class ClaimExpenseCreate(BaseModel):
    bin: str
    company_name: str
    city: str
    judge_name: Optional[str] = None
    duty_amount: float = 0
    penalty_amount: float = 0
    attorney_fee: float = 0
    description: Optional[str] = None


class ClaimExpenseUpdate(BaseModel):
    bin: Optional[str] = None
    company_name: Optional[str] = None
    city: Optional[str] = None
    judge_name: Optional[str] = None
    duty_amount: Optional[float] = None
    penalty_amount: Optional[float] = None
    attorney_fee: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ClaimExpenseResponse(BaseModel):
    id: UUID
    bin: str
    company_name: str
    city: str
    judge_name: Optional[str] = None
    duty_amount: float
    penalty_amount: float
    attorney_fee: float
    total_amount: float
    status: str
    description: Optional[str] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClaimExpenseListResponse(BaseModel):
    claims: list[ClaimExpenseResponse]
    total: int
    limit: int
    offset: int
