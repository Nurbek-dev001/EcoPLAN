from app.celery_app import celery_app

@celery_app.task
def send_email_notification(to: str, subject: str, body: str):
    """Send email notification."""
    return {"status": "sent", "to": to}
