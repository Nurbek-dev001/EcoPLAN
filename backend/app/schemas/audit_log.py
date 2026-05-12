from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    comment: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogListRequest(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    action: Optional[str] = None
    limit: int = 100
    offset: int = 0


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    limit: int
    offset: int
