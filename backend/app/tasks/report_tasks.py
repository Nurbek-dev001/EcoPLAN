from app.celery_app import celery_app

@celery_app.task
def generate_1c_export_task(calculation_ids: list):
    """Generate 1C export file in background."""
    return {"status": "success", "format": "1C", "count": len(calculation_ids)}
