from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Date, DECIMAL, Text, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    clock_in_time = Column(DateTime)
    clock_out_time = Column(DateTime)
    first_activity_time = Column(DateTime)
    last_activity_time = Column(DateTime)
    is_late = Column(Boolean, default=False)
    late_by_minutes = Column(Integer, default=0)
    status = Column(String(20), nullable=False, default="present")
    auto_clocked_in = Column(Boolean, default=False)
    clock_in_location_lat = Column(DECIMAL(10, 8))
    clock_in_location_lng = Column(DECIMAL(11, 8))
    clock_out_location_lat = Column(DECIMAL(10, 8))
    clock_out_location_lng = Column(DECIMAL(11, 8))
    clock_in_verified = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", "date", name="uq_user_org_date"),
    )

    user = relationship("Profile", back_populates="attendance_records")
    organization = relationship("Organization", back_populates="attendance_records")


class WorkHoursSetting(Base):
    __tablename__ = "work_hours_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True)
    work_start_time = Column(Time, nullable=False, default="09:00:00")
    work_end_time = Column(Time, nullable=False, default="17:00:00")
    late_threshold_minutes = Column(Integer, default=15)
    break_duration_minutes = Column(Integer, default=60)
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="work_hours_settings")
