"""
Celery tasks for ML model training and batch predictions.
"""
from app.celery_app import celery_app
from app.ml import AnomalyDetector, PricingEngine, RouteOptimizer, ProphetForecaster


@celery_app.task
def train_anomaly_model():
    """Background task to retrain Isolation Forest on all approved calculations."""
    try:
        from app.database import SessionLocal
        from app.models import Calculation

        db = SessionLocal()
        calcs = db.query(Calculation).filter(Calculation.status == "approved").all()
        calc_dicts = [{
            "financial_result": c.financial_result,
            "expenses": c.expenses,
            "revenue": c.revenue,
            "wagon_types": c.wagon_types,
            "occupancy": float(c.occupancy) if c.occupancy else 0,
            "train_type": c.train_type,
            "route_type": c.route_type,
            "train_info": c.train_info,
            "created_at": c.created_at,
        } for c in calcs]
        db.close()

        detector = AnomalyDetector()
        detector.fit(calc_dicts)
        return {"status": "trained", "samples": len(calc_dicts), "fitted": detector.is_fitted}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@celery_app.task
def train_pricing_model():
    """Background task to retrain pricing engine."""
    try:
        from app.database import SessionLocal
        from app.models import Calculation

        db = SessionLocal()
        calcs = db.query(Calculation).filter(Calculation.status == "approved").all()
        historical = []
        for c in calcs:
            revenue = c.revenue or {}
            if isinstance(revenue, dict) and revenue.get("ticket_price"):
                historical.append({
                    "month": c.created_at.month if c.created_at else 1,
                    "day_of_week": c.created_at.weekday() if c.created_at else 0,
                    "occupancy": float(c.occupancy) if c.occupancy else 0,
                    "distance_km": (c.train_info or {}).get("distance_km", 0),
                    "train_type": c.train_type or "standard",
                    "route_type": c.route_type or "passenger",
                    "actual_price": revenue.get("ticket_price", 0),
                })
        db.close()

        engine = PricingEngine()
        engine.fit(historical)
        return {"status": "trained", "samples": len(historical), "fitted": engine.is_fitted}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@celery_app.task
def train_prophet_forecaster():
    """Background task to retrain Prophet forecasting model."""
    try:
        from app.database import SessionLocal
        from app.models import Calculation
        from datetime import datetime, timedelta

        db = SessionLocal()
        start_date = datetime.utcnow() - timedelta(days=365)
        calcs = db.query(Calculation).filter(
            Calculation.created_at >= start_date,
            Calculation.status == "approved"
        ).all()
        calc_dicts = [{"created_at": c.created_at, "financial_result": c.financial_result} for c in calcs]
        db.close()

        forecaster = ProphetForecaster()
        forecaster.fit_from_calculations(calc_dicts)
        return {"status": "trained", "samples": len(calc_dicts), "fitted": forecaster.is_fitted}
    except Exception as e:
        return {"status": "error", "message": str(e)}
