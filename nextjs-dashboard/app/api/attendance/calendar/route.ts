import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month') // YYYY-MM format
    const year = searchParams.get('year')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Determine the month to display
    let targetDate: Date
    if (month) {
      targetDate = new Date(month + '-01')
    } else if (year) {
      targetDate = new Date(parseInt(year), 0, 1) // January of specified year
    } else {
      targetDate = new Date() // Current month
    }

    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

    const startDate = startOfMonth.toISOString().split('T')[0]
    const endDate = endOfMonth.toISOString().split('T')[0]

    // Get attendance records
    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        user:profiles!attendance_records_user_id_fkey(
          id,
          name,
          email,
          department
        )
      `)
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (employeeId) {
      query = query.eq('user_id', employeeId)
    }

    const { data: attendanceRecords, error } = await query

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch calendar data' },
        { status: 500 }
      )
    }

    // Get work hours settings
    const { data: settings } = await supabaseAdmin
      .from('work_hours_settings')
      .select('half_day_threshold_hours, full_day_threshold_hours')
      .eq('organization_id', organizationId)
      .single()

    const halfDayThreshold = (settings?.half_day_threshold_hours || 4) * 3600
    const fullDayThreshold = (settings?.full_day_threshold_hours || 8) * 3600

    // Build calendar data
    const calendarDays: any[] = []
    const currentDay = new Date(startOfMonth)

    while (currentDay <= endOfMonth) {
      const dateStr = currentDay.toISOString().split('T')[0]
      const dayOfWeek = currentDay.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Find attendance record for this day
      const dayRecords = attendanceRecords?.filter(r => r.date === dateStr) || []

      if (dayRecords.length === 0 && !isWeekend) {
        // Absent on workday
        calendarDays.push({
          date: dateStr,
          dayOfWeek,
          status: 'absent',
          type: 'Absent',
          color: '#9ca3af',
          employees: []
        })
      } else if (dayRecords.length === 0 && isWeekend) {
        // Weekend
        calendarDays.push({
          date: dateStr,
          dayOfWeek,
          status: 'weekend',
          type: 'Weekend',
          color: '#e5e7eb',
          employees: []
        })
      } else {
        // Process attendance records
        const presentCount = dayRecords.filter(r => r.status !== 'absent').length
        const lateCount = dayRecords.filter(r => r.is_late).length
        const halfDayCount = dayRecords.filter(r => {
          const workSeconds = r.total_work_seconds || 0
          return workSeconds >= halfDayThreshold && workSeconds < fullDayThreshold
        }).length

        // Determine overall day status
        let dayStatus = 'present'
        let dayType = 'Present'
        let color = '#10b981' // green

        if (lateCount > 0 && lateCount === dayRecords.length) {
          dayStatus = 'late'
          dayType = 'Late'
          color = '#ef4444' // red
        } else if (halfDayCount > 0 && halfDayCount === dayRecords.length) {
          dayStatus = 'half_day'
          dayType = 'Half Day'
          color = '#f59e0b' // amber
        } else if (lateCount > 0) {
          dayStatus = 'partially_late'
          dayType = 'Partially Late'
          color = '#f97316' // orange
        }

        calendarDays.push({
          date: dateStr,
          dayOfWeek,
          status: dayStatus,
          type: dayType,
          color,
          presentCount,
          lateCount,
          halfDayCount,
          employees: dayRecords.map(r => ({
            id: r.user?.id,
            name: r.user?.name,
            email: r.user?.email,
            department: r.user?.department,
            clockInTime: r.clock_in_time,
            clockOutTime: r.clock_out_time,
            totalWorkTime: formatDuration(r.total_work_seconds || 0),
            isLate: r.is_late,
            lateByMinutes: r.late_by_minutes,
            status: r.status
          }))
        })
      }

      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Calculate monthly statistics
    const stats = {
      totalDays: calendarDays.length,
      workDays: calendarDays.filter(d => d.status !== 'weekend').length,
      presentDays: calendarDays.filter(d => d.status === 'present' || d.status === 'late' || d.status === 'half_day').length,
      absentDays: calendarDays.filter(d => d.status === 'absent').length,
      lateDays: calendarDays.filter(d => d.status === 'late' || d.status === 'partially_late').length,
      halfDays: calendarDays.filter(d => d.status === 'half_day').length,
      attendanceRate: 0
    }

    if (stats.workDays > 0) {
      stats.attendanceRate = Math.round((stats.presentDays / stats.workDays) * 100)
    }

    return NextResponse.json({
      calendar: calendarDays,
      stats,
      period: {
        month: targetDate.getMonth() + 1,
        year: targetDate.getFullYear(),
        monthName: targetDate.toLocaleString('default', { month: 'long' }),
        startDate,
        endDate
      }
    })

  } catch (error) {
    console.error('Calendar API error:', error)
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
