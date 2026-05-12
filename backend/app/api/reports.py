from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from datetime import datetime
from io import BytesIO
import json

from app.database import get_db
from app.models import User, Calculation
from app.services import RBACService
from app.core.constants import CalculationStatus

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/financial-summary")
async def get_financial_summary(
    start_date: datetime = None,
    end_date: datetime = None,
    route_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get financial summary report"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = db.query(Calculation).filter(Calculation.status == CalculationStatus.APPROVED.value)

    if start_date:
        query = query.filter(Calculation.created_at >= start_date)
    if end_date:
        query = query.filter(Calculation.created_at <= end_date)
    if route_type:
        query = query.filter(Calculation.route_type == route_type)

    calculations = query.all()

    # Aggregate financial data
    total_revenue = 0
    total_expenses = 0
    total_profit = 0
    by_route_type = {}

    for calc in calculations:
        if calc.financial_result:
            if isinstance(calc.financial_result, dict):
                revenue = calc.financial_result.get("revenue", 0)
                expenses = calc.financial_result.get("expenses", 0)
                profit = revenue - expenses
            else:
                revenue = expenses = profit = 0

            total_revenue += revenue
            total_expenses += expenses
            total_profit += profit

            route = calc.route_type or "unknown"
            if route not in by_route_type:
                by_route_type[route] = {"revenue": 0, "expenses": 0}
            by_route_type[route]["revenue"] += revenue
            by_route_type[route]["expenses"] += expenses

    return {
        "period": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        },
        "summary": {
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "total_profit": float(total_profit),
            "profit_margin": (total_profit / total_revenue * 100) if total_revenue > 0 else 0,
        },
        "by_route_type": {k: {"revenue": float(v["revenue"]), "expenses": float(v["expenses"])} for k, v in by_route_type.items()},
        "calculations_count": len(calculations),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/anomalies")
async def get_anomalies_report(
    severity: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> List[Dict[str, Any]]:
    """Get anomalies report"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(Calculation.anomalies != None).limit(limit).all()

    anomalies = []
    for calc in calculations:
        if calc.anomalies:
            for anomaly in calc.anomalies:
                if severity and anomaly.get("type") != severity:
                    continue
                anomalies.append({
                    "calculation_id": str(calc.id),
                    "train_number": calc.train_number,
                    "anomaly": anomaly,
                    "detected_at": calc.updated_at.isoformat() if calc.updated_at else None,
                })

    return anomalies


@router.get("/calculations-export")
async def get_calculations_export(
    format: str = "json",
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Export calculations data"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = db.query(Calculation)
    if status_filter:
        query = query.filter(Calculation.status == status_filter)

    calculations = query.all()

    data = []
    for calc in calculations:
        data.append({
            "id": str(calc.id),
            "train_number": calc.train_number,
            "status": calc.status,
            "route_type": calc.route_type,
            "train_type": calc.train_type,
            "occupancy": float(calc.occupancy) if calc.occupancy else None,
            "revenue": calc.revenue,
            "expenses": calc.expenses,
            "financial_result": calc.financial_result,
            "created_at": calc.created_at.isoformat() if calc.created_at else None,
            "approved_at": calc.approved_at.isoformat() if calc.approved_at else None,
        })

    if format == "json":
        return {
            "format": "json",
            "count": len(data),
            "data": data,
            "generated_at": datetime.utcnow().isoformat(),
        }
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported format")


@router.get("/cost-analysis")
async def get_cost_analysis(
    group_by: str = "route_type",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get cost analysis by different grouping"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(Calculation.status == CalculationStatus.APPROVED.value).all()

    analysis = {}

    for calc in calculations:
        if group_by == "route_type":
            key = calc.route_type or "unknown"
        elif group_by == "train_type":
            key = calc.train_type or "unknown"
        else:
            key = "all"

        if key not in analysis:
            analysis[key] = {
                "count": 0,
                "total_revenue": 0,
                "total_expenses": 0,
                "avg_occupancy": 0,
            }

        analysis[key]["count"] += 1

        if calc.financial_result and isinstance(calc.financial_result, dict):
            analysis[key]["total_revenue"] += calc.financial_result.get("revenue", 0)
            analysis[key]["total_expenses"] += calc.financial_result.get("expenses", 0)

        if calc.occupancy:
            analysis[key]["avg_occupancy"] += float(calc.occupancy)

    # Calculate averages
    for key in analysis:
        if analysis[key]["count"] > 0:
            analysis[key]["avg_occupancy"] /= analysis[key]["count"]

    return {
        "group_by": group_by,
        "analysis": analysis,
        "generated_at": datetime.utcnow().isoformat(),
    }
