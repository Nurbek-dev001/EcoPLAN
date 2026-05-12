"""
Prophet-based forecasting for KTZ budget expenses.
Replaces simple average with Facebook Prophet.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from prophet import Prophet
import pickle
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "prophet_model.pkl")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


class ProphetForecaster:
    """
    Time-series forecasting using Prophet.
    Predicts monthly expenses with seasonality and confidence intervals.
    """

    def __init__(self):
        self.model: Optional[Prophet] = None
        self.is_fitted = False
        self._load_model()

    def fit(self, monthly_data: List[Dict[str, Any]]) -> "ProphetForecaster":
        """
        Train Prophet on monthly expense data.
        monthly_data: list of {"month": "2024-01", "expenses": 1230000.0}
        """
        if len(monthly_data) < 3:
            self.is_fitted = False
            return self

        df = pd.DataFrame(monthly_data)
        df["ds"] = pd.to_datetime(df["month"])
        df["y"] = df["expenses"].astype(float)
        df = df.sort_values("ds").reset_index(drop=True)

        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.9,
        )
        self.model.fit(df)
        self.is_fitted = True
        self._save_model()
        return self

    def forecast(self, months: int = 3, freq: str = "MS") -> List[Dict[str, Any]]:
        """Generate forecast for N months ahead."""
        if not self.is_fitted or self.model is None:
            return []

        future = self.model.make_future_dataframe(periods=months, freq=freq)
        forecast_df = self.model.predict(future)

        # Return only future periods
        result = []
        cutoff = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _, row in forecast_df.iterrows():
            if row["ds"] >= cutoff:
                result.append({
                    "month": row["ds"].strftime("%Y-%m"),
                    "predicted_cost": float(row["yhat"]),
                    "confidence_interval": {
                        "lower": float(row["yhat_lower"]),
                        "upper": float(row["yhat_upper"]),
                    },
                    "trend": float(row["trend"]),
                })
                if len(result) >= months:
                    break

        return result

    def fit_from_calculations(self, calculations: List[Dict[str, Any]]) -> "ProphetForecaster":
        """Convenience method: fit from raw calculation records."""
        from collections import defaultdict
        monthly = defaultdict(list)
        for calc in calculations:
            created = calc.get("created_at")
            financial = calc.get("financial_result") or {}
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if created and isinstance(financial, dict):
                month_key = created.strftime("%Y-%m")
                monthly[month_key].append(financial.get("expenses", 0))

        monthly_data = [
            {"month": m, "expenses": sum(vals) / len(vals)}
            for m, vals in sorted(monthly.items())
            if vals
        ]
        return self.fit(monthly_data)

    def _save_model(self):
        try:
            with open(MODEL_PATH, "wb") as f:
                pickle.dump(self.model, f)
        except Exception:
            pass

    def _load_model(self):
        try:
            if os.path.exists(MODEL_PATH):
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                    self.is_fitted = True
        except Exception:
            self.is_fitted = False
