from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.core.dependencies import get_current_admin
from app.models.user import Profile
from app.models.attendance import AttendanceRecord
from app.models.payroll import (
    PayrollCycle, Timesheet, Bonus, Deduction, TaxConfiguration
)
from app.models.attendance_extended import OvertimeRecord
from app.schemas.payroll import (
    PayrollCycleCreate, PayrollCycleUpdate, PayrollCycleResponse,
    TimesheetResponse, BonusCreate, BonusResponse,
    DeductionCreate, DeductionResponse,
    TaxConfigurationCreate, TaxConfigurationUpdate, TaxConfigurationResponse
)

router = APIRouter()


@router.post("/cycles", response_model=PayrollCycleResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll_cycle(
    cycle_data: PayrollCycleCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    new_cycle = PayrollCycle(
        organization_id=current_user.organization_id,
        **cycle_data.model_dump()
    )

    db.add(new_cycle)
    await db.commit()
    await db.refresh(new_cycle)

    from app.tasks.payroll import generate_timesheets
    generate_timesheets.delay(str(new_cycle.id))

    return new_cycle


@router.get("/cycles", response_model=List[PayrollCycleResponse])
async def list_payroll_cycles(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(PayrollCycle).where(
        PayrollCycle.organization_id == current_user.organization_id
    ).order_by(PayrollCycle.start_date.desc())

    result = await db.execute(query)
    cycles = result.scalars().all()

    return cycles


@router.get("/cycles/{cycle_id}", response_model=PayrollCycleResponse)
async def get_payroll_cycle(
    cycle_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(PayrollCycle).where(
        and_(
            PayrollCycle.id == cycle_id,
            PayrollCycle.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    cycle = result.scalar_one_or_none()

    if not cycle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll cycle not found")

    return cycle


@router.get("/cycles/{cycle_id}/timesheets", response_model=List[TimesheetResponse])
async def list_cycle_timesheets(
    cycle_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    cycle_query = select(PayrollCycle).where(
        and_(
            PayrollCycle.id == cycle_id,
            PayrollCycle.organization_id == current_user.organization_id
        )
    )

    cycle_result = await db.execute(cycle_query)
    cycle = cycle_result.scalar_one_or_none()

    if not cycle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll cycle not found")

    query = select(Timesheet).where(
        Timesheet.payroll_cycle_id == cycle_id
    ).order_by(Timesheet.created_at.desc())

    result = await db.execute(query)
    timesheets = result.scalars().all()

    return timesheets


@router.get("/timesheets/my-timesheet", response_model=TimesheetResponse)
async def get_my_timesheet(
    cycle_id: UUID = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Timesheet).where(
        and_(
            Timesheet.user_id == current_user.id,
            Timesheet.payroll_cycle_id == cycle_id
        )
    )

    result = await db.execute(query)
    timesheet = result.scalar_one_or_none()

    if not timesheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    return timesheet


@router.post("/timesheets/{timesheet_id}/approve", response_model=TimesheetResponse)
async def approve_timesheet(
    timesheet_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Timesheet).where(
        and_(
            Timesheet.id == timesheet_id,
            Timesheet.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    timesheet = result.scalar_one_or_none()

    if not timesheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    from datetime import datetime
    timesheet.status = "approved"
    timesheet.approved_by = current_user.id
    timesheet.approved_at = datetime.utcnow()

    await db.commit()
    await db.refresh(timesheet)

    return timesheet


@router.post("/timesheets/{timesheet_id}/bonuses", response_model=BonusResponse, status_code=status.HTTP_201_CREATED)
async def add_bonus(
    timesheet_id: UUID,
    bonus_data: BonusCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    timesheet_query = select(Timesheet).where(
        and_(
            Timesheet.id == timesheet_id,
            Timesheet.organization_id == current_user.organization_id
        )
    )

    timesheet_result = await db.execute(timesheet_query)
    timesheet = timesheet_result.scalar_one_or_none()

    if not timesheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    bonus = Bonus(
        timesheet_id=timesheet_id,
        user_id=timesheet.user_id,
        organization_id=current_user.organization_id,
        **bonus_data.model_dump()
    )

    db.add(bonus)
    await db.commit()
    await db.refresh(bonus)

    return bonus


@router.post("/timesheets/{timesheet_id}/deductions", response_model=DeductionResponse, status_code=status.HTTP_201_CREATED)
async def add_deduction(
    timesheet_id: UUID,
    deduction_data: DeductionCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    timesheet_query = select(Timesheet).where(
        and_(
            Timesheet.id == timesheet_id,
            Timesheet.organization_id == current_user.organization_id
        )
    )

    timesheet_result = await db.execute(timesheet_query)
    timesheet = timesheet_result.scalar_one_or_none()

    if not timesheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")

    deduction = Deduction(
        timesheet_id=timesheet_id,
        user_id=timesheet.user_id,
        organization_id=current_user.organization_id,
        **deduction_data.model_dump()
    )

    db.add(deduction)
    await db.commit()
    await db.refresh(deduction)

    return deduction


@router.post("/tax-configurations", response_model=TaxConfigurationResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_configuration(
    tax_data: TaxConfigurationCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    new_tax_config = TaxConfiguration(
        organization_id=current_user.organization_id,
        **tax_data.model_dump()
    )

    db.add(new_tax_config)
    await db.commit()
    await db.refresh(new_tax_config)

    return new_tax_config


@router.get("/tax-configurations", response_model=List[TaxConfigurationResponse])
async def list_tax_configurations(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TaxConfiguration).where(
        TaxConfiguration.organization_id == current_user.organization_id
    ).order_by(TaxConfiguration.created_at.desc())

    result = await db.execute(query)
    tax_configs = result.scalars().all()

    return tax_configs


@router.put("/tax-configurations/{tax_id}", response_model=TaxConfigurationResponse)
async def update_tax_configuration(
    tax_id: UUID,
    tax_data: TaxConfigurationUpdate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TaxConfiguration).where(
        and_(
            TaxConfiguration.id == tax_id,
            TaxConfiguration.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    tax_config = result.scalar_one_or_none()

    if not tax_config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax configuration not found")

    for field, value in tax_data.model_dump(exclude_unset=True).items():
        setattr(tax_config, field, value)

    await db.commit()
    await db.refresh(tax_config)

    return tax_config
