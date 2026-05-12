"""
Route Optimizer using scikit-learn.
Suggests optimal wagon count based on historical occupancy data.
"""
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import pickle
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "route_optimizer_model.pkl")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


class RouteOptimizer:
    """
    ML model that recommends optimal train composition.
    Input: route features
    Output: recommended wagon count, action (add/remove), expected load factor
    """

    TRAIN_TYPE_MAP = {"standard": 0, "talgo": 1}
    ROUTE_TYPE_MAP = {"passenger": 0, "social": 1, "international": 2}

    def __init__(self):
        self.model: Optional[RandomForestRegressor] = None
        self.scaler = StandardScaler()
        self.is_fitted = False
        self._load_model()

    def _encode_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Convert route data to numeric features."""
        distance = float(data.get("distance_km", 0) or 0)
        duration = float(data.get("duration_hours", 0) or 0)
        train_type = self.TRAIN_TYPE_MAP.get(data.get("train_type", "standard"), 0)
        route_type = self.ROUTE_TYPE_MAP.get(data.get("route_type", "passenger"), 0)
        month = int(data.get("month", 1))
        day_of_week = int(data.get("day_of_week", 0))
        historical_occupancy = float(data.get("historical_occupancy", 0.6) or 0.6)
        current_wagons = int(data.get("current_wagons", 0) or 0)
        current_passengers = int(data.get("current_passengers", 0) or 0)

        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)

        features = [
            distance / 1000.0,
            duration,
            train_type,
            route_type,
            month_sin, month_cos,
            historical_occupancy,
            current_wagons,
            current_passengers,
        ]
        return np.array(features, dtype=float).reshape(1, -1)

    def fit(self, historical_data: List[Dict[str, Any]]) -> "RouteOptimizer":
        """Train on historical route performance data."""
        if len(historical_data) < 10:
            self.is_fitted = False
            return self

        X_list = []
        y_list = []
        for record in historical_data:
            optimal_wagons = record.get("optimal_wagons")
            if optimal_wagons is None:
                continue
            X_list.append(self._encode_features(record).flatten())
            y_list.append(int(optimal_wagons))

        if len(X_list) < 10:
            self.is_fitted = False
            return self

        X = np.vstack(X_list)
        y = np.array(y_list)
        X_scaled = self.scaler.fit_transform(X)

        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=6,
            random_state=42,
        )
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        self._save_model()
        return self

    def optimize(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend optimal wagon composition."""
        current_wagons = int(route_data.get("current_wagons", 0) or 0)
        features = self._encode_features(route_data)

        if self.is_fitted and self.model is not None:
            X_scaled = self.scaler.transform(features)
            recommended = int(round(self.model.predict(X_scaled)[0]))
        else:
            # Fallback heuristic
            historical_occupancy = float(route_data.get("historical_occupancy", 0.6) or 0.6)
            seats_per_wagon = 54 if route_data.get("train_type") == "talgo" else 36
            target_occupancy = 0.8
            passengers = int(route_data.get("current_passengers", 0) or 0)
            if passengers > 0 and historical_occupancy > 0:
                recommended = max(1, int(round(passengers / (seats_per_wagon * target_occupancy))))
            else:
                recommended = current_wagons

        delta = recommended - current_wagons
        if delta < 0:
            action = "remove"
            action_text = f"Убрать {abs(delta)} вагона(ов)"
        elif delta > 0:
            action = "add"
            action_text = f"Добавить {delta} вагона(ов)"
        else:
            action = "keep"
            action_text = "Текущий состав оптимален"

        # Estimate new load factor
        passengers = int(route_data.get("current_passengers", 0) or 0)
        seats_per_wagon = 54 if route_data.get("train_type") == "talgo" else 36
        new_load_factor = passengers / (recommended * seats_per_wagon) if recommended > 0 else 0

        return {
            "current_wagons": current_wagons,
            "recommended_wagons": recommended,
            "delta": delta,
            "action": action,
            "action_text": action_text,
            "expected_load_factor": round(min(new_load_factor, 1.0), 2),
            "confidence": 0.85 if self.is_fitted else 0.5,
            "method": "random_forest" if self.is_fitted else "heuristic",
        }

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
