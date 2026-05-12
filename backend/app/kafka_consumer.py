import json
import threading
import time
from confluent_kafka import Consumer, KafkaError
from app.config import settings


def start_consumer(topics: list, group_id: str = "ecoplan"):
    if not settings.kafka_bootstrap_servers:
        return None
    consumer = Consumer({
        "bootstrap.servers": settings.kafka_bootstrap_servers,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe(topics)
    return consumer


def process_passflow_event(event_data: dict):
    """Process PassFlow arrival/departure events."""
    from app.tasks.sync_tasks import recalculate_expenses_on_arrival
    recalculate_expenses_on_arrival.delay(event_data)


def process_anomaly_event(event_data: dict):
    """Process anomaly detection events."""
    # Could trigger email alerts, logging, etc.
    pass


def process_calculation_event(event_data: dict):
    """Process new calculation events."""
    # Could trigger ClickHouse sync, email notifications, etc.
    from app.tasks.clickhouse_sync import sync_calculations_to_clickhouse
    sync_calculations_to_clickhouse.delay()


def run_consumer(topics: list, group_id: str = "ecoplan"):
    """Blocking consumer loop for background thread."""
    consumer = start_consumer(topics, group_id)
    if not consumer:
        return

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    break

            try:
                event_data = json.loads(msg.value().decode("utf-8"))
                topic = msg.topic()

                if topic == "passflow.events":
                    process_passflow_event(event_data)
                elif topic == "anomaly.detected":
                    process_anomaly_event(event_data)
                elif topic == "calculations.created":
                    process_calculation_event(event_data)
            except Exception:
                pass
    finally:
        consumer.close()


def start_background_consumers():
    """Start Kafka consumers in background threads."""
    if not settings.kafka_bootstrap_servers:
        return []

    topics = ["passflow.events", "anomaly.detected", "calculations.created"]
    thread = threading.Thread(target=run_consumer, args=(topics, "ecopan-main"), daemon=True)
    thread.start()
    return [thread]
