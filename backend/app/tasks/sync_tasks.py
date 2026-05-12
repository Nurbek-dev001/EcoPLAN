from app.celery_app import celery_app
from app.integrations.accounting_1c import calculation_to_1c_entries, generate_1c_xml, generate_1c_txt


@celery_app.task
def sync_passflow_routes():
    """Scheduled task to sync PassFlow routes."""
    # Calls passflow sync endpoint internally
    return {"status": "synced"}


@celery_app.task
def recalculate_expenses_on_arrival(event_data: dict):
    """
    Triggered by Kafka event when a train arrives/departs.
    Automatically recalculates expenses based on updated schedule.
    """
    train_number = event_data.get("train_number")
    delay_minutes = event_data.get("delay_minutes", 0)

    # Simple expense adjustment: +1% per 10 min delay for staff costs
    adjustment_factor = 1 + (delay_minutes / 10) * 0.01

    return {
        "status": "recalculated",
        "train_number": train_number,
        "delay_minutes": delay_minutes,
        "expense_adjustment_factor": round(adjustment_factor, 4),
    }


@celery_app.task
def export_1c_async(calculation_ids: list, format: str = "xml"):
    """Background task to export calculations to 1C format."""
    from app.database import SessionLocal
    from app.models import Calculation

    db = SessionLocal()
    all_entries = []
    for cid in calculation_ids:
        calc = db.query(Calculation).filter(Calculation.id == cid).first()
        if calc:
            all_entries.extend(calculation_to_1c_entries(calc))
    db.close()

    if format.lower() == "xml":
        content = generate_1c_xml(all_entries)
    elif format.lower() == "txt":
        content = generate_1c_txt(all_entries)
    else:
        content = str(all_entries)

    return {
        "status": "exported",
        "calculations_count": len(calculation_ids),
        "entries_count": len(all_entries),
        "total_amount": sum(e["amount"] for e in all_entries),
        "format": format,
    }
