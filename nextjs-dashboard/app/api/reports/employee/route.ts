import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const reportType = searchParams.get('reportType') || 'daily' // daily or weekly
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId || !employeeId) {
      return NextResponse.json(
        { error: 'Organization ID and Employee ID are required' },
        { status: 400 }
      )
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, role, shift_start_time, shift_end_time')
      .eq('id', employeeId)
      .eq('organization_id', organizationId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Determine date range
    let start: string, end: string
    if (startDate && endDate) {
      start = startDate
      end = endDate
    } else if (reportType === 'daily') {
      // Today's report
      const today = new Date().toISOString().split('T')[0]
      start = today
      end = today
    } else {
      // Weekly report (last 7 days)
      const endDay = new Date()
      const startDay = new Date()
      startDay.setDate(endDay.getDate() - 6)
      start = startDay.toISOString().split('T')[0]
      end = endDay.toISOString().split('T')[0]
    }

    // Get work hours settings
    const { data: settings } = await supabaseAdmin
      .from('work_hours_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    const expectedStartTime = employee.shift_start_time || settings?.work_start_time || '09:00:00'
    const expectedEndTime = employee.shift_end_time || settings?.work_end_time || '17:00:00'
    const lateThreshold = settings?.late_threshold_minutes || 15

    // Get attendance records
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        idle_periods(
          id,
          idle_start_time,
          idle_end_time,
          duration_seconds
        )
      `)
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return NextResponse.json(
        { error: 'Failed to fetch attendance records' },
        { status: 500 }
      )
    }

    // Get recording sessions
    const { data: sessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('session_start_time', start + 'T00:00:00Z')
      .lte('session_start_time', end + 'T23:59:59Z')

    // Get activity logs for productivity
    const { data: activities } = await supabaseAdmin
      .from('activity_logs')
      .select('category, duration_seconds')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('start_time', start + 'T00:00:00Z')
      .lte('start_time', end + 'T23:59:59Z')
      .not('duration_seconds', 'is', null)

    // Calculate productivity
    const productiveTime = activities
      ?.filter(a => a.category === 'productive')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const neutralTime = activities
      ?.filter(a => a.category === 'neutral')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const unproductiveTime = activities
      ?.filter(a => a.category === 'unproductive')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const totalActivityTime = productiveTime + neutralTime + unproductiveTime

    const productivityPercentage = totalActivityTime > 0
      ? Math.round(((productiveTime * 100 + neutralTime * 50) / totalActivityTime))
      : 0

    // Calculate totals
    let totalWorkedSeconds = 0
    let totalBreakSeconds = 0
    let totalIdleSeconds = 0
    let totalDaysPresent = 0
    let totalDaysLate = 0
    let totalDaysAbsent = 0
    let earlyLogouts = 0
    let lateStarts = 0
    let onTimeStarts = 0

    const dailyBreakdown = attendanceRecords?.map(record => {
      const workSeconds = record.total_work_seconds || 0
      const breakSeconds = record.total_break_seconds || 0
      const idleSeconds = record.total_idle_seconds || 0

      totalWorkedSeconds += workSeconds
      totalBreakSeconds += breakSeconds
      totalIdleSeconds += idleSeconds

      if (record.status !== 'absent') {
        totalDaysPresent++
      } else {
        totalDaysAbsent++
      }

      if (record.is_late) {
        totalDaysLate++
        lateStarts++
      } else if (record.clock_in_time) {
        onTimeStarts++
      }

      // Check for early logout
      let isEarlyLogout = false
      if (record.clock_out_time && expectedEndTime) {
        const clockOutTime = new Date(record.clock_out_time)
        const clockOutHour = clockOutTime.getHours()
        const clockOutMinute = clockOutTime.getMinutes()
        const clockOutTotalMinutes = clockOutHour * 60 + clockOutMinute

        const [expectedHour, expectedMinute] = expectedEndTime.split(':').map(Number)
        const expectedTotalMinutes = expectedHour * 60 + expectedMinute

        if (clockOutTotalMinutes < expectedTotalMinutes - 15) { // 15 min threshold
          isEarlyLogout = true
          earlyLogouts++
        }
      }

      return {
        date: record.date,
        clockInTime: record.clock_in_time,
        clockOutTime: record.clock_out_time,
        totalWorkTime: formatDuration(workSeconds),
        totalWorkSeconds: workSeconds,
        totalBreakTime: formatDuration(breakSeconds),
        totalIdleTime: formatDuration(idleSeconds),
        status: record.status,
        isLate: record.is_late,
        lateByMinutes: record.late_by_minutes,
        isEarlyLogout,
        idlePeriods: record.idle_periods?.length || 0,
        autoClockIn: record.auto_clocked_in,
        autoClockOut: record.auto_clocked_out
      }
    }) || []

    // Calculate expected work days
    const startDay = new Date(start)
    const endDay = new Date(end)
    let expectedWorkDays = 0
    const currentDay = new Date(startDay)

    while (currentDay <= endDay) {
      const dayOfWeek = currentDay.getDay()
      // Assuming Mon-Fri are work days (1-5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        expectedWorkDays++
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Attendance rate
    const attendanceRate = expectedWorkDays > 0
      ? Math.round((totalDaysPresent / expectedWorkDays) * 100)
      : 0

    // Average daily work hours
    const avgDailyWorkSeconds = totalDaysPresent > 0
      ? totalWorkedSeconds / totalDaysPresent
      : 0

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        role: employee.role,
        expectedStartTime,
        expectedEndTime
      },
      period: {
        startDate: start,
        endDate: end,
        reportType,
        totalDays: expectedWorkDays
      },
      summary: {
        totalWorkedTime: formatDuration(totalWorkedSeconds),
        totalWorkedSeconds,
        totalBreakTime: formatDuration(totalBreakSeconds),
        totalBreakSeconds,
        totalIdleTime: formatDuration(totalIdleSeconds),
        totalIdleSeconds,
        productivityPercentage,
        productiveTime: formatDuration(productiveTime),
        neutralTime: formatDuration(neutralTime),
        unproductiveTime: formatDuration(unproductiveTime),
        averageDailyWorkTime: formatDuration(avgDailyWorkSeconds),
        daysPresent: totalDaysPresent,
        daysAbsent: totalDaysAbsent,
        daysLate: totalDaysLate,
        attendanceRate: attendanceRate + '%',
        lateStarts,
        earlyLogouts,
        onTimeStarts,
        totalSessions: sessions?.length || 0
      },
      dailyBreakdown,
      insights: {
        punctuality: lateStarts === 0 ? 'Excellent' : lateStarts <= 2 ? 'Good' : 'Needs Improvement',
        productivity: productivityPercentage >= 85 ? 'Excellent' : productivityPercentage >= 70 ? 'Good' : 'Needs Improvement',
        attendance: attendanceRate >= 95 ? 'Excellent' : attendanceRate >= 85 ? 'Good' : 'Needs Improvement',
        idleTimeRatio: totalWorkedSeconds > 0
          ? Math.round((totalIdleSeconds / totalWorkedSeconds) * 100) + '%'
          : '0%'
      }
    })

  } catch (error) {
    console.error('Employee report API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
