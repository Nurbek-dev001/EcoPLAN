from typing import Dict, List, Optional
from dataclasses import dataclass
from decimal import Decimal
from app.core.constants import TrainType, RouteType
from app.ml import AnomalyDetector


@dataclass
class ExpenseItem:
    id: str
    label: str
    enabled: bool
    tariff: float
    quantity: float
    group: str
    unit: str
    auto: bool = True


@dataclass
class TractionSegment:
    from_station: str
    to_station: str
    is_electrified: bool
    distance_km: float
    is_in_kz: bool = True


@dataclass
class CalculationParams:
    wagons: int
    route_type: str
    train_type: str
    passengers: int
    distance_km: float
    duration_hours: float
    night_hours: float
    monthly_rides: int = 30
    is_international: bool = False
    traction_segments: Optional[List[TractionSegment]] = None


@dataclass
class CalculationResult:
    by_group: Dict[str, float]
    total: float
    cost_per_wagon: float
    cost_per_passenger: float
    anomalies: List[Dict]
    plan_vs_fact: List[Dict]
    exceptions: List[Dict]


class CalculationService:
    """
    Business logic for budget calculations.
    Implements KTZ-specific formulas:
    - FOT with head/tail wagon rules and shift matrix
    - Traction by segments (electric/thermal) only within KZ borders
    - Sanitary processing schedule
    """

    # Traction tariffs (per hour)
    ELECTRIC_TARIFF_PER_HOUR = 184  # тг/hour
    THERMAL_TARIFF_PER_HOUR = 255   # тг/hour
    AVG_SPEED_KMH = 60

    # FOT configuration
    NIGHT_COEFFICIENT = 1.5
    MAX_LONG_RIDE_DURATION = 50  # hours -> staff doubles
    SOCIAL_ROUTE_DISCOUNT = 0.99  # 99% discount for social routes

    # Default norms
    MAX_COST_PER_WAGON = 500000
    MAX_STATION_SHARE = 0.3
    ANOMALY_THRESHOLD = 0.1  # 10%

    @staticmethod
    def calc_station_expense(
        wagon_count: int,
        consumption_norm: float,
        tariff: float,
        monthly_rides: int
    ) -> float:
        """
        Calculate station expenses (Water, Fuel, Disinfection, etc.)
        Formula: [Wagon count] × [Consumption norm] × [Tariff] × [Monthly rides]
        """
        if wagon_count <= 0 or tariff <= 0:
            return 0
        return wagon_count * consumption_norm * tariff * monthly_rides

    @staticmethod
    def calc_locomotive_traction(
        distance_km_in_kz: float,
        train_type: str,
        is_electrified: bool,
        monthly_rides: int
    ) -> float:
        """
        Calculate locomotive traction cost (legacy single-segment)
        Formula: [Distance in RK] × [Tariff per km] × [Monthly rides]
        """
        if distance_km_in_kz <= 0:
            return 0

        base_tariff = (
            CalculationService.ELECTRIC_TARIFF_PER_HOUR
            if is_electrified
            else CalculationService.THERMAL_TARIFF_PER_HOUR
        )

        # Adjust for Talgo (5% reduction)
        adjusted_tariff = base_tariff * 0.95 if train_type == "talgo" else base_tariff

        # Convert hourly tariff to per-km
        tariff_per_km = adjusted_tariff / CalculationService.AVG_SPEED_KMH

        return distance_km_in_kz * tariff_per_km * monthly_rides

    @staticmethod
    def calc_locomotive_traction_by_segments(
        segments: Optional[List[TractionSegment]],
        train_type: str,
        monthly_rides: int
    ) -> float:
        """
        Calculate traction cost by route segments.
        Only segments within KZ borders count. International segments = 0.
        """
        if not segments:
            return 0

        total = 0.0
        for seg in segments:
            if not seg.is_in_kz or seg.distance_km <= 0:
                continue

            base_tariff = (
                CalculationService.ELECTRIC_TARIFF_PER_HOUR
                if seg.is_electrified
                else CalculationService.THERMAL_TARIFF_PER_HOUR
            )
            adjusted_tariff = base_tariff * 0.95 if train_type == "talgo" else base_tariff
            tariff_per_km = adjusted_tariff / CalculationService.AVG_SPEED_KMH
            total += seg.distance_km * tariff_per_km * monthly_rides

        return total

    @staticmethod
    def calc_staff_cost(
        base_salary_per_conductor: float,
        wagon_count: int,
        train_type: str,
        duration_hours: float,
        night_hours: float,
        monthly_rides: int,
        is_international: bool = False
    ) -> float:
        """
        Calculate staff cost (ФОТ - Фонд Оплаты Труда) with KTZ shift matrix:
        - Standard: 1.5 conductors/wagon average, head/tail always 2
        - Talgo: 1 conductor/wagon, head/tail always 2
        - Route > 50 hours OR international: staff doubles
        - Night time 22:00-06:00: coefficient 1.5
        """
        if wagon_count <= 0 or base_salary_per_conductor <= 0:
            return 0

        # Head and tail wagons always have 2 conductors each
        if wagon_count == 1:
            total_conductors = 2.0
        else:
            head_conductors = 2.0
            tail_conductors = 2.0
            middle_wagons = max(0, wagon_count - 2)
            middle_rate = 1.5 if train_type == "standard" else 1.0
            total_conductors = head_conductors + tail_conductors + middle_wagons * middle_rate

        # Double staff if long ride (>50 hours) OR international
        needs_double_staff = (
            duration_hours > CalculationService.MAX_LONG_RIDE_DURATION
            or is_international
        )
        staff_multiplier = 2 if needs_double_staff else 1

        # Night coefficient applied if any night hours exist
        night_coeff = (
            CalculationService.NIGHT_COEFFICIENT if night_hours > 0 else 1
        )

        return (
            base_salary_per_conductor
            * total_conductors
            * staff_multiplier
            * night_coeff
            * monthly_rides
        )

    @staticmethod
    def calc_sanitary_expenses(
        wagon_count: int,
        tariffs: Dict,
        train_type: str,
        monthly_rides: int
    ) -> Dict[str, float]:
        """
        Calculate sanitary processing expenses by schedule:
        - Disinfection: every trip
        - Deratization: once per month
        - Disinsection: once per quarter (1/3 per month)
        Different tariffs for Standard vs Talgo.
        """
        if wagon_count <= 0:
            return {}

        train_mult = 1.3 if train_type == "talgo" else 1.0

        disinfection = (
            tariffs.get("disinfection", 3500) * train_mult * wagon_count * monthly_rides
        )
        deratization = (
            tariffs.get("deratization", 2000) * train_mult * wagon_count * 1
        )
        disinsection = (
            tariffs.get("disinsection", 2500) * train_mult * wagon_count * (1 / 3)
        )

        return {
            "disinfection": round(disinfection),
            "deratization": round(deratization),
            "disinsection": round(disinsection),
        }

    @staticmethod
    def calculate_expenses(
        expenses: List[Dict],
        params: Dict,
        historical_data: Optional[Dict] = None
    ) -> CalculationResult:
        """
        Calculate total expenses with anomaly detection and plan-vs-fact analysis.
        """
        results = {}
        total = 0.0
        exceptions = []

        for exp in expenses:
            if not exp.get("enabled", True):
                continue

            tariff = float(exp.get("tariff", 0))
            quantity = float(exp.get("quantity", 0))

            if tariff < 0 or quantity < 0:
                exceptions.append({
                    "type": "invalid_input",
                    "severity": "error",
                    "message": f"Negative value for {exp.get('label')}: tariff={tariff}, quantity={quantity}",
                })
                continue

            cost = tariff * quantity

            # Apply social route discount (99% off for МЖС on social routes)
            if exp.get("id") == "mzs" and params.get("route_type") == "social":
                cost = tariff * (1 - CalculationService.SOCIAL_ROUTE_DISCOUNT)

            group = exp.get("group", "Other")
            if group not in results:
                results[group] = 0
            results[group] += cost
            total += cost

        # Anomaly detection
        anomalies = []
        wagons = params.get("wagons", 0)
        passengers = params.get("passengers", 0)

        cost_per_wagon = total / wagons if wagons > 0 else 0
        cost_per_passenger = total / passengers if passengers > 0 else 0

        if cost_per_wagon > CalculationService.MAX_COST_PER_WAGON:
            anomalies.append({
                "type": "warning",
                "message": f"Cost per wagon ({cost_per_wagon:.0f} ₸) exceeds norm ({CalculationService.MAX_COST_PER_WAGON} ₸)",
            })

        station_share = results.get("Станционные", 0) / total if total > 0 else 0
        if station_share > CalculationService.MAX_STATION_SHARE:
            anomalies.append({
                "type": "warning",
                "message": f"Station share ({station_share * 100:.0f}%) exceeds norm ({CalculationService.MAX_STATION_SHARE * 100:.0f}%)",
                "group": "Станционные",
            })

        # ML Anomaly Detection (Isolation Forest)
        ml_detector = AnomalyDetector()
        calc_snapshot = {
            "financial_result": {
                "expenses": total,
                "revenue": params.get("revenue", {}).get("total_revenue", 0) if isinstance(params.get("revenue"), dict) else 0,
                "profit_margin": ((params.get("revenue", {}).get("total_revenue", 0) - total) / params.get("revenue", {}).get("total_revenue", 1) * 100) if isinstance(params.get("revenue"), dict) else 0,
            },
            "expenses": expenses,
            "revenue": params.get("revenue"),
            "wagon_types": {"total": wagons},
            "occupancy": passengers,
            "train_type": params.get("train_type"),
            "route_type": params.get("route_type"),
            "train_info": {
                "distance_km": params.get("distance_km", 0),
                "duration_hours": params.get("duration_hours", 0),
            },
        }
        ml_anomalies = ml_detector.detect(calc_snapshot)
        anomalies.extend(ml_anomalies)

        # Plan vs Fact analysis
        plan_multiplier = 1.15 if params.get("train_type") == "talgo" else 1.0
        plan_vs_fact = []

        for group, fact in results.items():
            historical_value = (
                historical_data.get(group, fact * 0.95)
                if historical_data
                else fact * 0.95
            )
            plan = round(historical_value * plan_multiplier)
            deviation = fact - plan
            deviation_percent = abs(deviation / plan) if plan > 0 else 0

            # Flag anomalies if deviation > 10%
            if deviation_percent > CalculationService.ANOMALY_THRESHOLD:
                anomalies.append({
                    "type": "warning",
                    "message": f"Deviation {group}: {deviation_percent * 100:.1f}% (requires explanation)",
                    "group": group,
                    "deviation_percent": deviation_percent,
                    "requires_explanation": True,
                })

            plan_vs_fact.append({
                "group": group,
                "plan": plan,
                "fact": fact,
                "deviation": deviation,
                "deviation_percent": deviation_percent,
            })

        return CalculationResult(
            by_group=results,
            total=total,
            cost_per_wagon=cost_per_wagon,
            cost_per_passenger=cost_per_passenger,
            anomalies=anomalies,
            plan_vs_fact=plan_vs_fact,
            exceptions=exceptions,
        )

    @staticmethod
    def calc_financial_result(
        total_revenue: float,
        total_expenses: float
    ) -> Dict:
        """
        Calculate financial summary
        """
        financial_result = total_revenue - total_expenses
        profit_margin = (
            (financial_result / total_revenue) * 100
            if total_revenue > 0
            else 0
        )

        return {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "financial_result": financial_result,
            "profit_margin": profit_margin,
        }

    @staticmethod
    def calc_revenue(
        ticket_price: float,
        passengers: int,
        subsidy: float
    ) -> Dict:
        """
        Calculate revenue (tickets + subsidies)
        """
        ticket_revenue = ticket_price * passengers
        total_revenue = ticket_revenue + subsidy

        return {
            "ticket_revenue": ticket_revenue,
            "total_revenue": total_revenue,
        }

    @staticmethod
    def create_default_expenses(
        wagons: int,
        train_type: str,
        passengers: int,
        tariffs: Dict,
        monthly_rides: int = 30
    ) -> List[Dict]:
        """
        Create default expense items from tariffs with sanitary schedule logic.
        """
        train_multiplier = 1.3 if train_type == "talgo" else 1.0
        total_wagons_with_staff = wagons + 1  # Add staff car

        # Sanitary processing by schedule
        sanitary = CalculationService.calc_sanitary_expenses(
            total_wagons_with_staff, tariffs, train_type, monthly_rides
        )

        return [
            {
                "id": "mzs",
                "label": "МЖС",
                "enabled": True,
                "tariff": round(tariffs.get("mzs", 50000) * train_multiplier),
                "quantity": monthly_rides,
                "group": "МЖС",
                "unit": "рейс",
                "auto": True,
            },
            {
                "id": "water",
                "label": "Вода (техническая)",
                "enabled": True,
                "tariff": tariffs.get("water", 3000),
                "quantity": total_wagons_with_staff * monthly_rides,
                "group": "Станционные",
                "unit": "вагон·рейс",
                "auto": True,
            },
            {
                "id": "fuel",
                "label": "Топливо",
                "enabled": True,
                "tariff": round(tariffs.get("fuel", 15000) * 1.0),
                "quantity": monthly_rides,
                "group": "Станционные",
                "unit": "рейс",
                "auto": True,
            },
            {
                "id": "cleaning",
                "label": "Клининг",
                "enabled": True,
                "tariff": tariffs.get("cleaning", 5000),
                "quantity": total_wagons_with_staff * monthly_rides,
                "group": "Станционные",
                "unit": "вагон·рейс",
                "auto": True,
            },
            {
                "id": "disinfection",
                "label": "Дезинфекция",
                "enabled": True,
                "tariff": round(tariffs.get("disinfection", 3500) * train_multiplier),
                "quantity": total_wagons_with_staff * monthly_rides,
                "group": "Санобработка",
                "unit": "вагон·рейс",
                "auto": True,
            },
            {
                "id": "deratization",
                "label": "Дератизация",
                "enabled": True,
                "tariff": round(tariffs.get("deratization", 2000) * train_multiplier),
                "quantity": total_wagons_with_staff,
                "group": "Санобработка",
                "unit": "вагон·мес",
                "auto": True,
            },
            {
                "id": "disinsection",
                "label": "Дезинсекция",
                "enabled": True,
                "tariff": round(tariffs.get("disinsection", 2500) * train_multiplier),
                "quantity": round(total_wagons_with_staff / 3, 1),
                "group": "Санобработка",
                "unit": "вагон·мес",
                "auto": True,
            },
            {
                "id": "linen",
                "label": "Бельё",
                "enabled": True,
                "tariff": tariffs.get("linen", 1500),
                "quantity": passengers * monthly_rides,
                "group": "Расходники",
                "unit": "пасс.",
                "auto": True,
            },
            {
                "id": "supplies",
                "label": "Расходные материалы",
                "enabled": True,
                "tariff": tariffs.get("supplies", 2000),
                "quantity": total_wagons_with_staff * monthly_rides,
                "group": "Расходники",
                "unit": "вагон·рейс",
                "auto": True,
            },
        ]
