import pytest
from app.ml.anomaly_detector import AnomalyDetector


def test_anomaly_detector_init():
    detector = AnomalyDetector()
    assert detector is not None
    assert not detector.is_fitted


def test_anomaly_detector_fit():
    detector = AnomalyDetector()
    data = [
        {
            "financial_result": {"expenses": 1000000, "revenue": 1200000, "profit_margin": 20},
            "expenses": [{"group": "Станционные", "tariff": 1000, "quantity": 10}],
            "wagon_types": {"total": 5},
            "occupancy": 100,
            "train_type": "standard",
            "route_type": "passenger",
            "train_info": {"distance_km": 500, "duration_hours": 10},
        }
        for _ in range(10)
    ]
    detector.fit(data)
    assert detector.is_fitted


def test_anomaly_detect():
    detector = AnomalyDetector()
    calc = {
        "financial_result": {"expenses": 5000000, "revenue": 1000000, "profit_margin": -80},
        "expenses": [{"group": "Станционные", "tariff": 5000, "quantity": 100}],
        "wagon_types": {"total": 2},
        "occupancy": 50,
        "train_type": "standard",
        "route_type": "passenger",
        "train_info": {"distance_km": 500, "duration_hours": 10},
    }
    anomalies = detector.detect(calc)
    assert isinstance(anomalies, list)
    # Should detect cost_per_wagon and profit_margin warnings
    assert len(anomalies) >= 1


def test_batch_detect():
    detector = AnomalyDetector()
    data = [
        {
            "financial_result": {"expenses": 1000000, "revenue": 1200000, "profit_margin": 20},
            "expenses": [],
            "wagon_types": {"total": 5},
            "occupancy": 100,
            "train_type": "standard",
            "route_type": "passenger",
            "train_info": {"distance_km": 500, "duration_hours": 10},
        }
        for _ in range(10)
    ]
    results = detector.batch_detect(data)
    assert len(results) == 10
    assert all(isinstance(r, list) for r in results)
