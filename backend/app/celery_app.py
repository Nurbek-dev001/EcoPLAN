from celery import Celery
from app.config import settings

celery_app = Celery(
    "ecoplan",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.pdf_tasks",
        "app.tasks.sync_tasks",
        "app.tasks.email_tasks",
        "app.tasks.report_tasks",
        "app.tasks.clickhouse_sync",
        "app.tasks.ml_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Almaty",
    enable_utc=True,
    beat_schedule={
        "sync-passflow-every-hour": {
            "task": "app.tasks.sync_tasks.sync_passflow_routes",
            "schedule": 3600.0,
        },
        "sync-clickhouse-every-hour": {
            "task": "app.tasks.clickhouse_sync.sync_calculations_to_clickhouse",
            "schedule": 3600.0,
        },
        "train-anomaly-model-daily": {
            "task": "app.tasks.ml_tasks.train_anomaly_model",
            "schedule": 86400.0,
        },
        "train-pricing-model-daily": {
            "task": "app.tasks.ml_tasks.train_pricing_model",
            "schedule": 86400.0,
        },
        "train-prophet-daily": {
            "task": "app.tasks.ml_tasks.train_prophet_forecaster",
            "schedule": 86400.0,
        },
    },
)
