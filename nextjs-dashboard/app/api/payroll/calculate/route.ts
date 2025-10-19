import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeDeductions = searchParams.get('includeDeductions') === 'true'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Get employees with hourly rates
    let employeeQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, hourly_rate, shift_start_time, shift_end_time')
      .eq('organization_id', organizationId)
      .eq('role', 'employee')

    if (employeeId) {
      employeeQuery = employeeQuery.eq('id', employeeId)
    }

    const { data: employees, error: employeeError } = await employeeQuery

    if (employeeError || !employees) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    // Get attendance records for the period
    const { data: attendanceRecords } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', start)
      .lte('date', end)

    // Get activity logs for productivity deductions
    const { data: activities } = await supabaseAdmin
      .from('activity_logs')
      .select('user_id, category, duration_seconds')
      .eq('organization_id', organizationId)
      .gte('start_time', start + 'T00:00:00Z')
      .lte('start_time', end + 'T23:59:59Z')
      .not('duration_seconds', 'is', null)

    // Calculate payroll for each employee
    const payrollData = employees.map(employee => {
      const hourlyRate = parseFloat(employee.hourly_rate?.toString() || '0')

      // Get employee's attendance
      const employeeAttendance = attendanceRecords?.filter(a => a.user_id === employee.id) || []

      // Calculate total hours
      let totalWorkedSeconds = 0
      let totalIdleSeconds = 0
      let totalBreakSeconds = 0
      let regularHoursSeconds = 0
      let overtimeSeconds = 0

      // Expected daily hours (8 hours default)
      const expectedDailySeconds = 8 * 3600

      employeeAttendance.forEach(record => {
        const workedSeconds = record.total_work_seconds || 0
        totalWorkedSeconds += workedSeconds
        totalIdleSeconds += record.total_idle_seconds || 0
        totalBreakSeconds += record.total_break_seconds || 0

        // Calculate overtime (anything over 8 hours per day)
        if (workedSeconds > expectedDailySeconds) {
          overtimeSeconds += workedSeconds - expectedDailySeconds
          regularHoursSeconds += expectedDailySeconds
        } else {
          regularHoursSeconds += workedSeconds
        }
      })

      // Get productivity data
      const employeeActivities = activities?.filter(a => a.user_id === employee.id) || []
      const productiveSeconds = employeeActivities
        .filter(a => a.category === 'productive')
        .reduce((sum, a) => sum + (a.duration_seconds || 0), 0)

      const unproductiveSeconds = employeeActivities
        .filter(a => a.category === 'unproductive')
        .reduce((sum, a) => sum + (a.duration_seconds || 0), 0)

      const totalActivitySeconds = employeeActivities
        .reduce((sum, a) => sum + (a.duration_seconds || 0), 0)

      const productivityPercentage = totalActivitySeconds > 0
        ? (productiveSeconds / totalActivitySeconds) * 100
        : 0

      // Calculate pay
      const regularHours = regularHoursSeconds / 3600
      const overtimeHours = overtimeSeconds / 3600
      const idleHours = totalIdleSeconds / 3600
      const unproductiveHours = unproductiveSeconds / 3600

      const regularPay = regularHours * hourlyRate
      const overtimePay = overtimeHours * hourlyRate * 1.5 // 1.5x for overtime

      let deductions = 0
      const deductionBreakdown: any[] = []

      if (includeDeductions) {
        // Deduct idle time (optional)
        const idleDeduction = idleHours * hourlyRate
        if (idleDeduction > 0) {
          deductions += idleDeduction
          deductionBreakdown.push({
            type: 'Idle Time',
            hours: idleHours.toFixed(2),
            amount: idleDeduction.toFixed(2)
          })
        }

        // Deduct unproductive time (optional, at 50% rate)
        const unproductiveDeduction = unproductiveHours * hourlyRate * 0.5
        if (unproductiveDeduction > 0) {
          deductions += unproductiveDeduction
          deductionBreakdown.push({
            type: 'Unproductive Time (50%)',
            hours: unproductiveHours.toFixed(2),
            amount: unproductiveDeduction.toFixed(2)
          })
        }
      }

      const grossPay = regularPay + overtimePay
      const netPay = grossPay - deductions

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        department: employee.department,
        hourlyRate: hourlyRate.toFixed(2),
        hours: {
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          totalHours: (regularHours + overtimeHours).toFixed(2),
          idleHours: idleHours.toFixed(2),
          unproductiveHours: unproductiveHours.toFixed(2)
        },
        pay: {
          regularPay: regularPay.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          grossPay: grossPay.toFixed(2),
          deductions: deductions.toFixed(2),
          netPay: netPay.toFixed(2)
        },
        deductionBreakdown,
        productivity: {
          percentage: productivityPercentage.toFixed(1),
          productiveHours: (productiveSeconds / 3600).toFixed(2),
          unproductiveHours: (unproductiveSeconds / 3600).toFixed(2)
        },
        daysWorked: employeeAttendance.length
      }
    })

    // Calculate totals
    const totals = payrollData.reduce((acc, emp) => ({
      totalRegularHours: acc.totalRegularHours + parseFloat(emp.hours.regularHours),
      totalOvertimeHours: acc.totalOvertimeHours + parseFloat(emp.hours.overtimeHours),
      totalGrossPay: acc.totalGrossPay + parseFloat(emp.pay.grossPay),
      totalDeductions: acc.totalDeductions + parseFloat(emp.pay.deductions),
      totalNetPay: acc.totalNetPay + parseFloat(emp.pay.netPay),
      totalEmployees: acc.totalEmployees + 1
    }), {
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      totalEmployees: 0
    })

    return NextResponse.json({
      payrollData: payrollData.sort((a, b) => parseFloat(b.pay.netPay) - parseFloat(a.pay.netPay)),
      totals: {
        ...totals,
        totalRegularHours: totals.totalRegularHours.toFixed(2),
        totalOvertimeHours: totals.totalOvertimeHours.toFixed(2),
        totalGrossPay: totals.totalGrossPay.toFixed(2),
        totalDeductions: totals.totalDeductions.toFixed(2),
        totalNetPay: totals.totalNetPay.toFixed(2)
      },
      period: {
        startDate: start,
        endDate: end
      },
      settings: {
        includeDeductions,
        overtimeMultiplier: 1.5,
        idleDeductionRate: 1.0,
        unproductiveDeductionRate: 0.5
      }
    })

  } catch (error) {
    console.error('Payroll calculation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
