import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Build query for idle periods
    let query = supabaseAdmin
      .from('idle_periods')
      .select(`
        *,
        user:profiles!idle_periods_user_id_fkey(
          id,
          name,
          email,
          department
        ),
        attendance:attendance_records!idle_periods_attendance_record_id_fkey(
          date,
          clock_in_time,
          clock_out_time
        )
      `)
      .eq('organization_id', organizationId)
      .gte('idle_start_time', start + 'T00:00:00Z')
      .lte('idle_start_time', end + 'T23:59:59Z')
      .order('idle_start_time', { ascending: false })

    if (employeeId) {
      query = query.eq('user_id', employeeId)
    }

    const { data: idlePeriods, error } = await query

    if (error) {
      console.error('Error fetching idle periods:', error)
      return NextResponse.json(
        { error: 'Failed to fetch idle time data' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalIdleSeconds = idlePeriods?.reduce((sum, period) =>
      sum + (period.duration_seconds || 0), 0) || 0

    // Group by employee
    const employeeStats: { [key: string]: any } = {}
    idlePeriods?.forEach(period => {
      if (!period.user) return

      if (!employeeStats[period.user_id]) {
        employeeStats[period.user_id] = {
          userId: period.user_id,
          name: period.user.name,
          email: period.user.email,
          department: period.user.department,
          totalIdleSeconds: 0,
          idlePeriodCount: 0,
          longestIdleSeconds: 0,
          averageIdleSeconds: 0
        }
      }

      employeeStats[period.user_id].totalIdleSeconds += period.duration_seconds || 0
      employeeStats[period.user_id].idlePeriodCount += 1

      if ((period.duration_seconds || 0) > employeeStats[period.user_id].longestIdleSeconds) {
        employeeStats[period.user_id].longestIdleSeconds = period.duration_seconds || 0
      }
    })

    // Calculate averages and format
    const employeeList = Object.values(employeeStats).map((emp: any) => ({
      ...emp,
      averageIdleSeconds: emp.idlePeriodCount > 0
        ? Math.round(emp.totalIdleSeconds / emp.idlePeriodCount)
        : 0,
      totalIdleTime: formatDuration(emp.totalIdleSeconds),
      longestIdleTime: formatDuration(emp.longestIdleSeconds),
      averageIdleTime: emp.idlePeriodCount > 0
        ? formatDuration(Math.round(emp.totalIdleSeconds / emp.idlePeriodCount))
        : '0m'
    })).sort((a, b) => b.totalIdleSeconds - a.totalIdleSeconds)

    // Group by day
    const dailyStats: { [key: string]: number } = {}
    idlePeriods?.forEach(period => {
      const day = period.idle_start_time.split('T')[0]
      if (!dailyStats[day]) {
        dailyStats[day] = 0
      }
      dailyStats[day] += period.duration_seconds || 0
    })

    const dailyBreakdown = Object.entries(dailyStats)
      .map(([date, seconds]) => ({
        date,
        idleSeconds: seconds,
        idleTime: formatDuration(seconds),
        idleHours: (seconds / 3600).toFixed(2)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Group by hour of day to identify peak idle times
    const hourlyStats: { [key: number]: number } = {}
    idlePeriods?.forEach(period => {
      const hour = new Date(period.idle_start_time).getHours()
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = 0
      }
      hourlyStats[hour] += period.duration_seconds || 0
    })

    const peakIdleHours = Object.entries(hourlyStats)
      .map(([hour, seconds]) => ({
        hour: parseInt(hour),
        hourFormatted: `${hour.padStart(2, '0')}:00`,
        idleSeconds: seconds,
        idleTime: formatDuration(seconds)
      }))
      .sort((a, b) => b.idleSeconds - a.idleSeconds)
      .slice(0, 5)

    return NextResponse.json({
      summary: {
        totalIdleTime: formatDuration(totalIdleSeconds),
        totalIdleSeconds,
        totalIdlePeriods: idlePeriods?.length || 0,
        averageIdleDuration: idlePeriods && idlePeriods.length > 0
          ? formatDuration(Math.round(totalIdleSeconds / idlePeriods.length))
          : '0m',
        longestIdlePeriod: idlePeriods && idlePeriods.length > 0
          ? formatDuration(Math.max(...idlePeriods.map(p => p.duration_seconds || 0)))
          : '0m'
      },
      employeeStats: employeeList,
      dailyBreakdown,
      peakIdleHours,
      recentIdlePeriods: idlePeriods?.slice(0, 50).map(period => ({
        id: period.id,
        employeeName: period.user?.name || 'Unknown',
        employeeEmail: period.user?.email || '',
        department: period.user?.department || 'N/A',
        startTime: period.idle_start_time,
        endTime: period.idle_end_time,
        duration: formatDuration(period.duration_seconds || 0),
        durationSeconds: period.duration_seconds || 0,
        idleType: period.idle_type,
        date: period.attendance?.date || period.idle_start_time.split('T')[0]
      }))
    })

  } catch (error) {
    console.error('Idle time analytics API error:', error)
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
