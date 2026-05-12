from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.celery_app import celery_app
from prometheus_fastapi_instrumentator import Instrumentator
from app.database import engine, Base
from app.models import User, Calculation, Tariff, AuditLog, Train


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    # Start Kafka background consumers
    from app.kafka_consumer import start_background_consumers
    consumer_threads = start_background_consumers()
    print(f"Started {len(consumer_threads)} Kafka consumer threads")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Automated budget planning system for KTZh railway",
    lifespan=lifespan,
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.ktz.kz"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs"
    }


# Import and include API routes
from app.api import auth, calculations, tariffs, audit_logs, trains, users, dashboard, reports, analytics, passflow, claims, ml, accounting, tablo
app.include_router(auth.router)
app.include_router(calculations.router)
app.include_router(tariffs.router)
app.include_router(audit_logs.router)
app.include_router(trains.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(passflow.router)
app.include_router(claims.router)
app.include_router(ml.router)
app.include_router(accounting.router)
app.include_router(tablo.router)
