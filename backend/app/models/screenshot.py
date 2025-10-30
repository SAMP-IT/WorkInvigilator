from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base


class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("recording_sessions.id", ondelete="SET NULL"))
    filename = Column(String(500), nullable=False)
    file_url = Column(String, nullable=False)
    file_size_bytes = Column(BigInteger)
    storage_provider = Column(String(50), default="backblaze")
    backblaze_file_id = Column(String(255))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("Profile", back_populates="screenshots")
    organization = relationship("Organization", back_populates="screenshots")
    session = relationship("RecordingSession", back_populates="screenshots")
