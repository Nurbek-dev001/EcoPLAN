import pytest
from app.ml.pricing_engine import PricingEngine


def test_pricing_engine_init():
    engine = PricingEngine()
    assert engine is not None
    assert not engine.is_fitted


def test_pricing_recommend_fallback():
    engine = PricingEngine()
    result = engine.recommend({
        "current_price": 5000,
        "occupancy": 0.9,
        "train_type": "talgo",
        "distance_km": 500,
    })
    assert "recommended_price" in result
    assert "confidence" in result
    assert result["method"] == "heuristic"


def test_pricing_fit_and_recommend():
    engine = PricingEngine()
    historical = [
        {
            "month": 1, "day_of_week": 0, "occupancy": 0.8,
            "distance_km": 500, "train_type": "standard", "route_type": "passenger",
            "actual_price": 5000,
        }
        for _ in range(15)
    ]
    engine.fit(historical)
    assert engine.is_fitted
    result = engine.recommend({
        "current_price": 5000,
        "occupancy": 0.8,
        "train_type": "standard",
        "distance_km": 500,
    })
    assert result["method"] == "gradient_boosting"
