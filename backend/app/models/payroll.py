from sqlalchemy import Column, String, ForeignKey, DateTime, DECIMAL, Date, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base


class PayrollCycle(Base):
    __tablename__ = "payroll_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=False)
    status = Column(String(50), default="pending")
    total_amount = Column(DECIMAL(12, 2), default=0)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    processor = relationship("Profile")
    timesheets = relationship("Timesheet", back_populates="payroll_cycle", cascade="all, delete-orphan")


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    payroll_cycle_id = Column(UUID(as_uuid=True), ForeignKey("payroll_cycles.id", ondelete="CASCADE"), nullable=False, index=True)
    regular_hours = Column(DECIMAL(10, 2), default=0)
    overtime_hours = Column(DECIMAL(10, 2), default=0)
    break_hours = Column(DECIMAL(10, 2), default=0)
    total_hours = Column(DECIMAL(10, 2), default=0)
    hourly_rate = Column(DECIMAL(10, 2), nullable=False)
    overtime_rate = Column(DECIMAL(10, 2), default=1.5)
    regular_pay = Column(DECIMAL(12, 2), default=0)
    overtime_pay = Column(DECIMAL(12, 2), default=0)
    gross_pay = Column(DECIMAL(12, 2), default=0)
    status = Column(String(50), default="draft")
    approved_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("Profile", foreign_keys=[user_id])
    organization = relationship("Organization")
    payroll_cycle = relationship("PayrollCycle", back_populates="timesheets")
    approver = relationship("Profile", foreign_keys=[approved_by])
    bonuses = relationship("Bonus", back_populates="timesheet")
    deductions = relationship("Deduction", back_populates="timesheet")


class Bonus(Base):
    __tablename__ = "bonuses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timesheet_id = Column(UUID(as_uuid=True), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    bonus_type = Column(String(100), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    description = Column(Text)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    timesheet = relationship("Timesheet", back_populates="bonuses")
    user = relationship("Profile", foreign_keys=[user_id])
    organization = relationship("Organization")
    approver = relationship("Profile", foreign_keys=[approved_by])


class Deduction(Base):
    __tablename__ = "deductions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timesheet_id = Column(UUID(as_uuid=True), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    deduction_type = Column(String(100), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    description = Column(Text)
    is_tax = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    timesheet = relationship("Timesheet", back_populates="deductions")
    user = relationship("Profile", foreign_keys=[user_id])
    organization = relationship("Organization")


class TaxConfiguration(Base):
    __tablename__ = "tax_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    tax_name = Column(String(100), nullable=False)
    tax_type = Column(String(50), nullable=False)
    rate = Column(DECIMAL(5, 2), nullable=False)
    threshold_amount = Column(DECIMAL(12, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
