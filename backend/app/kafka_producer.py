import json
from confluent_kafka import Producer
from app.config import settings

_producer = None

def get_producer():
    global _producer
    if _producer is None and settings.kafka_bootstrap_servers:
        _producer = Producer({"bootstrap.servers": settings.kafka_bootstrap_servers})
    return _producer

def publish_event(topic: str, event: dict):
    producer = get_producer()
    if producer:
        producer.produce(topic, json.dumps(event, default=str).encode("utf-8"))
        producer.flush()

# Convenience wrappers for domain events
def publish_calculation_created(calculation_id: str, train_number: str):
    publish_event("calculations.created", {
        "event": "calculation_created",
        "calculation_id": calculation_id,
        "train_number": train_number,
        "timestamp": json.dumps(None, default=str),
    })

def publish_passflow_event(train_number: str, event_type: str, station: str, delay_minutes: int = 0):
    publish_event("passflow.events", {
        "event": event_type,
        "train_number": train_number,
        "station": station,
        "delay_minutes": delay_minutes,
        "timestamp": json.dumps(None, default=str),
    })

def publish_anomaly_detected(calculation_id: str, anomalies: list):
    publish_event("anomaly.detected", {
        "event": "anomaly_detected",
        "calculation_id": calculation_id,
        "anomalies_count": len(anomalies),
        "timestamp": json.dumps(None, default=str),
    })

def publish_pricing_updated(train_number: str, recommended_price: float):
    publish_event("pricing.updated", {
        "event": "pricing_updated",
        "train_number": train_number,
        "recommended_price": recommended_price,
        "timestamp": json.dumps(None, default=str),
    })
