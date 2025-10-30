from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, DECIMAL, Date, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base


class ApplicationUsage(Base):
    __tablename__ = "application_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_name = Column(String(255), nullable=False)
    window_title = Column(String(500))
    category = Column(String(100))
    duration_seconds = Column(Integer, default=0)
    usage_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("Profile")
    organization = relationship("Organization")


class IdleTimeLog(Base):
    __tablename__ = "idle_time_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("recording_sessions.id", ondelete="SET NULL"), nullable=True)
    idle_start_time = Column(DateTime, nullable=False)
    idle_end_time = Column(DateTime)
    duration_seconds = Column(Integer, default=0)
    idle_type = Column(String(50), default="inactive")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("Profile")
    organization = relationship("Organization")
    session = relationship("RecordingSession")


class ProductivityHeatmap(Base):
    __tablename__ = "productivity_heatmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    hour = Column(Integer, nullable=False)
    productivity_score = Column(DECIMAL(5, 2), default=0)
    active_minutes = Column(Integer, default=0)
    idle_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("Profile")
    organization = relationship("Organization")


class CustomReport(Base):
    __tablename__ = "custom_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    report_type = Column(String(100), nullable=False)
    filters = Column(JSON)
    columns = Column(JSON)
    schedule = Column(String(50))
    is_active = Column(String(50), default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    creator = relationship("Profile")


class ReportExecution(Base):
    __tablename__ = "report_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("custom_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    executed_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="pending")
    file_url = Column(String(500))
    record_count = Column(Integer)
    error_message = Column(Text)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)

    report = relationship("CustomReport")
    executor = relationship("Profile")
