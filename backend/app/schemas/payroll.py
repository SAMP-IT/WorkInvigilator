from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class PayrollCycleCreate(BaseModel):
    cycle_name: str = Field(..., max_length=100)
    start_date: date
    end_date: date
    payment_date: date


class PayrollCycleUpdate(BaseModel):
    cycle_name: Optional[str] = Field(None, max_length=100)
    payment_date: Optional[date]
    status: Optional[str]


class PayrollCycleResponse(BaseModel):
    id: UUID
    organization_id: UUID
    cycle_name: str
    start_date: date
    end_date: date
    payment_date: date
    status: str
    total_amount: Decimal
    processed_by: Optional[UUID]
    processed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimesheetResponse(BaseModel):
    id: UUID
    user_id: UUID
    payroll_cycle_id: UUID
    regular_hours: Decimal
    overtime_hours: Decimal
    break_hours: Decimal
    total_hours: Decimal
    hourly_rate: Decimal
    overtime_rate: Decimal
    regular_pay: Decimal
    overtime_pay: Decimal
    gross_pay: Decimal
    status: str
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]

    class Config:
        from_attributes = True


class BonusCreate(BaseModel):
    bonus_type: str = Field(..., max_length=100)
    amount: Decimal = Field(..., gt=0)
    description: Optional[str]


class BonusResponse(BaseModel):
    id: UUID
    timesheet_id: UUID
    user_id: UUID
    bonus_type: str
    amount: Decimal
    description: Optional[str]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DeductionCreate(BaseModel):
    deduction_type: str = Field(..., max_length=100)
    amount: Decimal = Field(..., gt=0)
    description: Optional[str]
    is_tax: bool = False


class DeductionResponse(BaseModel):
    id: UUID
    timesheet_id: UUID
    user_id: UUID
    deduction_type: str
    amount: Decimal
    description: Optional[str]
    is_tax: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TaxConfigurationCreate(BaseModel):
    tax_name: str = Field(..., max_length=100)
    tax_type: str = Field(..., max_length=50)
    rate: Decimal = Field(..., ge=0, le=100)
    threshold_amount: Optional[Decimal]


class TaxConfigurationUpdate(BaseModel):
    rate: Optional[Decimal] = Field(None, ge=0, le=100)
    threshold_amount: Optional[Decimal]
    is_active: Optional[bool]


class TaxConfigurationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    tax_name: str
    tax_type: str
    rate: Decimal
    threshold_amount: Optional[Decimal]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
