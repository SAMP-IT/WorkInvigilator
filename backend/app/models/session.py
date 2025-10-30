from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class RecordingSession(Base):
    __tablename__ = "recording_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    session_start_time = Column(DateTime, nullable=False)
    session_end_time = Column(DateTime)
    total_duration_seconds = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    total_chunk_duration_seconds = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("Profile", back_populates="recording_sessions")
    organization = relationship("Organization", back_populates="recording_sessions")
    screenshots = relationship("Screenshot", back_populates="session")
    audio_recordings = relationship("AudioRecording", back_populates="session")
