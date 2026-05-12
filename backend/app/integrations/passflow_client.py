"""Async HTTP client for PassFlow integration with caching and 2-way sync."""
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.kafka_producer import publish_passflow_event


class PassFlowClient:
    def __init__(self):
        self.base_url = settings.passflow_api_url or "http://localhost:8000/passflow"
        self.api_key = settings.passflow_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_routes(self, search: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"q": search} if search else {}
        r = await self.client.get(f"{self.base_url}/routes", params=params)
        r.raise_for_status()
        return r.json()

    async def get_route(self, number: str) -> Optional[Dict[str, Any]]:
        r = await self.client.get(f"{self.base_url}/routes/{number}")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    async def sync_routes(self) -> Dict[str, Any]:
        r = await self.client.post(f"{self.base_url}/sync")
        r.raise_for_status()
        return r.json()

    async def get_route_status(self, number: str) -> Optional[Dict[str, Any]]:
        """Get real-time route status (arrival/departure times)."""
        r = await self.client.get(f"{self.base_url}/routes/{number}/status")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    async def get_delays(self, number: str) -> List[Dict[str, Any]]:
        """Get delay history for a route."""
        r = await self.client.get(f"{self.base_url}/routes/{number}/delays")
        if r.status_code == 404:
            return []
        r.raise_for_status()
        return r.json()

    def publish_arrival_event(self, train_number: str, station: str, delay_minutes: int = 0):
        """Publish arrival event to Kafka for downstream processing."""
        publish_passflow_event(train_number, "arrival", station, delay_minutes)

    def publish_departure_event(self, train_number: str, station: str, delay_minutes: int = 0):
        """Publish departure event to Kafka for downstream processing."""
        publish_passflow_event(train_number, "departure", station, delay_minutes)


passflow_client = PassFlowClient()
