from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class TrainBase(BaseModel):
    number: str
    route: str
    from_station: str
    to_station: str
    distance_km: Optional[int] = None
    duration_hours: Optional[int] = None
    schedule_data: Optional[Dict[str, Any]] = None


class TrainCreate(TrainBase):
    pass


class TrainUpdate(BaseModel):
    route: Optional[str] = None
    from_station: Optional[str] = None
    to_station: Optional[str] = None
    distance_km: Optional[int] = None
    duration_hours: Optional[int] = None
    schedule_data: Optional[Dict[str, Any]] = None


class TrainResponse(TrainBase):
    id: UUID
    cached_from_passflow: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrainListResponse(BaseModel):
    id: UUID
    number: str
    route: str
    from_station: str
    to_station: str
    distance_km: Optional[int] = None
    duration_hours: Optional[int] = None

    class Config:
        from_attributes = True