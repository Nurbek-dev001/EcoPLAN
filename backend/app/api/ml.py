"""
ML API endpoints for EcoPlan Hub.
Provides: pricing recommendations, route optimization, anomaly detection, forecasting.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict

from app.database import get_db
from app.models import User, Calculation
from app.services import RBACService
from app.core.security import get_current_user
from app.ml import AnomalyDetector, PricingEngine, RouteOptimizer, ProphetForecaster

router = APIRouter(prefix="/api/ml", tags=["ml"])

# Shared model instances
_anomaly_detector = AnomalyDetector()
_pricing_engine = PricingEngine()
_route_optimizer = RouteOptimizer()
_prophet_forecaster = ProphetForecaster()


# ---------------------------------------------------------------------------
# Helper: load all approved calculations as dicts
# ---------------------------------------------------------------------------
def _load_calculation_dicts(db: Session) -> List[Dict[str, Any]]:
    calcs = db.query(Calculation).filter(
        Calculation.status == "approved"
    ).all()
    return [{
        "id": c.id,
        "train_number": c.train_number,
        "train_type": c.train_type,
        "route_type": c.route_type,
        "occupancy": float(c.occupancy) if c.occupancy else 0,
        "wagon_types": c.wagon_types,
        "financial_result": c.financial_result,
        "expenses": c.expenses,
        "revenue": c.revenue,
        "train_info": c.train_info,
        "created_at": c.created_at,
        "anomalies": c.anomalies,
    } for c in calcs]


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------
@router.post("/pricing/recommend")
async def pricing_recommend(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Recommend optimal ticket price for a route."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calcs = _load_calculation_dicts(db)
    # Build synthetic historical pricing data from calculations
    historical = []
    for c in calcs:
        revenue = c.get("revenue") or {}
        if isinstance(revenue, dict) and revenue.get("ticket_price"):
            historical.append({
                "month": c["created_at"].month if c["created_at"] else 1,
                "day_of_week": c["created_at"].weekday() if c["created_at"] else 0,
                "occupancy": c.get("occupancy", 0),
                "distance_km": (c.get("train_info") or {}).get("distance_km", 0),
                "train_type": c.get("train_type", "standard"),
                "route_type": c.get("route_type", "passenger"),
                "actual_price": revenue.get("ticket_price", 0),
                "wagon_count": sum((c.get("wagon_types") or {}).values()) if isinstance(c.get("wagon_types"), dict) else 0,
            })

    _pricing_engine.fit(historical)
    result = _pricing_engine.recommend(data)
    return {"recommendation": result, "generated_at": datetime.utcnow().isoformat()}


# ---------------------------------------------------------------------------
# Route Optimizer
# ---------------------------------------------------------------------------
@router.post("/route-optimizer/optimize")
async def route_optimize(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Recommend optimal wagon count for a route."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calcs = _load_calculation_dicts(db)
    historical = []
    for c in calcs:
        wtypes = c.get("wagon_types") or {}
        wagon_count = sum(wtypes.values()) if isinstance(wtypes, dict) else 0
        occupancy = c.get("occupancy", 0) or 0
        train_info = c.get("train_info") or {}
        # Synthetic optimal wagons based on actual load factor
        seats_per_wagon = 54 if c.get("train_type") == "talgo" else 36
        passengers = int(occupancy)
        if passengers > 0 and wagon_count > 0:
            optimal = max(1, int(round(passengers / (seats_per_wagon * 0.75))))
        else:
            optimal = wagon_count
        historical.append({
            "distance_km": train_info.get("distance_km", 0),
            "duration_hours": train_info.get("duration_hours", 0),
            "train_type": c.get("train_type", "standard"),
            "route_type": c.get("route_type", "passenger"),
            "month": c["created_at"].month if c["created_at"] else 1,
            "day_of_week": c["created_at"].weekday() if c["created_at"] else 0,
            "historical_occupancy": occupancy / (wagon_count * seats_per_wagon) if wagon_count > 0 else 0.6,
            "current_wagons": wagon_count,
            "current_passengers": passengers,
            "optimal_wagons": optimal,
        })

    _route_optimizer.fit(historical)
    result = _route_optimizer.optimize(data)
    return {"optimization": result, "generated_at": datetime.utcnow().isoformat()}


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------
@router.post("/anomaly/detect")
async def anomaly_detect(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Detect anomalies in a calculation using Isolation Forest."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calcs = _load_calculation_dicts(db)
    _anomaly_detector.fit(calcs)
    anomalies = _anomaly_detector.detect(data)
    return {
        "anomalies": anomalies,
        "is_anomaly": len(anomalies) > 0,
        "method": "isolation_forest",
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/anomaly/batch-detect")
async def anomaly_batch_detect(
    items: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Batch anomaly detection for multiple calculations."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calcs = _load_calculation_dicts(db)
    _anomaly_detector.fit(calcs)
    results = _anomaly_detector.batch_detect(items)
    return {
        "results": [
            {"index": i, "anomalies": a, "is_anomaly": len(a) > 0}
            for i, a in enumerate(results)
        ],
        "method": "isolation_forest",
        "generated_at": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Forecasting
# ---------------------------------------------------------------------------
@router.get("/forecast")
async def ml_forecast(
    months: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Forecast expenses using Prophet."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    start_date = datetime.utcnow() - timedelta(days=365)
    calcs = db.query(Calculation).filter(
        Calculation.created_at >= start_date,
        Calculation.status == "approved",
    ).all()

    calc_dicts = [{
        "created_at": c.created_at,
        "financial_result": c.financial_result,
    } for c in calcs]

    _prophet_forecaster.fit_from_calculations(calc_dicts)
    forecast = _prophet_forecaster.forecast(months=months)

    return {
        "forecast_months": months,
        "forecast": forecast,
        "method": "prophet",
        "model_fitted": _prophet_forecaster.is_fitted,
        "generated_at": datetime.utcnow().isoformat(),
    }
