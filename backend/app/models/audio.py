from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, BigInteger, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class AudioRecording(Base):
    __tablename__ = "audio_recordings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("recording_sessions.id", ondelete="SET NULL"))
    filename = Column(String(500), nullable=False)
    file_url = Column(String, nullable=False)
    file_size_bytes = Column(BigInteger)
    duration_seconds = Column(Integer)
    storage_provider = Column(String(50), default="backblaze")
    backblaze_file_id = Column(String(255))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("Profile", back_populates="audio_recordings")
    organization = relationship("Organization", back_populates="audio_recordings")
    session = relationship("RecordingSession", back_populates="audio_recordings")
