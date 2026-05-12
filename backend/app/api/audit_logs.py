from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import AuditLogResponse, AuditLogListRequest, AuditLogListResponse
from app.services import AuditService, RBACService
from app.core.security import get_current_user

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=AuditLogListResponse)
async def list_audit_logs(
    request: AuditLogListRequest = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List audit logs with filtering"""
    if not RBACService.can_view_audit_logs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    logs, total = AuditService.get_audit_logs(
        db=db,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        limit=request.limit,
        offset=request.offset
    )

    return AuditLogListResponse(
        logs=[AuditLogResponse.from_orm(log) for log in logs],
        total=total,
        limit=request.limit,
        offset=request.offset
    )