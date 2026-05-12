"""Simple API client to fetch data from EcoPlan Hub backend."""
import requests
from typing import Dict, List, Any, Optional
from telegram_bot.config import API_BASE_URL, DEMO_MODE


def get_dashboard_summary() -> Dict[str, Any]:
    if DEMO_MODE:
        return {
            "total_calculations": 12,
            "pending_approvals": 3,
            "active_users": 5,
            "recent_activities_7days": 24,
        }
    try:
        r = requests.get(f"{API_BASE_URL}/dashboard/summary", timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}


def get_alerts() -> List[Dict[str, Any]]:
    if DEMO_MODE:
        return [
            {"train_number": "083", "type": "warning", "message": "3 дня подряд работает с убытком"},
            {"train_number": "001", "type": "critical", "message": "Расходы на ФОТ превысили план на 12%"},
        ]
    try:
        r = requests.get(f"{API_BASE_URL}/dashboard/alerts", timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return [{"error": str(e)}]


def get_train_report(train_number: str) -> Optional[Dict[str, Any]]:
    if DEMO_MODE:
        return {
            "train_number": train_number,
            "route": "Астана — Алматы",
            "revenue": 4500000,
            "expenses": 4200000,
            "profit": 300000,
            "margin": 6.7,
        }
    try:
        # Fallback to calculations list and filter
        r = requests.get(f"{API_BASE_URL}/calculations/", timeout=10)
        r.raise_for_status()
        data = r.json()
        for calc in data:
            if str(calc.get("train_number")) == train_number:
                return calc
        return None
    except Exception as e:
        return {"error": str(e)}
