from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, List, Any

from app.database import get_db
from app.models import User, Calculation, AuditLog
from app.services import RBACService
from app.core.constants import CalculationStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get dashboard KPIs and summary"""

    # Total calculations
    total_calcs = db.query(Calculation).count()

    # By status
    draft_count = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.DRAFT.value
    ).count()

    submitted_count = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.SUBMITTED.value
    ).count()

    approved_count = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.APPROVED.value
    ).count()

    rejected_count = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.REJECTED.value
    ).count()

    # Pending approvals (for checkers/directors)
    pending = 0
    if RBACService.can_approve_calculations(current_user):
        pending = submitted_count

    # Total users
    total_users = db.query(User).filter(User.active == True).count()

    # Recent activity (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_activities = db.query(AuditLog).filter(
        AuditLog.timestamp >= week_ago
    ).count()

    return {
        "total_calculations": total_calcs,
        "by_status": {
            "draft": draft_count,
            "submitted": submitted_count,
            "approved": approved_count,
            "rejected": rejected_count
        },
        "pending_approvals": pending,
        "active_users": total_users,
        "recent_activities_7days": recent_activities,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/recent-calculations")
async def get_recent_calculations(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> List[Dict[str, Any]]:
    """Get recent calculations"""
    calculations = db.query(Calculation).order_by(
        Calculation.updated_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": str(calc.id),
            "train_number": calc.train_number,
            "status": calc.status,
            "created_at": calc.created_at.isoformat() if calc.created_at else None,
            "updated_at": calc.updated_at.isoformat() if calc.updated_at else None,
        }
        for calc in calculations
    ]


@router.get("/pending-approvals")
async def get_pending_approvals(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> List[Dict[str, Any]]:
    """Get pending approvals (for checkers/directors)"""
    if not RBACService.can_approve_calculations(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.SUBMITTED.value
    ).order_by(Calculation.submitted_at.desc()).limit(limit).all()

    return [
        {
            "id": str(calc.id),
            "train_number": calc.train_number,
            "submitted_at": calc.submitted_at.isoformat() if calc.submitted_at else None,
            "submitted_by": str(calc.submitted_by) if calc.submitted_by else None,
        }
        for calc in calculations
    ]


@router.get("/alerts")
async def get_system_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> List[Dict[str, Any]]:
    """Get system alerts and anomalies"""
    # Get calculations with anomalies
    calculations = db.query(Calculation).filter(
        Calculation.anomalies != None
    ).order_by(Calculation.updated_at.desc()).limit(20).all()

    alerts = []
    for calc in calculations:
        if calc.anomalies:
            for anomaly in calc.anomalies:
                alerts.append({
                    "id": str(calc.id),
                    "train_number": calc.train_number,
                    "type": anomaly.get("type", "warning"),
                    "message": anomaly.get("message", "Unknown issue"),
                    "timestamp": calc.updated_at.isoformat() if calc.updated_at else None,
                })

    return alerts[:10]  # Return top 10 alerts


@router.get("/statistics")
async def get_statistics(
    period_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get statistics for the period"""
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=period_days)

    # Calculations created in period
    created_period = db.query(Calculation).filter(
        Calculation.created_at >= start_date
    ).count()

    # Approved in period
    approved_period = db.query(Calculation).filter(
        Calculation.approved_at >= start_date
    ).count()

    # Rejected in period
    rejected_period = db.query(Calculation).filter(
        Calculation.rejected_at >= start_date
    ).count()

    # Audit logs
    audit_logs_period = db.query(AuditLog).filter(
        AuditLog.timestamp >= start_date
    ).count()

    return {
        "period_days": period_days,
        "calculations_created": created_period,
        "calculations_approved": approved_period,
        "calculations_rejected": rejected_period,
        "audit_logs": audit_logs_period,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
    }
