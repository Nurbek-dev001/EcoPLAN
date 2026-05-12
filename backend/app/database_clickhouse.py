import clickhouse_connect
from app.config import settings

_clickhouse_client = None

def get_clickhouse_client():
    global _clickhouse_client
    if _clickhouse_client is None:
        _clickhouse_client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
        )
    return _clickhouse_client
