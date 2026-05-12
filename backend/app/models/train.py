from sqlalchemy import Column, String, DateTime, func, Integer, JSON
import uuid
from datetime import datetime
from app.database import Base


class Train(Base):
    __tablename__ = "trains"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number = Column(String, unique=True, index=True, nullable=False)
    route = Column(String, nullable=False)
    from_station = Column(String, nullable=False)
    to_station = Column(String, nullable=False)
    distance_km = Column(Integer, nullable=True)
    duration_hours = Column(Integer, nullable=True)

    # Schedule data from PassFlow
    schedule_data = Column(JSON, nullable=True)

    # Caching metadata
    cached_from_passflow = Column(String, nullable=True)  # Source of data
    synced_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Train {self.number} {self.route}>"
