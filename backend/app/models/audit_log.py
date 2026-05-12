from sqlalchemy import Column, String, DateTime, func, ForeignKey, Text, JSON
import uuid
from datetime import datetime
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    entity_type = Column(String, nullable=False)  # calculation, tariff, user, train
    entity_id = Column(String(36), nullable=False)
    action = Column(String, nullable=False)  # create, update, delete, approve, reject, submit
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Immutable - no updates allowed
    __table_args__ = (
        # Note: In practice, we'd use database triggers to enforce immutability
        # For now, we rely on application-level enforcement in the audit service
    )

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type} {self.entity_id}>"
