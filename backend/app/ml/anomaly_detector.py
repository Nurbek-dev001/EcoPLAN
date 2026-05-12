"""
ML-based anomaly detection using Isolation Forest.
Replaces threshold-based detection with real ML model.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "anomaly_model.pkl")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


class AnomalyDetector:
    """
    Isolation Forest anomaly detector for KTZ budget calculations.
    Trains on historical calculation features and detects outliers.
    """

    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.scaler = StandardScaler()
        self.is_fitted = False
        self._load_model()

    def _extract_features(self, calculation: Dict[str, Any]) -> np.ndarray:
        """Extract numeric features from a calculation record."""
        financial = calculation.get("financial_result") or {}
        expenses = calculation.get("expenses") or []
        revenue = calculation.get("revenue") or {}

        total_expenses = financial.get("expenses", 0) if isinstance(financial, dict) else 0
        total_revenue = financial.get("revenue", 0) if isinstance(financial, dict) else 0
        profit_margin = financial.get("profit_margin", 0) if isinstance(financial, dict) else 0

        wagon_types = calculation.get("wagon_types") or {}
        wagon_count = sum(wagon_types.values()) if isinstance(wagon_types, dict) else (calculation.get("wagons", 0))
        occupancy = float(calculation.get("occupancy", 0) or 0)
        distance = 0
        duration = 0
        train_info = calculation.get("train_info") or {}
        if isinstance(train_info, dict):
            distance = train_info.get("distance_km", 0) or 0
            duration = train_info.get("duration_hours", 0) or 0

        expense_groups: Dict[str, float] = {}
        for exp in expenses:
            if isinstance(exp, dict):
                group = exp.get("group", "Other")
                tariff = float(exp.get("tariff", 0) or 0)
                qty = float(exp.get("quantity", 0) or 0)
                expense_groups[group] = expense_groups.get(group, 0.0) + tariff * qty

        # Normalized features
        features = [
            total_expenses / 1e6 if total_expenses else 0.0,
            total_revenue / 1e6 if total_revenue else 0.0,
            profit_margin,
            wagon_count,
            occupancy,
            distance,
            duration,
            expense_groups.get("Станционные", 0) / 1e6,
            expense_groups.get("МЖС", 0) / 1e6,
            expense_groups.get("Санобработка", 0) / 1e6,
            expense_groups.get("Расходники", 0) / 1e6,
        ]
        return np.array(features, dtype=float).reshape(1, -1)

    def fit(self, calculations: List[Dict[str, Any]]) -> "AnomalyDetector":
        """Train the Isolation Forest on historical calculations."""
        if len(calculations) < 5:
            # Not enough data, use default thresholds
            self.is_fitted = False
            return self

        X = np.vstack([self._extract_features(c) for c in calculations])
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
        )
        self.model.fit(X_scaled)
        self.is_fitted = True
        self._save_model()
        return self

    def detect(self, calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in a single calculation."""
        anomalies = []
        features = self._extract_features(calculation)

        if self.is_fitted and self.model is not None:
            X_scaled = self.scaler.transform(features)
            pred = self.model.predict(X_scaled)[0]
            score = self.model.decision_function(X_scaled)[0]

            if pred == -1:
                anomalies.append({
                    "type": "ml_anomaly",
                    "severity": "high" if score < -0.15 else "medium",
                    "message": f"ML Anomaly detected (isolation score: {score:.3f}). This calculation deviates significantly from historical patterns.",
                    "group": "ML",
                    "score": float(score),
                    "method": "isolation_forest",
                })

        # Also keep rule-based as fallback / complementary
        financial = calculation.get("financial_result") or {}
        if isinstance(financial, dict):
            total_expenses = financial.get("expenses", 0)
            total_revenue = financial.get("revenue", 0)
            profit_margin = financial.get("profit_margin", 0)
            wagon_count = sum((calculation.get("wagon_types") or {}).values()) if isinstance(calculation.get("wagon_types"), dict) else 0
            passengers = float(calculation.get("occupancy", 0) or 0)

            cost_per_wagon = total_expenses / wagon_count if wagon_count > 0 else 0
            cost_per_passenger = total_expenses / passengers if passengers > 0 else 0

            if cost_per_wagon > 500_000:
                anomalies.append({
                    "type": "warning",
                    "severity": "medium",
                    "message": f"Cost per wagon ({cost_per_wagon:.0f} ₸) exceeds norm (500,000 ₸)",
                    "group": "Станционные",
                })

            if profit_margin < -50:
                anomalies.append({
                    "type": "warning",
                    "severity": "high",
                    "message": f"Critical profit margin: {profit_margin:.1f}%",
                    "group": "Financial",
                })

        return anomalies

    def batch_detect(self, calculations: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Detect anomalies for a batch of calculations."""
        if not self.is_fitted and len(calculations) >= 5:
            self.fit(calculations)
        return [self.detect(c) for c in calculations]

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
