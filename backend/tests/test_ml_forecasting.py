import pytest
from datetime import datetime
from app.ml.forecasting import ProphetForecaster


def test_prophet_init():
    forecaster = ProphetForecaster()
    assert forecaster is not None
    assert not forecaster.is_fitted


def test_prophet_fit_and_forecast():
    forecaster = ProphetForecaster()
    monthly_data = [
        {"month": f"2024-{i:02d}", "expenses": 1000000 + i * 50000}
        for i in range(1, 6)
    ]
    forecaster.fit(monthly_data)
    assert forecaster.is_fitted
    forecast = forecaster.forecast(months=3)
    assert len(forecast) == 3
    assert "predicted_cost" in forecast[0]
    assert "confidence_interval" in forecast[0]


def test_prophet_fit_from_calculations():
    forecaster = ProphetForecaster()
    calcs = [
        {
            "created_at": datetime(2024, i, 1),
            "financial_result": {"expenses": 1000000 + i * 100000}
        }
        for i in range(1, 6)
    ]
    forecaster.fit_from_calculations(calcs)
    assert forecaster.is_fitted
    forecast = forecaster.forecast(months=2)
    assert len(forecast) == 2
