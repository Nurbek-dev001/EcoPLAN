from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from datetime import datetime, timedelta
from collections import defaultdict

from app.database import get_db
from app.models import User, Calculation
from app.services import RBACService
from app.core.constants import CalculationStatus

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/cost-trends")
async def get_cost_trends(
    period_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get cost trends over time"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    start_date = datetime.utcnow() - timedelta(days=period_days)

    calculations = db.query(Calculation).filter(
        Calculation.created_at >= start_date,
        Calculation.status == CalculationStatus.APPROVED.value
    ).all()

    # Group by date
    trends = defaultdict(lambda: {"revenue": 0, "expenses": 0, "count": 0})

    for calc in calculations:
        if calc.created_at:
            date_key = calc.created_at.strftime("%Y-%m-%d")
            if calc.financial_result and isinstance(calc.financial_result, dict):
                trends[date_key]["revenue"] += calc.financial_result.get("revenue", 0)
                trends[date_key]["expenses"] += calc.financial_result.get("expenses", 0)
            trends[date_key]["count"] += 1

    # Convert to sorted list
    sorted_trends = sorted(trends.items())

    return {
        "period_days": period_days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "trends": [
            {
                "date": date,
                "revenue": float(data["revenue"]),
                "expenses": float(data["expenses"]),
                "profit": float(data["revenue"] - data["expenses"]),
                "count": data["count"],
            }
            for date, data in sorted_trends
        ],
    }


@router.get("/cost-per-wagon")
async def get_cost_per_wagon(
    group_by: str = "train_type",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get cost per wagon analysis"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.APPROVED.value
    ).all()

    analysis = defaultdict(lambda: {"total_cost": 0, "total_wagons": 0, "count": 0})

    for calc in calculations:
        if group_by == "train_type":
            key = calc.train_type or "unknown"
        elif group_by == "route_type":
            key = calc.route_type or "unknown"
        else:
            key = "all"

        if calc.financial_result and isinstance(calc.financial_result, dict):
            total_cost = calc.financial_result.get("expenses", 0)
            analysis[key]["total_cost"] += total_cost

        if calc.wagon_types and isinstance(calc.wagon_types, dict):
            wagon_count = sum(calc.wagon_types.values()) if isinstance(calc.wagon_types, dict) else 0
            analysis[key]["total_wagons"] += wagon_count

        analysis[key]["count"] += 1

    result = {}
    for key, data in analysis.items():
        cost_per_wagon = data["total_cost"] / data["total_wagons"] if data["total_wagons"] > 0 else 0
        result[key] = {
            "cost_per_wagon": float(cost_per_wagon),
            "total_cost": float(data["total_cost"]),
            "total_wagons": int(data["total_wagons"]),
            "calculations_count": data["count"],
        }

    return {
        "group_by": group_by,
        "analysis": result,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/cost-per-passenger")
async def get_cost_per_passenger(
    group_by: str = "route_type",
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get cost per passenger analysis"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(
        Calculation.status == CalculationStatus.APPROVED.value
    ).all()

    analysis = defaultdict(lambda: {"total_cost": 0, "total_passengers": 0, "count": 0})

    for calc in calculations:
        if group_by == "train_type":
            key = calc.train_type or "unknown"
        elif group_by == "route_type":
            key = calc.route_type or "unknown"
        else:
            key = "all"

        if calc.financial_result and isinstance(calc.financial_result, dict):
            total_cost = calc.financial_result.get("expenses", 0)
            analysis[key]["total_cost"] += total_cost

        analysis[key]["total_passengers"] += float(calc.occupancy or 0)
        analysis[key]["count"] += 1

    result = {}
    for key, data in analysis.items():
        cost_per_passenger = data["total_cost"] / data["total_passengers"] if data["total_passengers"] > 0 else 0
        result[key] = {
            "cost_per_passenger": float(cost_per_passenger),
            "total_cost": float(data["total_cost"]),
            "total_passengers": float(data["total_passengers"]),
            "calculations_count": data["count"],
        }

    return {
        "group_by": group_by,
        "analysis": result,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/anomaly-statistics")
async def get_anomaly_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get anomaly statistics"""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calculations = db.query(Calculation).filter(Calculation.anomalies != None).all()

    anomaly_types = defaultdict(int)
    total_anomalies = 0
    affected_calculations = len(calculations)

    for calc in calculations:
        if calc.anomalies:
            for anomaly in calc.anomalies:
                anomaly_type = anomaly.get("type", "unknown")
                anomaly_types[anomaly_type] += 1
                total_anomalies += 1

    return {
        "total_anomalies": total_anomalies,
        "affected_calculations": affected_calculations,
        "by_type": dict(anomaly_types),
        "severity_distribution": {
            "critical": anomaly_types.get("critical", 0),
            "high": anomaly_types.get("high", 0),
            "medium": anomaly_types.get("medium", 0),
            "low": anomaly_types.get("low", 0),
            "warning": anomaly_types.get("warning", 0),
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/forecast")
async def get_forecast(
    months: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(lambda db: User(id="test", email="test", role="director"))
) -> Dict[str, Any]:
    """Get cost forecast using Prophet ML model."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    from app.ml import ProphetForecaster

    start_date = datetime.utcnow() - timedelta(days=365)
    calculations = db.query(Calculation).filter(
        Calculation.created_at >= start_date,
        Calculation.status == CalculationStatus.APPROVED.value
    ).all()

    calc_dicts = [{
        "created_at": c.created_at,
        "financial_result": c.financial_result,
    } for c in calculations]

    forecaster = ProphetForecaster()
    forecaster.fit_from_calculations(calc_dicts)
    forecast = forecaster.forecast(months=months)

    return {
        "forecast_months": months,
        "historical_data_months": len(calc_dicts),
        "forecast": forecast,
        "method": "prophet",
        "model_fitted": forecaster.is_fitted,
        "generated_at": datetime.utcnow().isoformat(),
    }
