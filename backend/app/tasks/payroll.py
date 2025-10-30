from celery import Task
from datetime import datetime
from typing import Dict, Any
from uuid import UUID
from decimal import Decimal

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.models.payroll import PayrollCycle, Timesheet, TaxConfiguration, Deduction
from app.models.user import Profile
from app.models.attendance import AttendanceRecord
from app.models.attendance_extended import OvertimeRecord
from sqlalchemy import select, and_, func


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


@celery_app.task(name="generate_timesheets", base=AsyncTask, bind=True)
async def generate_timesheets(self, cycle_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        cycle_query = select(PayrollCycle).where(PayrollCycle.id == UUID(cycle_id))
        cycle_result = await db.execute(cycle_query)
        cycle = cycle_result.scalar_one_or_none()

        if not cycle:
            return {'success': False, 'error': 'Payroll cycle not found'}

        users_query = select(Profile).where(
            and_(
                Profile.organization_id == cycle.organization_id,
                Profile.is_active == True
            )
        )
        users_result = await db.execute(users_query)
        users = users_result.scalars().all()

        timesheets_created = 0

        for user in users:
            attendance_query = select(
                func.sum(
                    func.extract('epoch', AttendanceRecord.clock_out_time) -
                    func.extract('epoch', AttendanceRecord.clock_in_time)
                ) / 3600
            ).where(
                and_(
                    AttendanceRecord.user_id == user.id,
                    AttendanceRecord.date >= cycle.start_date,
                    AttendanceRecord.date <= cycle.end_date,
                    AttendanceRecord.clock_out_time.isnot(None)
                )
            )
            attendance_result = await db.execute(attendance_query)
            total_hours = attendance_result.scalar() or 0

            overtime_query = select(
                func.sum(OvertimeRecord.overtime_hours)
            ).where(
                and_(
                    OvertimeRecord.user_id == user.id,
                    OvertimeRecord.date >= cycle.start_date,
                    OvertimeRecord.date <= cycle.end_date,
                    OvertimeRecord.status == "approved"
                )
            )
            overtime_result = await db.execute(overtime_query)
            overtime_hours = overtime_result.scalar() or 0

            regular_hours = Decimal(str(total_hours)) - Decimal(str(overtime_hours))
            overtime_hours = Decimal(str(overtime_hours))

            hourly_rate = user.hourly_rate or Decimal('0')
            overtime_rate = Decimal('1.5')

            regular_pay = regular_hours * hourly_rate
            overtime_pay = overtime_hours * hourly_rate * overtime_rate
            gross_pay = regular_pay + overtime_pay

            timesheet = Timesheet(
                user_id=user.id,
                organization_id=cycle.organization_id,
                payroll_cycle_id=cycle.id,
                regular_hours=regular_hours,
                overtime_hours=overtime_hours,
                total_hours=regular_hours + overtime_hours,
                hourly_rate=hourly_rate,
                overtime_rate=overtime_rate,
                regular_pay=regular_pay,
                overtime_pay=overtime_pay,
                gross_pay=gross_pay,
                status="draft"
            )

            db.add(timesheet)
            await db.flush()

            tax_query = select(TaxConfiguration).where(
                and_(
                    TaxConfiguration.organization_id == cycle.organization_id,
                    TaxConfiguration.is_active == True
                )
            )
            tax_result = await db.execute(tax_query)
            tax_configs = tax_result.scalars().all()

            for tax_config in tax_configs:
                if tax_config.threshold_amount and gross_pay < tax_config.threshold_amount:
                    continue

                tax_amount = gross_pay * (tax_config.rate / Decimal('100'))

                deduction = Deduction(
                    timesheet_id=timesheet.id,
                    user_id=user.id,
                    organization_id=cycle.organization_id,
                    deduction_type=tax_config.tax_name,
                    amount=tax_amount,
                    description=f"Automatic {tax_config.tax_type} tax deduction",
                    is_tax=True
                )

                db.add(deduction)

            timesheets_created += 1

        await db.commit()

        return {
            'success': True,
            'cycle_id': cycle_id,
            'timesheets_created': timesheets_created
        }


@celery_app.task(name="process_payroll_cycle", base=AsyncTask, bind=True)
async def process_payroll_cycle(self, cycle_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        cycle_query = select(PayrollCycle).where(PayrollCycle.id == UUID(cycle_id))
        cycle_result = await db.execute(cycle_query)
        cycle = cycle_result.scalar_one_or_none()

        if not cycle:
            return {'success': False, 'error': 'Payroll cycle not found'}

        timesheets_query = select(Timesheet).where(
            Timesheet.payroll_cycle_id == cycle.id
        )
        timesheets_result = await db.execute(timesheets_query)
        timesheets = timesheets_result.scalars().all()

        total_amount = Decimal('0')

        for timesheet in timesheets:
            if timesheet.status == "approved":
                total_amount += timesheet.gross_pay

        cycle.total_amount = total_amount
        cycle.status = "processed"
        cycle.processed_at = datetime.utcnow()

        await db.commit()

        return {
            'success': True,
            'cycle_id': cycle_id,
            'total_amount': float(total_amount),
            'timesheets_count': len(timesheets)
        }
