from sqlalchemy import Column, String, Boolean, DateTime, func
import uuid
from datetime import datetime
from app.database import Base
from app.core.constants import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default=UserRole.MANAGER.value)
    branch = Column(String, nullable=True)  # KTZ branch (Астана, Алматы, etc.)
    active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.email} ({self.role}) branch={self.branch}>"
