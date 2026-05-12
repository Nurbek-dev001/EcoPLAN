from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from uuid import UUID


class TariffCreate(BaseModel):
    name: str
    region: str
    category: str
    value: float
    unit: Optional[str] = None
    valid_from: date


class TariffUpdate(BaseModel):
    value: Optional[float] = None
    valid_to: Optional[date] = None


class TariffResponse(BaseModel):
    id: UUID
    name: str
    region: str
    category: str
    value: float
    unit: Optional[str] = None
    valid_from: date
    valid_to: Optional[date] = None
    created_at: datetime
    created_by: UUID
    updated_at: datetime
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class TariffListResponse(BaseModel):
    id: UUID
    name: str
    region: str
    category: str
    value: float
    unit: Optional[str] = None
    valid_from: date
    valid_to: Optional[date] = None

    class Config:
        from_attributes = True


class TariffBulkImportRequest(BaseModel):
    tariffs: list[TariffCreate]
