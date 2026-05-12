# EcoPlan Hub Backend

FastAPI-based backend service for the EcoPlan Hub automated budget planning system for KTZh railway.

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Docker (optional)

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Create admin user:
```bash
python -c "from app.core.security import get_password_hash; from app.database import SessionLocal; from app.models import User; db = SessionLocal(); admin = User(email='admin@ecoplan.local', password_hash=get_password_hash('admin123'), role='admin_nsi'); db.add(admin); db.commit(); print('Admin user created')"
```

### Run Development Server

```bash
uvicorn app.main:app --reload
```

Server will be available at http://localhost:8000

### Run with Docker

```bash
docker-compose up -d
```

## Project Structure

- `app/` - Main application code
  - `models/` - SQLAlchemy ORM models
  - `schemas/` - Pydantic request/response models
  - `api/` - API routes
  - `services/` - Business logic
  - `core/` - Security, exceptions, constants
  - `utils/` - Utilities and helpers
- `migrations/` - Alembic database migrations
- `tests/` - Unit and integration tests

## API Documentation

OpenAPI documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback migration:
```bash
alembic downgrade -1
```

## Authentication

Endpoints requiring authentication need a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Development Status

Phase 1: ✅ Backend foundation, database schema, authentication
Phase 2: Calculation engine, tariff management, PassFlow integration
Phase 3: ML services (forecasting, anomaly detection, trends, optimization)
Phase 4: Frontend integration
Phase 5: Admin panels and analytics
