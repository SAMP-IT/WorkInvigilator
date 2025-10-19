import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const violationType = searchParams.get('type') // 'late' | 'early' | 'all'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Get work hours settings
    const { data: settings } = await supabaseAdmin
      .from('work_hours_settings')
      .select('work_end_time')
      .eq('organization_id', organizationId)
      .single()

    const expectedEndTime = settings?.work_end_time || '17:00:00'

    // Get attendance records
    const { data: attendanceRecords, error } = await supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        user:profiles!attendance_records_user_id_fkey(
          id,
          name,
          email,
          department,
          shift_start_time,
          shift_end_time
        )
      `)
      .eq('organization_id', organizationId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching attendance records:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendance violations' },
        { status: 500 }
      )
    }

    // Process violations
    const lateStarts: any[] = []
    const earlyLogouts: any[] = []

    attendanceRecords?.forEach(record => {
      if (!record.user) return

      const expectedEnd = record.user.shift_end_time || expectedEndTime

      // Check for late start
      if (record.is_late && record.clock_in_time) {
        lateStarts.push({
          id: record.id,
          date: record.date,
          employeeName: record.user.name,
          employeeEmail: record.user.email,
          department: record.user.department || 'N/A',
          clockInTime: record.clock_in_time,
          lateByMinutes: record.late_by_minutes,
          expectedStartTime: record.user.shift_start_time || '09:00:00',
          type: 'Late Start'
        })
      }

      // Check for early logout
      if (record.clock_out_time) {
        const clockOutTime = new Date(record.clock_out_time)
        const clockOutHour = clockOutTime.getHours()
        const clockOutMinute = clockOutTime.getMinutes()
        const clockOutTotalMinutes = clockOutHour * 60 + clockOutMinute

        const [expectedHour, expectedMinute] = expectedEnd.split(':').map(Number)
        const expectedTotalMinutes = expectedHour * 60 + expectedMinute

        const earlyByMinutes = expectedTotalMinutes - clockOutTotalMinutes

        if (earlyByMinutes > 15) { // More than 15 minutes early
          earlyLogouts.push({
            id: record.id,
            date: record.date,
            employeeName: record.user.name,
            employeeEmail: record.user.email,
            department: record.user.department || 'N/A',
            clockOutTime: record.clock_out_time,
            earlyByMinutes,
            expectedEndTime: expectedEnd,
            type: 'Early Logout'
          })
        }
      }
    })

    // Combine and filter based on type
    let violations = []
    if (violationType === 'late' || !violationType || violationType === 'all') {
      violations = [...violations, ...lateStarts]
    }
    if (violationType === 'early' || !violationType || violationType === 'all') {
      violations = [...violations, ...earlyLogouts]
    }

    // Sort by date descending
    violations.sort((a, b) => b.date.localeCompare(a.date))

    // Calculate statistics
    const stats = {
      totalViolations: violations.length,
      totalLateStarts: lateStarts.length,
      totalEarlyLogouts: earlyLogouts.length,
      averageLateMinutes: lateStarts.length > 0
        ? Math.round(lateStarts.reduce((sum, v) => sum + v.lateByMinutes, 0) / lateStarts.length)
        : 0,
      averageEarlyMinutes: earlyLogouts.length > 0
        ? Math.round(earlyLogouts.reduce((sum, v) => sum + v.earlyByMinutes, 0) / earlyLogouts.length)
        : 0
    }

    // Group by employee
    const employeeViolations: { [key: string]: any } = {}
    violations.forEach(violation => {
      const key = violation.employeeEmail
      if (!employeeViolations[key]) {
        employeeViolations[key] = {
          employeeName: violation.employeeName,
          employeeEmail: violation.employeeEmail,
          department: violation.department,
          lateCount: 0,
          earlyCount: 0,
          totalViolations: 0
        }
      }

      if (violation.type === 'Late Start') {
        employeeViolations[key].lateCount++
      } else {
        employeeViolations[key].earlyCount++
      }
      employeeViolations[key].totalViolations++
    })

    const topViolators = Object.values(employeeViolations)
      .sort((a: any, b: any) => b.totalViolations - a.totalViolations)
      .slice(0, 10)

    return NextResponse.json({
      stats,
      violations,
      topViolators,
      period: {
        startDate: start,
        endDate: end
      }
    })

  } catch (error) {
    console.error('Attendance violations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
