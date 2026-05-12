from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    app_name: str = "EcoPlan Hub"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./ecoplan.db"

    # JWT
    jwt_secret_key: str = "your-super-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    jwt_refresh_expiration_days: int = 7

    # CORS
    cors_origins: List[str] = ["*"]

    # PassFlow Integration
    passflow_api_url: str = "http://passflow-api/api"
    passflow_api_key: str = "api-key"
    passflow_sync_hours: int = 24

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Infrastructure
    redis_url: str = "redis://localhost:6379/0"
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    kafka_bootstrap_servers: str = "localhost:9092"

    # Telegram Bot
    telegram_bot_token: str = ""
    bot_demo_mode: bool = True
    admin_chat_ids: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
