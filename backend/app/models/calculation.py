from sqlalchemy import Column, String, Boolean, DateTime, func, ForeignKey, Text, Numeric, JSON
import uuid
from datetime import datetime
from app.database import Base
from app.core.constants import CalculationStatus


class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    train_number = Column(String, nullable=False)
    branch = Column(String, nullable=True)  # KTZ branch for RBAC filtering

    # Train and configuration data
    train_info = Column(JSON, nullable=True)
    wagon_types = Column(JSON, nullable=True)
    occupancy = Column(Numeric, nullable=True)
    route_type = Column(String, nullable=True)
    train_type = Column(String, nullable=True)

    # Revenue data
    revenue = Column(JSON, nullable=True)

    # Expense items
    expenses = Column(JSON, nullable=True)

    # Calculated results
    financial_result = Column(JSON, nullable=True)
    anomalies = Column(JSON, nullable=True)
    anomaly_explanation = Column(Text, nullable=True)

    # Status and approvals
    status = Column(String, default=CalculationStatus.DRAFT.value)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(36), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(String(36), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Audit and timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Calculation {self.id} train={self.train_number} status={self.status} branch={self.branch}>"
