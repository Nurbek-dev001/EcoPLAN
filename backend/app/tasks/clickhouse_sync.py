from app.celery_app import celery_app
from app.database_clickhouse import get_clickhouse_client


@celery_app.task
def sync_calculations_to_clickhouse():
    """Sync calculation data from PostgreSQL to ClickHouse for fast analytics."""
    try:
        from app.database import SessionLocal
        from app.models import Calculation
        from datetime import datetime, timedelta

        db = SessionLocal()
        start_date = datetime.utcnow() - timedelta(days=30)
        calcs = db.query(Calculation).filter(Calculation.created_at >= start_date).all()

        client = get_clickhouse_client()
        if not client:
            return {"status": "skipped", "reason": "clickhouse_not_available"}

        # Ensure table exists
        client.command("""
            CREATE TABLE IF NOT EXISTS ecoplan_calculations (
                id String,
                train_number String,
                branch String,
                train_type String,
                route_type String,
                total_expenses Float64,
                total_revenue Float64,
                profit_margin Float64,
                occupancy Float64,
                status String,
                created_at DateTime
            ) ENGINE = MergeTree()
            ORDER BY (created_at, branch)
        """)

        rows = []
        for c in calcs:
            financial = c.financial_result or {}
            if not isinstance(financial, dict):
                financial = {}
            rows.append((
                str(c.id),
                c.train_number or "",
                c.branch or "",
                c.train_type or "",
                c.route_type or "",
                float(financial.get("expenses", 0)),
                float(financial.get("revenue", 0)),
                float(financial.get("profit_margin", 0)),
                float(c.occupancy) if c.occupancy else 0.0,
                c.status or "",
                c.created_at or datetime.utcnow(),
            ))

        if rows:
            client.insert("ecoplan_calculations", rows)

        db.close()
        return {"status": "synced", "rows_synced": len(rows)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@celery_app.task
def sync_ml_metrics_to_clickhouse():
    """Sync ML prediction metrics to ClickHouse."""
    try:
        client = get_clickhouse_client()
        if not client:
            return {"status": "skipped", "reason": "clickhouse_not_available"}

        client.command("""
            CREATE TABLE IF NOT EXISTS ml_metrics (
                metric_name String,
                metric_value Float64,
                model_type String,
                created_at DateTime
            ) ENGINE = MergeTree()
            ORDER BY created_at
        """)

        return {"status": "synced"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
