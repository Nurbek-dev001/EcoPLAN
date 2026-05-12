from sqlalchemy import Column, String, DateTime, func, ForeignKey, Numeric, Date
import uuid
from datetime import datetime
from app.database import Base


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)  # Shymkent, Almaty, Astana, etc
    category = Column(String, nullable=False)  # МЖС, Вода, Топливо, etc
    value = Column(Numeric, nullable=False)
    unit = Column(String, nullable=True)  # per wagon, per km, per month, etc

    # Temporal support
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)  # NULL means currently active

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    def __repr__(self):
        return f"<Tariff {self.name} {self.region} {self.category}={self.value} {self.unit}>"
