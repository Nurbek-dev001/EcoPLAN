"""
Dynamic Pricing Engine using scikit-learn.
Recommends optimal ticket prices based on route features.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import pickle
import os
from datetime import datetime

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "pricing_model.pkl")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


class PricingEngine:
    """
    ML-driven dynamic pricing for KTZ passenger routes.
    Features: season, day_of_week, occupancy, distance, train_type, route_type
    """

    TRAIN_TYPE_MAP = {"standard": 0, "talgo": 1}
    ROUTE_TYPE_MAP = {"passenger": 0, "social": 1, "international": 2}

    def __init__(self):
        self.model: Optional[GradientBoostingRegressor] = None
        self.scaler = StandardScaler()
        self.is_fitted = False
        self._load_model()

    def _encode_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Convert raw route data into numeric feature vector."""
        now = datetime.utcnow()
        month = data.get("month", now.month)
        day_of_week = data.get("day_of_week", now.weekday())
        occupancy = float(data.get("occupancy", 0) or 0)
        distance = float(data.get("distance_km", 0) or 0)
        train_type = self.TRAIN_TYPE_MAP.get(data.get("train_type", "standard"), 0)
        route_type = self.ROUTE_TYPE_MAP.get(data.get("route_type", "passenger"), 0)
        historical_load = float(data.get("historical_load", 0.7) or 0.7)
        wagon_count = int(data.get("wagon_count", 0) or 0)

        # Season encoding (sin/cos for cyclical)
        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)
        dow_sin = np.sin(2 * np.pi * day_of_week / 7)
        dow_cos = np.cos(2 * np.pi * day_of_week / 7)

        features = [
            month_sin, month_cos,
            dow_sin, dow_cos,
            occupancy,
            distance / 1000.0,  # normalize to thousands of km
            train_type,
            route_type,
            historical_load,
            wagon_count,
        ]
        return np.array(features, dtype=float).reshape(1, -1)

    def fit(self, historical_data: List[Dict[str, Any]]) -> "PricingEngine":
        """Train the pricing model on historical route data."""
        if len(historical_data) < 10:
            self.is_fitted = False
            return self

        X_list = []
        y_list = []
        for record in historical_data:
            price = record.get("actual_price")
            if price is None:
                continue
            X_list.append(self._encode_features(record).flatten())
            y_list.append(float(price))

        if len(X_list) < 10:
            self.is_fitted = False
            return self

        X = np.vstack(X_list)
        y = np.array(y_list)
        X_scaled = self.scaler.fit_transform(X)

        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
        )
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        self._save_model()
        return self

    def recommend(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend optimal price and provide reasoning."""
        features = self._encode_features(route_data)
        base_price = float(route_data.get("current_price", 5000) or 5000)

        if self.is_fitted and self.model is not None:
            X_scaled = self.scaler.transform(features)
            predicted = float(self.model.predict(X_scaled)[0])
            confidence = self._estimate_confidence(X_scaled)
        else:
            # Fallback heuristic
            distance = float(route_data.get("distance_km", 0) or 0)
            occupancy = float(route_data.get("occupancy", 0) or 0)
            train_mult = 1.2 if route_data.get("train_type") == "talgo" else 1.0
            predicted = base_price * (1 + (occupancy - 0.7) * 0.3) * train_mult
            confidence = 0.5

        # Generate dynamic factors
        factors = []
        month = route_data.get("month", datetime.utcnow().month)
        if month in [6, 7, 8, 12]:
            factors.append("high_season")
        if route_data.get("day_of_week") in [5, 6]:
            factors.append("weekend_demand")
        if float(route_data.get("occupancy", 0) or 0) > 0.85:
            factors.append("high_occupancy")
        elif float(route_data.get("occupancy", 0) or 0) < 0.4:
            factors.append("low_occupancy_discount")

        return {
            "recommended_price": round(predicted, 0),
            "current_price": base_price,
            "price_change_percent": round((predicted - base_price) / base_price * 100, 1) if base_price else 0,
            "confidence": round(confidence, 2),
            "factors": factors,
            "method": "gradient_boosting" if self.is_fitted else "heuristic",
        }

    def _estimate_confidence(self, X_scaled: np.ndarray) -> float:
        """Rough confidence based on ensemble variance (simplified)."""
        if self.model is None:
            return 0.5
        # Use staged predictions variance as proxy
        staged = list(self.model.staged_predict(X_scaled))
        if len(staged) > 1:
            last_vals = np.array([p[0] for p in staged[-20:]])
            variance = np.var(last_vals)
            return max(0.0, 1.0 - variance / 1e6)
        return 0.7

    def _save_model(self):
        try:
            with open(MODEL_PATH, "wb") as f:
                pickle.dump({"model": self.model, "scaler": self.scaler}, f)
        except Exception:
            pass

    def _load_model(self):
        try:
            if os.path.exists(MODEL_PATH):
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                    self.model = data["model"]
                    self.scaler = data["scaler"]
                    self.is_fitted = True
        except Exception:
            self.is_fitted = False
