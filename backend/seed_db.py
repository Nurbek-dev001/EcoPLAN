"""
Database seeding script with demo data
"""
from datetime import datetime, date
from app.database import SessionLocal
from app.models import User, Tariff, Train, Calculation
from app.core.security import get_password_hash
from app.core.constants import UserRole, CalculationStatus
import json

def seed_database():
    """Seed database with demo data"""
    db = SessionLocal()

    try:
        # Clear existing data
        db.query(User).delete()
        db.query(Tariff).delete()
        db.query(Train).delete()
        db.query(Calculation).delete()
        db.commit()

        # ========== Create demo users ==========
        demo_users = [
            {
                "email": "manager@ktz.kz",
                "password": "password123",
                "role": UserRole.MANAGER.value,
            },
            {
                "email": "analyst@ktz.kz",
                "password": "password123",
                "role": UserRole.ANALYST.value,
            },
            {
                "email": "director@ktz.kz",
                "password": "password123",
                "role": UserRole.DIRECTOR.value,
            },
            {
                "email": "checker@ktz.kz",
                "password": "password123",
                "role": UserRole.CHECKER.value,
            },
            {
                "email": "admin@ktz.kz",
                "password": "password123",
                "role": UserRole.ADMIN_NSI.value,
            },
        ]

        for user_data in demo_users:
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                active=True,
            )
            db.add(user)

        db.commit()
        print("[OK] Created demo users")

        # Get manager user for creating tariffs
        manager = db.query(User).filter(User.email == "manager@ktz.kz").first()
        admin = db.query(User).filter(User.email == "admin@ktz.kz").first()

        # ========== Create demo tariffs ==========
        demo_tariffs = [
            {
                "name": "МЖС",
                "region": "Шымкент",
                "category": "МЖС",
                "value": 45.50,
                "unit": "за вагон",
                "valid_from": date(2024, 1, 1),
            },
            {
                "name": "Вода техническая",
                "region": "Шымкент",
                "category": "Вода техническая",
                "value": 12.30,
                "unit": "литр",
                "valid_from": date(2024, 1, 1),
            },
            {
                "name": "Топливо",
                "region": "Алматы",
                "category": "Топливо",
                "value": 560.00,
                "unit": "литр",
                "valid_from": date(2024, 1, 1),
            },
            {
                "name": "Мойка и уборка",
                "region": "Астана",
                "category": "Мойка и уборка",
                "value": 8500.00,
                "unit": "за рейс",
                "valid_from": date(2024, 1, 1),
            },
            {
                "name": "Дезинфекция",
                "region": "Шымкент",
                "category": "Дезинфекция",
                "value": 2200.00,
                "unit": "за рейс",
                "valid_from": date(2024, 1, 1),
            },
        ]

        for tariff_data in demo_tariffs:
            tariff = Tariff(
                name=tariff_data["name"],
                region=tariff_data["region"],
                category=tariff_data["category"],
                value=tariff_data["value"],
                unit=tariff_data["unit"],
                valid_from=tariff_data["valid_from"],
                created_by=admin.id,
            )
            db.add(tariff)

        db.commit()
        print("[OK] Created demo tariffs")

        # ========== Create demo trains ==========
        demo_trains = [
            {
                "number": "701",
                "route": "Шымкент - Алматы",
                "from_station": "Шымкент",
                "to_station": "Алматы",
                "distance_km": 472,
                "duration_hours": 12,
            },
            {
                "number": "702",
                "route": "Алматы - Астана",
                "from_station": "Алматы",
                "to_station": "Астана",
                "distance_km": 1386,
                "duration_hours": 16,
            },
            {
                "number": "703",
                "route": "Шымкент - Астана",
                "from_station": "Шымкент",
                "to_station": "Астана",
                "distance_km": 1680,
                "duration_hours": 20,
            },
            {
                "number": "704",
                "route": "Костанай - Атырау",
                "from_station": "Костанай",
                "to_station": "Атырау",
                "distance_km": 750,
                "duration_hours": 18,
            },
        ]

        for train_data in demo_trains:
            train = Train(**train_data)
            db.add(train)

        db.commit()
        print("[OK] Created demo trains")

        # ========== Create demo calculations ==========
        train_701 = db.query(Train).filter(Train.number == "701").first()

        demo_calculation = Calculation(
            user_id=manager.id,
            train_number="701",
            train_info={"type": "standard"},
            wagon_types={"плацкарт": 4, "купе": 3, "св": 2},
            occupancy=85.5,
            route_type="commercial",
            train_type="standard",
            revenue={
                "плацкарт": 450000,
                "купе": 650000,
                "св": 380000,
            },
            expenses=[
                {"id": "mzs", "label": "МЖС", "enabled": True, "tariff": 45.50, "quantity": 9, "group": "Станционные", "unit": "за вагон"},
                {"id": "water", "label": "Вода техническая", "enabled": True, "tariff": 12.30, "quantity": 450, "group": "Станционные", "unit": "литр"},
                {"id": "fuel", "label": "Топливо", "enabled": True, "tariff": 560.00, "quantity": 350, "group": "Энергия", "unit": "литр"},
                {"id": "cleaning", "label": "Мойка и уборка", "enabled": True, "tariff": 8500.00, "quantity": 1, "group": "Мойка", "unit": "за рейс"},
            ],
            financial_result={
                "revenue": 1480000,
                "expenses": 320500,
                "profit": 1159500,
                "margin_percent": 78.3,
            },
            status=CalculationStatus.APPROVED.value,
            submitted_at=datetime(2024, 5, 1, 10, 30),
            submitted_by=manager.id,
            approved_at=datetime(2024, 5, 1, 14, 15),
            approved_by=admin.id,
        )
        db.add(demo_calculation)

        db.commit()
        print("[OK] Created demo calculations")

        print("\n[OK] Database seeding completed successfully!")
        print("\n📊 Demo Credentials:")
        print("=" * 50)
        print("Manager:   manager@ktz.kz / password123")
        print("Analyst:   analyst@ktz.kz / password123")
        print("Director:  director@ktz.kz / password123")
        print("Checker:   checker@ktz.kz / password123")
        print("Admin:     admin@ktz.kz / password123")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
