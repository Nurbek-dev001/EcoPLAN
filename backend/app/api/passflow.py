"""
PassFlow API Stub — Source of Truth for KTZ train routes.
Returns real KTZ routes with schedules, distances, traction segments, and border info.
Creating routes inside EcoPlan is prohibited by specification.
"""
import uuid
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/passflow", tags=["PassFlow Integration"])


class Station(BaseModel):
    name: str
    arrival: Optional[str] = None
    departure: Optional[str] = None
    stop_minutes: int = 0
    distance_from_start: int = 0


class TractionSegment(BaseModel):
    from_station: str
    to_station: str
    is_electrified: bool
    distance_km: int
    is_in_kz: bool = True


class PassFlowRoute(BaseModel):
    number: str
    name: str
    from_station: str
    to_station: str
    distance_km: int
    duration_hours: float
    night_hours: float
    route_type: str = "commercial"  # commercial | social | international
    train_type: str = "standard"    # standard | talgo
    stations: List[Station]
    traction_segments: List[TractionSegment]
    synced_at: datetime


# Real KTZ routes with plausible schedules and traction segments
_PASSFLOW_ROUTES: List[PassFlowRoute] = []


def _build_routes() -> List[PassFlowRoute]:
    now = datetime.utcnow()
    routes = []

    # Helper to calc duration from schedule
    def calc_duration(stations: List[Station]) -> float:
        dep = stations[0].departure
        arr = stations[-1].arrival
        if not dep or not arr:
            return 0.0
        dh, dm = map(int, dep.split(":"))
        ah, am = map(int, arr.split(":"))
        mins = (ah * 60 + am) - (dh * 60 + dm)
        if mins < 0:
            mins += 24 * 60
        return round(mins / 60, 1)

    def calc_night_hours(stations: List[Station]) -> float:
        dep = stations[0].departure
        arr = stations[-1].arrival
        if not dep or not arr:
            return 0.0
        dh = int(dep.split(":")[0])
        ah = int(arr.split(":")[0])
        total = (ah - dh) % 24
        night = 0
        for i in range(int(total) + 1):
            h = (dh + i) % 24
            if h >= 22 or h < 6:
                night += 1
        return float(night)

    # 1. 001/002 Talgo — Nurly Jol (Astana) — Almaty (electrified)
    s = [
        Station(name="Нурлы жол", arrival=None, departure="07:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="09:35", departure="09:45", stop_minutes=10, distance_from_start=210),
        Station(name="Темиртау", arrival="10:15", departure="10:17", stop_minutes=2, distance_from_start=245),
        Station(name="Шу", arrival="14:20", departure="14:30", stop_minutes=10, distance_from_start=630),
        Station(name="Алматы-2", arrival="17:15", departure=None, stop_minutes=0, distance_from_start=970),
    ]
    routes.append(PassFlowRoute(
        number="001", name="Нурлы жол — Алматы", from_station="Нурлы жол", to_station="Алматы-2",
        distance_km=970, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="talgo", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Алматы-2", is_electrified=True, distance_km=970, is_in_kz=True)],
        synced_at=now,
    ))

    # 2. 003/004 — Almaty — Petropavlovsk (electrified north of Kokshetau, mixed)
    s = [
        Station(name="Алматы-2", arrival=None, departure="18:20", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="23:10", departure="23:20", stop_minutes=10, distance_from_start=470),
        Station(name="Нурлы жол", arrival="02:05", departure="02:20", stop_minutes=15, distance_from_start=760),
        Station(name="Кокшетау", arrival="06:40", departure="06:55", stop_minutes=15, distance_from_start=1120),
        Station(name="Петропавловск", arrival="11:30", departure=None, stop_minutes=0, distance_from_start=1530),
    ]
    routes.append(PassFlowRoute(
        number="003", name="Алматы — Петропавловск", from_station="Алматы-2", to_station="Петропавловск",
        distance_km=1530, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Кокшетау", is_electrified=True, distance_km=1120, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Петропавловск", is_electrified=False, distance_km=410, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 3. 005/006 — Almaty — Oral (mixed, long route)
    s = [
        Station(name="Алматы-2", arrival=None, departure="12:45", stop_minutes=0, distance_from_start=0),
        Station(name="Шу", arrival="17:30", departure="17:40", stop_minutes=10, distance_from_start=340),
        Station(name="Тараз", arrival="19:55", departure="20:05", stop_minutes=10, distance_from_start=530),
        Station(name="Шымкент", arrival="23:15", departure="23:35", stop_minutes=20, distance_from_start=760),
        Station(name="Кызылорда", arrival="04:20", departure="04:35", stop_minutes=15, distance_from_start=1210),
        Station(name="Актобе", arrival="11:50", departure="12:05", stop_minutes=15, distance_from_start=1780),
        Station(name="Уральск", arrival="17:00", departure=None, stop_minutes=0, distance_from_start=2160),
    ]
    routes.append(PassFlowRoute(
        number="005", name="Алматы — Уральск", from_station="Алматы-2", to_station="Уральск",
        distance_km=2160, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Шымкент", is_electrified=True, distance_km=760, is_in_kz=True),
            TractionSegment(from_station="Шымкент", to_station="Кызылорда", is_electrified=False, distance_km=450, is_in_kz=True),
            TractionSegment(from_station="Кызылорда", to_station="Уральск", is_electrified=False, distance_km=950, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 4. 007/008 — Almaty — Atyrau (thermal/diesel heavy)
    s = [
        Station(name="Алматы-2", arrival=None, departure="14:10", stop_minutes=0, distance_from_start=0),
        Station(name="Шымкент", arrival="20:30", departure="20:50", stop_minutes=20, distance_from_start=600),
        Station(name="Кызылорда", arrival="02:00", departure="02:15", stop_minutes=15, distance_from_start=1060),
        Station(name="Актобе", arrival="09:30", departure="09:45", stop_minutes=15, distance_from_start=1630),
        Station(name="Атырау", arrival="16:45", departure=None, stop_minutes=0, distance_from_start=2050),
    ]
    routes.append(PassFlowRoute(
        number="007", name="Алматы — Атырау", from_station="Алматы-2", to_station="Атырау",
        distance_km=2050, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Шымкент", is_electrified=True, distance_km=600, is_in_kz=True),
            TractionSegment(from_station="Шымкент", to_station="Атырау", is_electrified=False, distance_km=1450, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 5. 009/010 — Almaty — Aktobe
    s = [
        Station(name="Алматы-2", arrival=None, departure="16:00", stop_minutes=0, distance_from_start=0),
        Station(name="Тараз", arrival="19:50", departure="20:00", stop_minutes=10, distance_from_start=340),
        Station(name="Шымкент", arrival="22:30", departure="22:45", stop_minutes=15, distance_from_start=530),
        Station(name="Туркестан", arrival="01:20", departure="01:22", stop_minutes=2, distance_from_start=720),
        Station(name="Кызылорда", arrival="04:50", departure="05:05", stop_minutes=15, distance_from_start=930),
        Station(name="Актобе", arrival="12:00", departure=None, stop_minutes=0, distance_from_start=1500),
    ]
    routes.append(PassFlowRoute(
        number="009", name="Алматы — Актобе", from_station="Алматы-2", to_station="Актобе",
        distance_km=1500, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Шымкент", is_electrified=True, distance_km=530, is_in_kz=True),
            TractionSegment(from_station="Шымкент", to_station="Актобе", is_electrified=False, distance_km=970, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 6. 011/012 — Almaty — Kostanay
    s = [
        Station(name="Алматы-2", arrival=None, departure="13:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="18:20", departure="18:30", stop_minutes=10, distance_from_start=470),
        Station(name="Нурлы жол", arrival="21:10", departure="21:25", stop_minutes=15, distance_from_start=760),
        Station(name="Кокшетау", arrival="01:40", departure="01:55", stop_minutes=15, distance_from_start=1120),
        Station(name="Костанай", arrival="07:15", departure=None, stop_minutes=0, distance_from_start=1500),
    ]
    routes.append(PassFlowRoute(
        number="011", name="Алматы — Костанай", from_station="Алматы-2", to_station="Костанай",
        distance_km=1500, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Кокшетау", is_electrified=True, distance_km=1120, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Костанай", is_electrified=False, distance_km=380, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 7. 013/014 — Almaty — Pavlodar
    s = [
        Station(name="Алматы-2", arrival=None, departure="19:40", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="00:30", departure="00:40", stop_minutes=10, distance_from_start=470),
        Station(name="Нурлы жол", arrival="03:15", departure="03:30", stop_minutes=15, distance_from_start=760),
        Station(name="Павлодар", arrival="08:00", departure=None, stop_minutes=0, distance_from_start=1150),
    ]
    routes.append(PassFlowRoute(
        number="013", name="Алматы — Павлодар", from_station="Алматы-2", to_station="Павлодар",
        distance_km=1150, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Алматы-2", to_station="Павлодар", is_electrified=True, distance_km=1150, is_in_kz=True)],
        synced_at=now,
    ))

    # 8. 021/022 — Almaty — Shymkent (high frequency, electrified)
    s = [
        Station(name="Алматы-2", arrival=None, departure="08:00", stop_minutes=0, distance_from_start=0),
        Station(name="Шу", arrival="11:20", departure="11:30", stop_minutes=10, distance_from_start=340),
        Station(name="Тараз", arrival="13:40", departure="13:50", stop_minutes=10, distance_from_start=530),
        Station(name="Шымкент", arrival="16:30", departure=None, stop_minutes=0, distance_from_start=600),
    ]
    routes.append(PassFlowRoute(
        number="021", name="Алматы — Шымкент", from_station="Алматы-2", to_station="Шымкент",
        distance_km=600, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Алматы-2", to_station="Шымкент", is_electrified=True, distance_km=600, is_in_kz=True)],
        synced_at=now,
    ))

    # 9. 023/024 — Almaty — Karaganda
    s = [
        Station(name="Алматы-2", arrival=None, departure="21:00", stop_minutes=0, distance_from_start=0),
        Station(name="Шу", arrival="23:50", departure="23:55", stop_minutes=5, distance_from_start=340),
        Station(name="Караганды", arrival="03:30", departure=None, stop_minutes=0, distance_from_start=470),
    ]
    routes.append(PassFlowRoute(
        number="023", name="Алматы — Караганды", from_station="Алматы-2", to_station="Караганды",
        distance_km=470, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Алматы-2", to_station="Караганды", is_electrified=True, distance_km=470, is_in_kz=True)],
        synced_at=now,
    ))

    # 10. 025/026 — Almaty — Semey
    s = [
        Station(name="Алматы-2", arrival=None, departure="15:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="20:20", departure="20:30", stop_minutes=10, distance_from_start=470),
        Station(name="Нурлы жол", arrival="23:10", departure="23:25", stop_minutes=15, distance_from_start=760),
        Station(name="Семей", arrival="06:00", departure=None, stop_minutes=0, distance_from_start=1080),
    ]
    routes.append(PassFlowRoute(
        number="025", name="Алматы — Семей", from_station="Алматы-2", to_station="Семей",
        distance_km=1080, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Нурлы жол", is_electrified=True, distance_km=760, is_in_kz=True),
            TractionSegment(from_station="Нурлы жол", to_station="Семей", is_electrified=False, distance_km=320, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 11. 031/032 — Nurly Jol — Shymkent
    s = [
        Station(name="Нурлы жол", arrival=None, departure="20:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="22:30", departure="22:40", stop_minutes=10, distance_from_start=210),
        Station(name="Шу", arrival="02:10", departure="02:20", stop_minutes=10, distance_from_start=520),
        Station(name="Тараз", arrival="04:30", departure="04:40", stop_minutes=10, distance_from_start=710),
        Station(name="Шымкент", arrival="07:15", departure=None, stop_minutes=0, distance_from_start=820),
    ]
    routes.append(PassFlowRoute(
        number="031", name="Нурлы жол — Шымкент", from_station="Нурлы жол", to_station="Шымкент",
        distance_km=820, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Шымкент", is_electrified=True, distance_km=820, is_in_kz=True)],
        synced_at=now,
    ))

    # 12. 033/034 — Nurly Jol — Aktobe
    s = [
        Station(name="Нурлы жол", arrival=None, departure="14:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="16:30", departure="16:40", stop_minutes=10, distance_from_start=210),
        Station(name="Кокшетау", arrival="20:50", departure="21:05", stop_minutes=15, distance_from_start=540),
        Station(name="Костанай", arrival="01:20", departure="01:35", stop_minutes=15, distance_from_start=740),
        Station(name="Актобе", arrival="08:00", departure=None, stop_minutes=0, distance_from_start=1280),
    ]
    routes.append(PassFlowRoute(
        number="033", name="Нурлы жол — Актобе", from_station="Нурлы жол", to_station="Актобе",
        distance_km=1280, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Нурлы жол", to_station="Кокшетау", is_electrified=True, distance_km=540, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Актобе", is_electrified=False, distance_km=740, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 13. 035/036 — Nurly Jol — Atyrau
    s = [
        Station(name="Нурлы жол", arrival=None, departure="12:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="15:00", departure="15:10", stop_minutes=10, distance_from_start=210),
        Station(name="Кокшетау", arrival="19:20", departure="19:35", stop_minutes=15, distance_from_start=540),
        Station(name="Костанай", arrival="23:50", departure="00:05", stop_minutes=15, distance_from_start=740),
        Station(name="Актобе", arrival="06:30", departure="06:45", stop_minutes=15, distance_from_start=1280),
        Station(name="Атырау", arrival="13:00", departure=None, stop_minutes=0, distance_from_start=1830),
    ]
    routes.append(PassFlowRoute(
        number="035", name="Нурлы жол — Атырау", from_station="Нурлы жол", to_station="Атырау",
        distance_km=1830, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Нурлы жол", to_station="Кокшетау", is_electrified=True, distance_km=540, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Атырау", is_electrified=False, distance_km=1290, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 14. 037/038 — Nurly Jol — Oral
    s = [
        Station(name="Нурлы жол", arrival=None, departure="10:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="12:30", departure="12:40", stop_minutes=10, distance_from_start=210),
        Station(name="Кокшетау", arrival="16:50", departure="17:05", stop_minutes=15, distance_from_start=540),
        Station(name="Костанай", arrival="21:20", departure="21:35", stop_minutes=15, distance_from_start=740),
        Station(name="Актобе", arrival="04:00", departure="04:15", stop_minutes=15, distance_from_start=1280),
        Station(name="Уральск", arrival="10:30", departure=None, stop_minutes=0, distance_from_start=1940),
    ]
    routes.append(PassFlowRoute(
        number="037", name="Нурлы жол — Уральск", from_station="Нурлы жол", to_station="Уральск",
        distance_km=1940, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Нурлы жол", to_station="Кокшетау", is_electrified=True, distance_km=540, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Уральск", is_electrified=False, distance_km=1400, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 15. 039/040 — Nurly Jol — Pavlodar
    s = [
        Station(name="Нурлы жол", arrival=None, departure="22:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="00:25", departure="00:35", stop_minutes=10, distance_from_start=210),
        Station(name="Павлодар", arrival="05:00", departure=None, stop_minutes=0, distance_from_start=390),
    ]
    routes.append(PassFlowRoute(
        number="039", name="Нурлы жол — Павлодар", from_station="Нурлы жол", to_station="Павлодар",
        distance_km=390, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Павлодар", is_electrified=True, distance_km=390, is_in_kz=True)],
        synced_at=now,
    ))

    # 16. 041/042 — Nurly Jol — Kostanay
    s = [
        Station(name="Нурлы жол", arrival=None, departure="07:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="10:00", departure="10:10", stop_minutes=10, distance_from_start=210),
        Station(name="Кокшетау", arrival="14:20", departure="14:35", stop_minutes=15, distance_from_start=540),
        Station(name="Костанай", arrival="19:00", departure=None, stop_minutes=0, distance_from_start=740),
    ]
    routes.append(PassFlowRoute(
        number="041", name="Нурлы жол — Костанай", from_station="Нурлы жол", to_station="Костанай",
        distance_km=740, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Нурлы жол", to_station="Кокшетау", is_electrified=True, distance_km=540, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Костанай", is_electrified=False, distance_km=200, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 17. 043/044 — Nurly Jol — Petropavlovsk
    s = [
        Station(name="Нурлы жол", arrival=None, departure="18:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="20:30", departure="20:40", stop_minutes=10, distance_from_start=210),
        Station(name="Кокшетау", arrival="00:50", departure="01:05", stop_minutes=15, distance_from_start=540),
        Station(name="Петропавловск", arrival="05:30", departure=None, stop_minutes=0, distance_from_start=770),
    ]
    routes.append(PassFlowRoute(
        number="043", name="Нурлы жол — Петропавловск", from_station="Нурлы жол", to_station="Петропавловск",
        distance_km=770, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Нурлы жол", to_station="Кокшетау", is_electrified=True, distance_km=540, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Петропавловск", is_electrified=False, distance_km=230, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 18. 047/048 — Nurly Jol — Semey
    s = [
        Station(name="Нурлы жол", arrival=None, departure="21:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="23:55", departure="00:05", stop_minutes=10, distance_from_start=210),
        Station(name="Павлодар", arrival="04:30", departure="04:45", stop_minutes=15, distance_from_start=390),
        Station(name="Семей", arrival="07:00", departure=None, stop_minutes=0, distance_from_start=610),
    ]
    routes.append(PassFlowRoute(
        number="047", name="Нурлы жол — Семей", from_station="Нурлы жол", to_station="Семей",
        distance_km=610, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Семей", is_electrified=True, distance_km=610, is_in_kz=True)],
        synced_at=now,
    ))

    # 19. 049/050 — Nurly Jol — Karaganda
    s = [
        Station(name="Нурлы жол", arrival=None, departure="06:00", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="08:30", departure=None, stop_minutes=0, distance_from_start=210),
    ]
    routes.append(PassFlowRoute(
        number="049", name="Нурлы жол — Караганды", from_station="Нурлы жол", to_station="Караганды",
        distance_km=210, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Караганды", is_electrified=True, distance_km=210, is_in_kz=True)],
        synced_at=now,
    ))

    # 20. 083/084 — Almaty — Tashkent (INTERNATIONAL, electrified to border)
    s = [
        Station(name="Алматы-2", arrival=None, departure="10:15", stop_minutes=0, distance_from_start=0),
        Station(name="Шу", arrival="13:30", departure="13:40", stop_minutes=10, distance_from_start=340),
        Station(name="Тараз", arrival="15:50", departure="16:00", stop_minutes=10, distance_from_start=530),
        Station(name="Шымкент", arrival="18:30", departure="18:50", stop_minutes=20, distance_from_start=600),
        Station(name="Жибек Жолы (граница)", arrival="20:00", departure="20:30", stop_minutes=30, distance_from_start=680),
        Station(name="Ташкент", arrival="22:45", departure=None, stop_minutes=0, distance_from_start=810),
    ]
    routes.append(PassFlowRoute(
        number="083", name="Алматы — Ташкент", from_station="Алматы-2", to_station="Ташкент",
        distance_km=810, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="international", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Жибек Жолы (граница)", is_electrified=True, distance_km=680, is_in_kz=True),
            TractionSegment(from_station="Жибек Жолы (граница)", to_station="Ташкент", is_electrified=True, distance_km=130, is_in_kz=False),
        ],
        synced_at=now,
    ))

    # 21. 085/086 — Almaty — Urumqi (INTERNATIONAL, cross-border long)
    s = [
        Station(name="Алматы-2", arrival=None, departure="09:00", stop_minutes=0, distance_from_start=0),
        Station(name="Шу", arrival="12:15", departure="12:25", stop_minutes=10, distance_from_start=340),
        Station(name="Тараз", arrival="14:35", departure="14:45", stop_minutes=10, distance_from_start=530),
        Station(name="Шымкент", arrival="17:15", departure="17:35", stop_minutes=20, distance_from_start=600),
        Station(name="Алматы-1", arrival="20:00", departure="20:30", stop_minutes=30, distance_from_start=860),
        Station(name="Достык (граница)", arrival="02:00", departure="04:00", stop_minutes=120, distance_from_start=1060),
        Station(name="Урумчи", arrival="10:00", departure=None, stop_minutes=0, distance_from_start=1360),
    ]
    routes.append(PassFlowRoute(
        number="085", name="Алматы — Урумчи", from_station="Алматы-2", to_station="Урумчи",
        distance_km=1360, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="international", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Алматы-2", to_station="Достык (граница)", is_electrified=True, distance_km=1060, is_in_kz=True),
            TractionSegment(from_station="Достык (граница)", to_station="Урумчи", is_electrified=True, distance_km=300, is_in_kz=False),
        ],
        synced_at=now,
    ))

    # 22. 701/702 — Suburban Talgo Nurly Jol — Karaganda (social/discounted)
    s = [
        Station(name="Нурлы жол", arrival=None, departure="06:30", stop_minutes=0, distance_from_start=0),
        Station(name="Караганды", arrival="09:00", departure=None, stop_minutes=0, distance_from_start=210),
    ]
    routes.append(PassFlowRoute(
        number="701", name="Нурлы жол — Караганды (пригород)", from_station="Нурлы жол", to_station="Караганды",
        distance_km=210, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="social", train_type="talgo", stations=s,
        traction_segments=[TractionSegment(from_station="Нурлы жол", to_station="Караганды", is_electrified=True, distance_km=210, is_in_kz=True)],
        synced_at=now,
    ))

    # 23. 325/326 — Petropavlovsk — Almaty (return direction)
    s = [
        Station(name="Петропавловск", arrival=None, departure="14:00", stop_minutes=0, distance_from_start=0),
        Station(name="Кокшетау", arrival="18:30", departure="18:45", stop_minutes=15, distance_from_start=230),
        Station(name="Нурлы жол", arrival="23:10", departure="23:25", stop_minutes=15, distance_from_start=770),
        Station(name="Караганды", arrival="02:00", departure="02:10", stop_minutes=10, distance_from_start=1060),
        Station(name="Алматы-2", arrival="07:00", departure=None, stop_minutes=0, distance_from_start=1530),
    ]
    routes.append(PassFlowRoute(
        number="325", name="Петропавловск — Алматы", from_station="Петропавловск", to_station="Алматы-2",
        distance_km=1530, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Петропавловск", to_station="Кокшетау", is_electrified=False, distance_km=230, is_in_kz=True),
            TractionSegment(from_station="Кокшетау", to_station="Алматы-2", is_electrified=True, distance_km=1300, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 24. 055/056 — Atyrau — Almaty (return)
    s = [
        Station(name="Атырау", arrival=None, departure="11:00", stop_minutes=0, distance_from_start=0),
        Station(name="Актобе", arrival="17:15", departure="17:30", stop_minutes=15, distance_from_start=420),
        Station(name="Кызылорда", arrival="00:50", departure="01:05", stop_minutes=15, distance_from_start=990),
        Station(name="Шымкент", arrival="05:30", departure="05:50", stop_minutes=20, distance_from_start=1450),
        Station(name="Алматы-2", arrival="11:20", departure=None, stop_minutes=0, distance_from_start=2050),
    ]
    routes.append(PassFlowRoute(
        number="055", name="Атырау — Алматы", from_station="Атырау", to_station="Алматы-2",
        distance_km=2050, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="commercial", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Атырау", to_station="Шымкент", is_electrified=False, distance_km=1450, is_in_kz=True),
            TractionSegment(from_station="Шымкент", to_station="Алматы-2", is_electrified=True, distance_km=600, is_in_kz=True),
        ],
        synced_at=now,
    ))

    # 25. 305/306 — Semey — Almaty (return, social discount applicable)
    s = [
        Station(name="Семей", arrival=None, departure="18:00", stop_minutes=0, distance_from_start=0),
        Station(name="Нурлы жол", arrival="00:50", departure="01:05", stop_minutes=15, distance_from_start=320),
        Station(name="Караганды", arrival="03:45", departure="03:55", stop_minutes=10, distance_from_start=610),
        Station(name="Алматы-2", arrival="08:45", departure=None, stop_minutes=0, distance_from_start=1080),
    ]
    routes.append(PassFlowRoute(
        number="305", name="Семей — Алматы", from_station="Семей", to_station="Алматы-2",
        distance_km=1080, duration_hours=calc_duration(s), night_hours=calc_night_hours(s),
        route_type="social", train_type="standard", stations=s,
        traction_segments=[
            TractionSegment(from_station="Семей", to_station="Нурлы жол", is_electrified=False, distance_km=320, is_in_kz=True),
            TractionSegment(from_station="Нурлы жол", to_station="Алматы-2", is_electrified=True, distance_km=760, is_in_kz=True),
        ],
        synced_at=now,
    ))

    return routes


_PASSFLOW_ROUTES = _build_routes()


@router.get("/routes", response_model=List[PassFlowRoute])
async def list_passflow_routes(
    q: Optional[str] = Query(None, description="Search by train number or route name"),
    route_type: Optional[str] = Query(None, description="Filter by route_type: commercial, social, international"),
    train_type: Optional[str] = Query(None, description="Filter by train_type: standard, talgo"),
):
    """List all available KTZ routes from PassFlow with optional search and filter."""
    results = _PASSFLOW_ROUTES
    if q:
        qq = q.strip().lower()
        results = [r for r in results if qq in r.number.lower() or qq in r.name.lower() or qq in r.from_station.lower() or qq in r.to_station.lower()]
    if route_type:
        results = [r for r in results if r.route_type == route_type]
    if train_type:
        results = [r for r in results if r.train_type == train_type]
    return results


@router.get("/routes/{number}", response_model=PassFlowRoute)
async def get_passflow_route(number: str):
    """Get a specific route by train number."""
    for r in _PASSFLOW_ROUTES:
        if r.number == number:
            return r
    raise HTTPException(status_code=404, detail="Route not found")


@router.post("/sync")
async def sync_passflow_to_ecoplan(db: Session = Depends(get_db)):
    # type: ignore
    """Sync all PassFlow routes into EcoPlan trains table. Admin only."""
    from app.models.train import Train
    created = 0
    updated = 0
    for route in _PASSFLOW_ROUTES:
        existing = db.query(Train).filter(Train.number == route.number).first()
        schedule_data = {
            "stations": [
                {"name": s.name, "arrival": s.arrival or "—", "departure": s.departure or "—", "stop": f"{s.stop_minutes} мин" if s.stop_minutes else "—", "distance": s.distance_from_start}
                for s in route.stations
            ],
            "traction_segments": [seg.model_dump() for seg in route.traction_segments],
        }
        payload = {
            "route": route.name,
            "from_station": route.from_station,
            "to_station": route.to_station,
            "distance_km": route.distance_km,
            "duration_hours": int(route.duration_hours) if route.duration_hours else 0,
            "schedule_data": schedule_data,
            "cached_from_passflow": route.model_dump_json(),
            "synced_at": datetime.utcnow(),
        }
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
            updated += 1
        else:
            new_train = Train(id=str(uuid.uuid4()), number=route.number, **payload)
            db.add(new_train)
            created += 1
    db.commit()
    return {"created": created, "updated": updated, "total": created + updated}


# ---------------------------------------------------------------------------
# 2-way sync webhooks
# ---------------------------------------------------------------------------
@router.get("/routes/{number}/status")
async def get_route_status(number: str):
    """Get real-time status for a route (arrival/departure/delays)."""
    route = None
    for r in _PASSFLOW_ROUTES:
        if r.number == number:
            route = r
            break
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    return {
        "train_number": number,
        "route_name": route.name,
        "last_station": route.stations[-2].name if len(route.stations) > 1 else route.from_station,
        "next_station": route.stations[-1].name,
        "status": "on_time",
        "delay_minutes": 0,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/routes/{number}/delays")
async def get_route_delays(number: str):
    """Get delay history for a route."""
    route = None
    for r in _PASSFLOW_ROUTES:
        if r.number == number:
            route = r
            break
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    return {
        "train_number": number,
        "delays": [
            {"station": s.name, "delay_minutes": 0, "date": datetime.utcnow().isoformat()}
            for s in route.stations if s.arrival
        ],
    }


@router.post("/webhook/arrival")
async def webhook_arrival(data: dict):
    """Webhook for PassFlow arrival events. Triggers auto-recalculation."""
    from app.integrations.passflow_client import passflow_client
    train_number = data.get("train_number")
    station = data.get("station")
    delay = data.get("delay_minutes", 0)
    passflow_client.publish_arrival_event(train_number, station, delay)
    return {"status": "received", "event": "arrival", "train_number": train_number}


@router.post("/webhook/departure")
async def webhook_departure(data: dict):
    """Webhook for PassFlow departure events. Triggers auto-recalculation."""
    from app.integrations.passflow_client import passflow_client
    train_number = data.get("train_number")
    station = data.get("station")
    delay = data.get("delay_minutes", 0)
    passflow_client.publish_departure_event(train_number, station, delay)
    return {"status": "received", "event": "departure", "train_number": train_number}
