from sqlalchemy import Column, String, DateTime, func, ForeignKey, Numeric, Text
import uuid
from datetime import datetime
from app.database import Base


class ClaimExpense(Base):
    __tablename__ = "claim_expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bin = Column(String(12), nullable=False, index=True)
    company_name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    judge_name = Column(String, nullable=True)

    # Amount breakdown
    duty_amount = Column(Numeric, nullable=False, default=0)
    penalty_amount = Column(Numeric, nullable=False, default=0)
    attorney_fee = Column(Numeric, nullable=False, default=0)
    total_amount = Column(Numeric, nullable=False, default=0)

    status = Column(String, nullable=False, default="pending")  # pending, resolved, rejected
    description = Column(Text, nullable=True)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ClaimExpense {self.bin} {self.company_name} {self.status}>"
