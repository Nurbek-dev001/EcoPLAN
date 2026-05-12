"""
Нагрузочное тестирование EcoPlan Hub API.
Цель: расчёт бюджета всех филиалов за 5 минут.

Запуск:
    python load_test.py --url http://localhost:8000 --duration 300 --users 50
"""
import argparse
import asyncio
import time
import random
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict

import aiohttp


@dataclass
class LoadTestResult:
    total_requests: int
    successful: int
    failed: int
    avg_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    requests_per_second: float
    errors: List[str]


# Demo KTZ branches and trains
BRANCHES = [
    "Астана", "Алматы", "Шымкент", "Караганда", "Актобе",
    "Атырау", "Уральск", "Костанай", "Павлодар", "Петропавловск",
    "Кызылорда", "Семей",
]

TRAIN_NUMBERS = [
    "001", "003", "005", "007", "009", "011", "013", "021",
    "023", "025", "031", "033", "035", "037", "039", "041",
    "043", "047", "049", "083", "085", "701", "325", "055", "305",
]


def generate_calculation_payload(branch: str, train_number: str) -> Dict:
    """Generate a realistic budget calculation payload"""
    wagons = random.randint(8, 20)
    passengers = wagons * random.randint(30, 50)
    return {
        "train_number": train_number,
        "branch": branch,
        "train_info": {
            "number": train_number,
            "route": f"{branch} — Тестовый маршрут",
            "distanceKm": random.randint(200, 2000),
            "durationHours": random.randint(4, 48),
        },
        "wagon_types": {
            "sv": 1,
            "kupe": max(1, wagons // 3),
            "plats": max(1, wagons - 1 - max(1, wagons // 3)),
        },
        "occupancy": random.randint(60, 95),
        "route_type": random.choice(["commercial", "social"]),
        "train_type": random.choice(["standard", "talgo"]),
        "revenue": {
            "ticketPrice": random.randint(5000, 15000),
            "passengers": passengers,
            "subsidy": random.randint(0, 500000),
        },
        "expenses": [
            {"id": "mzs", "tariff": 50000, "quantity": 30},
            {"id": "water", "tariff": 3000, "quantity": wagons * 30},
            {"id": "fuel", "tariff": 15000, "quantity": 30},
            {"id": "cleaning", "tariff": 5000, "quantity": wagons * 30},
            {"id": "disinfection", "tariff": 3500, "quantity": wagons * 30},
            {"id": "deratization", "tariff": 2000, "quantity": wagons},
            {"id": "disinsection", "tariff": 2500, "quantity": wagons / 3},
            {"id": "rent", "tariff": 80000, "quantity": wagons},
            {"id": "linen", "tariff": 1500, "quantity": passengers * 30},
            {"id": "supplies", "tariff": 2000, "quantity": wagons * 30},
        ],
    }


async def worker(
    session: aiohttp.ClientSession,
    base_url: str,
    worker_id: int,
    duration: int,
    results: List[float],
    errors: List[str],
    counter: Dict[str, int],
) -> None:
    """Async worker that sends requests until duration expires"""
    end_time = time.time() + duration
    branch = BRANCHES[worker_id % len(BRANCHES)]

    while time.time() < end_time:
        train_number = random.choice(TRAIN_NUMBERS)
        payload = generate_calculation_payload(branch, train_number)

        start = time.time()
        try:
            async with session.post(
                f"{base_url}/api/calculations",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                latency = (time.time() - start) * 1000
                results.append(latency)

                if resp.status == 200:
                    counter["successful"] += 1
                else:
                    counter["failed"] += 1
                    text = await resp.text()
                    errors.append(f"HTTP {resp.status}: {text[:200]}")
        except Exception as e:
            latency = (time.time() - start) * 1000
            results.append(latency)
            counter["failed"] += 1
            errors.append(str(e))

        # Small delay to prevent overwhelming
        await asyncio.sleep(random.uniform(0.05, 0.3))


async def run_load_test(base_url: str, num_users: int, duration: int) -> LoadTestResult:
    """Run the load test with specified concurrent users and duration"""
    results: List[float] = []
    errors: List[str] = []
    counter = {"successful": 0, "failed": 0}

    print(f"\n🚀 Starting load test")
    print(f"   URL: {base_url}")
    print(f"   Concurrent users: {num_users}")
    print(f"   Duration: {duration} seconds ({duration / 60:.1f} minutes)")
    print(f"   Branches: {len(BRANCHES)}")
    print(f"   Trains: {len(TRAIN_NUMBERS)}")
    print()

    async with aiohttp.ClientSession() as session:
        # Warmup: check health
        try:
            async with session.get(f"{base_url}/health", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    print("✅ Backend is healthy")
                else:
                    print(f"⚠️ Backend health check returned {resp.status}")
        except Exception as e:
            print(f"❌ Cannot connect to backend: {e}")
            return LoadTestResult(0, 0, 0, 0, 0, 0, 0, [str(e)])

        start_time = time.time()

        # Launch workers
        tasks = [
            asyncio.create_task(
                worker(session, base_url, i, duration, results, errors, counter)
            )
            for i in range(num_users)
        ]

        # Progress reporter
        async def reporter():
            while time.time() - start_time < duration:
                await asyncio.sleep(5)
                elapsed = time.time() - start_time
                total = counter["successful"] + counter["failed"]
                rps = total / elapsed if elapsed > 0 else 0
                print(f"   ⏱️  {elapsed:.0f}s | Requests: {total} | OK: {counter['successful']} | FAIL: {counter['failed']} | RPS: {rps:.1f}")

        reporter_task = asyncio.create_task(reporter())
        await asyncio.gather(*tasks)
        reporter_task.cancel()

        total_time = time.time() - start_time

    total_requests = counter["successful"] + counter["failed"]
    avg_latency = sum(results) / len(results) if results else 0
    min_latency = min(results) if results else 0
    max_latency = max(results) if results else 0
    rps = total_requests / total_time if total_time > 0 else 0

    return LoadTestResult(
        total_requests=total_requests,
        successful=counter["successful"],
        failed=counter["failed"],
        avg_latency_ms=avg_latency,
        min_latency_ms=min_latency,
        max_latency_ms=max_latency,
        requests_per_second=rps,
        errors=errors[:20],  # Keep only first 20 errors
    )


def print_results(result: LoadTestResult) -> None:
    """Print formatted test results"""
    print("\n" + "=" * 60)
    print("📊 НАГРУЗОЧНОЕ ТЕСТИРОВАНИЕ — РЕЗУЛЬТАТЫ")
    print("=" * 60)
    print(f"   Всего запросов:      {result.total_requests}")
    print(f"   Успешных:            {result.successful} ({result.successful / max(result.total_requests, 1) * 100:.1f}%)")
    print(f"   Ошибок:              {result.failed} ({result.failed / max(result.total_requests, 1) * 100:.1f}%)")
    print(f"   Средняя latency:     {result.avg_latency_ms:.1f} ms")
    print(f"   Мин. latency:        {result.min_latency_ms:.1f} ms")
    print(f"   Макс. latency:       {result.max_latency_ms:.1f} ms")
    print(f"   Запросов/сек:        {result.requests_per_second:.1f}")
    print()

    if result.errors:
        print("   Первые ошибки:")
        for err in result.errors[:5]:
            print(f"      • {err[:120]}")
        print()

    # KTZ requirement: budget of all branches within 5 minutes
    branches_tested = len(BRANCHES)
    time_per_branch = 300 / branches_tested  # 300 seconds = 5 minutes
    print(f"📋 Требование КТЖ: бюджет всех {branches_tested} филиалов за 5 минут")
    print(f"   Допустимое время на филиал: {time_per_branch:.0f} секунд")
    if result.requests_per_second > 0:
        estimated_time = branches_tested * 10 / result.requests_per_second  # 10 calcs per branch
        print(f"   Оценочное время: {estimated_time:.1f} секунд")
        if estimated_time <= 300:
            print("   ✅ Требование ВЫПОЛНЕНО")
        else:
            print("   ❌ Требование НЕ ВЫПОЛНЕНО")
    print()


def main():
    parser = argparse.ArgumentParser(description="EcoPlan Hub Load Test")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the API")
    parser.add_argument("--users", type=int, default=20, help="Number of concurrent users")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    args = parser.parse_args()

    result = asyncio.run(run_load_test(args.url, args.users, args.duration))
    print_results(result)


if __name__ == "__main__":
    main()
