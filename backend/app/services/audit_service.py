from sqlalchemy.orm import Session
from uuid import UUID
from typing import Dict, Any, List
from datetime import datetime
from app.models import AuditLog, User
from app.core.constants import AuditAction, AuditEntityType


class AuditService:
    """Service for immutable audit logging"""

    @staticmethod
    def log_action(
        db: Session,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        action: str,
        old_values: Dict[str, Any] = None,
        new_values: Dict[str, Any] = None,
        comment: str = None
    ) -> AuditLog:
        """Create immutable audit log entry"""
        log = AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            old_values=old_values,
            new_values=new_values,
            comment=comment,
            timestamp=datetime.utcnow()
        )

        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_audit_logs(
        db: Session,
        entity_type: str = None,
        entity_id: UUID = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[AuditLog], int]:
        """Get audit logs with filtering"""
        query = db.query(AuditLog)

        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)

        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)

        total = query.count()
        logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

        return logs, total

    @staticmethod
    def log_calculation_created(
        db: Session,
        user_id: UUID,
        calculation_id: UUID,
        new_values: Dict[str, Any]
    ) -> AuditLog:
        """Log calculation creation"""
        return AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_type=AuditEntityType.CALCULATION.value,
            entity_id=calculation_id,
            action=AuditAction.CREATE.value,
            new_values=new_values
        )

    @staticmethod
    def log_calculation_submitted(
        db: Session,
        user_id: UUID,
        calculation_id: UUID
    ) -> AuditLog:
        """Log calculation submission"""
        return AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_type=AuditEntityType.CALCULATION.value,
            entity_id=calculation_id,
            action=AuditAction.SUBMIT.value
        )

    @staticmethod
    def log_calculation_approved(
        db: Session,
        user_id: UUID,
        calculation_id: UUID,
        comment: str = None
    ) -> AuditLog:
        """Log calculation approval"""
        return AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_type=AuditEntityType.CALCULATION.value,
            entity_id=calculation_id,
            action=AuditAction.APPROVE.value,
            comment=comment
        )

    @staticmethod
    def log_calculation_rejected(
        db: Session,
        user_id: UUID,
        calculation_id: UUID,
        reason: str = None
    ) -> AuditLog:
        """Log calculation rejection"""
        return AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_type=AuditEntityType.CALCULATION.value,
            entity_id=calculation_id,
            action=AuditAction.REJECT.value,
            comment=reason
        )
