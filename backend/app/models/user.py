from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, DECIMAL, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    logo_url = Column(String(500))
    primary_color = Column(String(7))
    secondary_color = Column(String(7))
    custom_domain = Column(String(255))
    billing_email = Column(String(255))
    plan_type = Column(String(50), default="free")
    max_users = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profiles = relationship("Profile", back_populates="organization")
    attendance_records = relationship("AttendanceRecord", back_populates="organization")
    recording_sessions = relationship("RecordingSession", back_populates="organization")
    screenshots = relationship("Screenshot", back_populates="organization")
    audio_recordings = relationship("AudioRecording", back_populates="organization")
    productivity_metrics = relationship("ProductivityMetric", back_populates="organization")
    work_hours_settings = relationship("WorkHoursSetting", back_populates="organization", uselist=False)
    teams = relationship("Team", back_populates="organization")
    roles = relationship("Role", back_populates="organization")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    department = Column(String(100))
    role = Column(String(20), nullable=False, default="user")
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    hourly_rate = Column(DECIMAL(10, 2))
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="profiles")
    attendance_records = relationship("AttendanceRecord", back_populates="user")
    recording_sessions = relationship("RecordingSession", back_populates="user")
    screenshots = relationship("Screenshot", back_populates="user")
    audio_recordings = relationship("AudioRecording", back_populates="user")
    productivity_metrics = relationship("ProductivityMetric", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")
    user_roles = relationship("UserRole", back_populates="user")
    managed_teams = relationship("Team", foreign_keys="Team.manager_id", back_populates="manager")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("Profile", back_populates="refresh_tokens")
