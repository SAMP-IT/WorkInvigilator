import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const startOfDay = new Date(today + 'T00:00:00Z')

    // Get all employees for the organization
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, role')
      .eq('organization_id', organizationId)
      .eq('role', 'employee')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    // Get today's attendance records for all employees
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        idle_periods(*)
      `)
      .eq('organization_id', organizationId)
      .eq('date', today)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
    }

    // Get truly active sessions (with recent screenshots in last 5 minutes)
    // Use screenshots to determine activity, not just session_end_time
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

    const { data: recentScreenshots, error: screenshotsError } = await supabaseAdmin
      .from('screenshots')
      .select('session_id, user_id')
      .eq('organization_id', organizationId)
      .gte('created_at', fiveMinutesAgo)

    if (screenshotsError) {
      console.error('Error fetching recent screenshots:', screenshotsError)
    }

    console.log('Recent screenshots count:', recentScreenshots?.length || 0)
    console.log('Five minutes ago:', fiveMinutesAgo)

    // Group by user_id to get the latest active session per user
    const activeSessionsByUser = new Map()
    recentScreenshots?.forEach(screenshot => {
      if (screenshot.session_id && screenshot.user_id) {
        activeSessionsByUser.set(screenshot.user_id, screenshot.session_id)
      }
    })

    const sessionIds = Array.from(activeSessionsByUser.values())
    let activeSessions: Array<{
      id: string
      user_id: string
      session_start_time: string
      total_duration_seconds: number
    }> = []

    console.log('Active session IDs found:', sessionIds)
    console.log('Active sessions by user map size:', activeSessionsByUser.size)

    // Only query if we have session IDs
    if (sessionIds.length > 0) {
      const { data: allSessions, error: sessionsError } = await supabaseAdmin
        .from('recording_sessions')
        .select('id, user_id, session_start_time, total_duration_seconds')
        .eq('organization_id', organizationId)
        .in('id', sessionIds)

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
      } else {
        activeSessions = allSessions || []
        console.log('Active sessions found:', activeSessions.length)
      }
    } else {
      console.log('No active session IDs to query')
    }

    // Calculate real-time statistics for each employee
    const employeeStats = employees?.map(employee => {
      const attendance = attendanceRecords?.find(a => a.user_id === employee.id)
      const activeSession = activeSessions?.find(s => s.user_id === employee.id)

      // Calculate status
      let status: 'active' | 'idle' | 'offline' | 'late' = 'offline'
      let currentActivity = 'Offline'

      if (activeSession) {
        status = 'active'
        currentActivity = 'Working'
      } else if (attendance && !attendance.clock_out_time) {
        // Has clocked in but no active session - might be on break or idle
        status = 'idle'
        currentActivity = 'On Break/Idle'
      }

      if (attendance?.is_late) {
        status = 'late'
      }

      // Calculate total work time for today
      let totalWorkSeconds = 0
      let totalIdleSeconds = 0

      if (attendance) {
        if (attendance.total_work_seconds) {
          totalWorkSeconds = attendance.total_work_seconds
        } else if (attendance.clock_in_time) {
          // Calculate ongoing work time
          const clockIn = new Date(attendance.clock_in_time)
          const elapsed = Math.floor((now.getTime() - clockIn.getTime()) / 1000)
          totalWorkSeconds = elapsed - (attendance.total_break_seconds || 0) - (attendance.total_idle_seconds || 0)
        }

        totalIdleSeconds = attendance.total_idle_seconds || 0
      }

      const formatSeconds = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return `${hours}h ${minutes}m`
      }

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department || 'N/A',
        role: employee.role,
        status,
        currentActivity,
        todayHours: formatSeconds(totalWorkSeconds),
        todayHoursRaw: totalWorkSeconds,
        idleTime: formatSeconds(totalIdleSeconds),
        isLate: attendance?.is_late || false,
        lateByMinutes: attendance?.late_by_minutes || 0,
        clockInTime: attendance?.clock_in_time || null,
        clockOutTime: attendance?.clock_out_time || null,
        productivity: attendance ? 85 : 0, // TODO: Calculate actual productivity
        lastActive: activeSession?.session_start_time || attendance?.clock_in_time || null
      }
    }) || []

    // Calculate organization-wide statistics
    const activeCount = employeeStats.filter(e => e.status === 'active').length
    const idleCount = employeeStats.filter(e => e.status === 'idle').length
    const offlineCount = employeeStats.filter(e => e.status === 'offline').length
    const lateCount = employeeStats.filter(e => e.isLate).length

    console.log('Final stats - Active:', activeCount, 'Idle:', idleCount, 'Offline:', offlineCount)

    const totalHoursToday = employeeStats.reduce((sum, e) => sum + e.todayHoursRaw, 0)
    const avgProductivity = employeeStats.length > 0
      ? Math.round(employeeStats.reduce((sum, e) => sum + e.productivity, 0) / employeeStats.length)
      : 0

    // Get most productive employee today
    const mostProductive = employeeStats.reduce((max, e) =>
      e.todayHoursRaw > max.todayHoursRaw ? e : max,
      employeeStats[0] || { name: 'N/A', todayHours: '0h 0m' }
    )

    // Sort employees by status and hours
    const sortedEmployees = employeeStats.sort((a, b) => {
      // Active first, then idle, then offline
      const statusOrder = { active: 0, late: 1, idle: 2, offline: 3 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      // Within same status, sort by hours worked
      return b.todayHoursRaw - a.todayHoursRaw
    })

    return NextResponse.json({
      organizationStats: {
        totalEmployees: employeeStats.length,
        activeNow: activeCount,
        idleNow: idleCount,
        offlineNow: offlineCount,
        lateToday: lateCount,
        totalHoursToday: Math.floor(totalHoursToday / 3600) + 'h ' + Math.floor((totalHoursToday % 3600) / 60) + 'm',
        avgProductivity: avgProductivity + '%',
        mostProductiveEmployee: mostProductive.name,
        mostProductiveHours: mostProductive.todayHours
      },
      employees: sortedEmployees,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Real-time analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
