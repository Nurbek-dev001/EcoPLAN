from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID


class CalculationCreate(BaseModel):
    train_number: str
    branch: Optional[str] = None
    train_info: Optional[Dict[str, Any]] = None
    wagon_types: Optional[Dict[str, Any]] = None
    occupancy: Optional[float] = None
    route_type: Optional[str] = None
    train_type: Optional[str] = None
    revenue: Optional[Dict[str, Any]] = None
    expenses: Optional[List[Dict[str, Any]]] = None
    anomaly_explanation: Optional[str] = None


class CalculationUpdate(BaseModel):
    wagon_types: Optional[Dict[str, Any]] = None
    occupancy: Optional[float] = None
    revenue: Optional[Dict[str, Any]] = None
    expenses: Optional[List[Dict[str, Any]]] = None
    anomaly_explanation: Optional[str] = None


class CalculationResponse(BaseModel):
    id: UUID
    train_number: str
    branch: Optional[str] = None
    status: str
    train_info: Optional[Dict[str, Any]] = None
    wagon_types: Optional[Dict[str, Any]] = None
    occupancy: Optional[float] = None
    revenue: Optional[Dict[str, Any]] = None
    expenses: Optional[List[Dict[str, Any]]] = None
    financial_result: Optional[Dict[str, Any]] = None
    anomalies: Optional[List[Dict[str, Any]]] = None
    anomaly_explanation: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    submitted_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[UUID] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class CalculationListResponse(BaseModel):
    id: UUID
    train_number: str
    branch: Optional[str] = None
    status: str
    financial_result: Optional[Dict[str, Any]] = None
    created_at: datetime
    submitted_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class CalculationApproveRequest(BaseModel):
    comment: Optional[str] = None


class CalculationRejectRequest(BaseModel):
    reason: str
    comment: Optional[str] = None
