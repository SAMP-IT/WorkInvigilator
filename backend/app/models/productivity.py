from sqlalchemy import Column, DateTime, ForeignKey, Integer, Date, DECIMAL, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class ProductivityMetric(Base):
    __tablename__ = "productivity_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    focus_time_seconds = Column(Integer, default=0)
    idle_time_seconds = Column(Integer, default=0)
    active_time_seconds = Column(Integer, default=0)
    break_time_seconds = Column(Integer, default=0)
    productivity_score = Column(DECIMAL(5, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", "date", name="uq_prod_user_org_date"),
    )

    user = relationship("Profile", back_populates="productivity_metrics")
    organization = relationship("Organization", back_populates="productivity_metrics")
