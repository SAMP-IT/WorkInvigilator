import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const range = searchParams.get('range') || 'today'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    let dateStart: Date
    let dateEnd: Date = new Date()
    dateEnd.setHours(23, 59, 59, 999)

    switch (range) {
      case 'today':
        dateStart = new Date()
        dateStart.setHours(0, 0, 0, 0)
        break
      case 'yesterday':
        dateStart = new Date()
        dateStart.setDate(dateStart.getDate() - 1)
        dateStart.setHours(0, 0, 0, 0)
        dateEnd = new Date()
        dateEnd.setDate(dateEnd.getDate() - 1)
        dateEnd.setHours(23, 59, 59, 999)
        break
      case 'week':
        dateStart = new Date()
        const dayOfWeek = dateStart.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        dateStart.setDate(dateStart.getDate() - diff)
        dateStart.setHours(0, 0, 0, 0)
        break
      case 'lastWeek':
        dateStart = new Date()
        const lastWeekDay = dateStart.getDay()
        const lastWeekDiff = lastWeekDay === 0 ? 6 : lastWeekDay - 1
        dateStart.setDate(dateStart.getDate() - lastWeekDiff - 7)
        dateStart.setHours(0, 0, 0, 0)
        dateEnd = new Date(dateStart)
        dateEnd.setDate(dateEnd.getDate() + 6)
        dateEnd.setHours(23, 59, 59, 999)
        break
      case 'month':
        dateStart = new Date()
        dateStart.setDate(1)
        dateStart.setHours(0, 0, 0, 0)
        break
      case 'custom':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'Start date and end date are required for custom range' },
            { status: 400 }
          )
        }
        dateStart = new Date(startDate)
        dateStart.setHours(0, 0, 0, 0)
        dateEnd = new Date(endDate)
        dateEnd.setHours(23, 59, 59, 999)
        break
      default:
        dateStart = new Date()
        dateStart.setHours(0, 0, 0, 0)
    }

    // Get all employees in the organization (including admins)
    const { data: employees } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, department')
      .eq('organization_id', organizationId)

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        entries: [],
        summary: {
          totalEmployees: 0,
          totalWorkHours: 0,
          totalBreakHours: 0,
          totalNetHours: 0
        }
      })
    }

    // Get all recording sessions in the date range
    // Filter out sessions with unrealistic durations (> 24 hours = 86400 seconds)
    const { data: allSessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('session_start_time', dateStart.toISOString())
      .lte('session_start_time', dateEnd.toISOString())
      .order('session_start_time', { ascending: false })

    // Filter out corrupted/unrealistic sessions
    const sessions = allSessions?.filter(session => {
      // If session has end time, validate the duration
      if (session.total_duration_seconds && session.total_duration_seconds > 86400) {
        return false // More than 24 hours - likely corrupted
      }
      // If session started more than 24 hours ago and still has no end time, it's stale
      if (!session.session_end_time) {
        const startTime = new Date(session.session_start_time).getTime()
        const hoursSinceStart = (Date.now() - startTime) / (1000 * 60 * 60)
        if (hoursSinceStart > 24) {
          return false // Stale session
        }
      }
      return true
    })

    // Get all break sessions in the date range
    const { data: breaks } = await supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('break_start_time', dateStart.toISOString())
      .lte('break_start_time', dateEnd.toISOString())

    // Group sessions and breaks by employee and date
    const timesheetMap = new Map<string, any>()

    // Get recent screenshots to validate truly active sessions
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const { data: recentScreenshots } = await supabaseAdmin
      .from('screenshots')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', fifteenMinutesAgo.toISOString())

    const activeUserIds = new Set(recentScreenshots?.map(s => s.user_id) || [])

    // Process all sessions - aggregate multiple sessions per user per day
    sessions?.forEach(session => {
      // Check if this is truly active (has screenshots in last 15 min) or completed
      const isActive = !session.session_end_time && activeUserIds.has(session.user_id)
      const isCompleted = !!session.session_end_time

      // Only include if active with recent screenshots, or completed
      if (!isCompleted && !isActive) {
        return
      }

      const sessionDate = new Date(session.session_start_time)
      const dateKey = sessionDate.toISOString().split('T')[0]
      const key = `${session.user_id}_${dateKey}`

      // Initialize entry if it doesn't exist
      if (!timesheetMap.has(key)) {
        const employee = employees.find(emp => emp.id === session.user_id)

        // Get employee name - prioritize name field, fallback to email username
        let employeeName = 'Unknown'
        if (employee) {
          if (employee.name && employee.name.trim() !== '' && !employee.name.includes('-')) {
            employeeName = employee.name
          } else if (employee.email) {
            employeeName = employee.email.split('@')[0]
          }
        }

        timesheetMap.set(key, {
          employeeId: session.user_id,
          employeeName,
          employeeDepartment: employee?.department || 'N/A',
          date: dateKey,
          sessions: [],
          breaks: [],
          punchIn: null,
          punchOut: null,
          workSeconds: 0,
          breakSeconds: 0,
          hasActiveSession: false
        })
      }

      const entry = timesheetMap.get(key)!
      entry.sessions.push(session)

      // Set punch in to earliest session start time
      if (!entry.punchIn || new Date(session.session_start_time) < new Date(entry.punchIn)) {
        entry.punchIn = session.session_start_time
      }

      // Calculate work duration for this session
      let sessionSeconds = 0
      if (session.session_end_time) {
        // Completed session - cap at 24 hours (86400 seconds)
        sessionSeconds = Math.min(session.total_duration_seconds || 0, 86400)

        // Set punch out to latest session end time
        if (!entry.punchOut || entry.punchOut === 'Active' || new Date(session.session_end_time) > new Date(entry.punchOut as string)) {
          entry.punchOut = session.session_end_time
        }
      } else {
        // Active session - calculate real-time duration, cap at 24 hours
        const startTime = new Date(session.session_start_time).getTime()
        const now = Date.now()
        const calculatedSeconds = Math.floor((now - startTime) / 1000)
        sessionSeconds = Math.min(calculatedSeconds, 86400)
        entry.punchOut = 'Active'
        entry.hasActiveSession = true
      }

      // Sum all session durations
      entry.workSeconds += sessionSeconds
    })

    // Process breaks
    breaks?.forEach(breakSession => {
      const breakDate = new Date(breakSession.break_start_time)
      const dateKey = breakDate.toISOString().split('T')[0]
      const key = `${breakSession.user_id}_${dateKey}`

      if (timesheetMap.has(key)) {
        const entry = timesheetMap.get(key)!
        entry.breaks.push(breakSession)

        // Calculate break duration - cap individual breaks at 4 hours (14400 seconds)
        if (breakSession.break_end_time) {
          const breakDurationMs = breakSession.break_duration_ms || 0
          const breakSeconds = Math.floor(breakDurationMs / 1000)
          entry.breakSeconds += Math.min(breakSeconds, 14400)
        } else {
          // Active break - cap at 4 hours
          const startTime = new Date(breakSession.break_start_time).getTime()
          const now = Date.now()
          const breakSeconds = Math.floor((now - startTime) / 1000)
          entry.breakSeconds += Math.min(breakSeconds, 14400)
        }
      }
    })

    // Add entries for employees with no sessions (absent)
    if (range === 'today' || range === 'yesterday') {
      employees.forEach(employee => {
        const dateKey = dateStart.toISOString().split('T')[0]
        const key = `${employee.id}_${dateKey}`

        if (!timesheetMap.has(key)) {
          // Get employee name
          let employeeName = 'Unknown'
          if (employee.name && employee.name.trim() !== '' && !employee.name.includes('-')) {
            employeeName = employee.name
          } else if (employee.email) {
            employeeName = employee.email.split('@')[0]
          }

          timesheetMap.set(key, {
            employeeId: employee.id,
            employeeName,
            employeeDepartment: employee.department || 'N/A',
            date: dateKey,
            sessions: [],
            breaks: [],
            punchIn: '-',
            punchOut: '-',
            workSeconds: 0,
            breakSeconds: 0,
            hasActiveSession: false
          })
        }
      })
    }

    // Convert to array and format
    const entries = Array.from(timesheetMap.values()).map(entry => {
      const workHours = entry.workSeconds / 3600
      const breakHours = entry.breakSeconds / 3600
      const netHours = Math.max(0, workHours - breakHours)

      // Determine status
      let status: 'completed' | 'active' | 'absent' = 'completed'
      if (entry.workSeconds === 0) {
        status = 'absent'
      } else if (entry.punchOut === 'Active') {
        status = 'active'
      }

      // Format punch in/out times
      const formatTime = (timestamp: string | null) => {
        if (!timestamp || timestamp === '-') return '-'
        if (timestamp === 'Active') return 'Active'
        return new Date(timestamp).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/New_York'
        })
      }

      return {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        employeeDepartment: entry.employeeDepartment,
        date: new Date(entry.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        punchIn: formatTime(entry.punchIn),
        punchOut: formatTime(entry.punchOut),
        workHours,
        breakHours,
        netHours,
        status
      }
    })

    // Sort by date (newest first) and then by employee name
    entries.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return a.employeeName.localeCompare(b.employeeName)
    })

    // Calculate summary
    const summary = {
      totalEmployees: entries.length,
      totalWorkHours: entries.reduce((sum, e) => sum + e.workHours, 0),
      totalBreakHours: entries.reduce((sum, e) => sum + e.breakHours, 0),
      totalNetHours: entries.reduce((sum, e) => sum + e.netHours, 0)
    }

    return NextResponse.json({
      entries,
      summary,
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString(),
        range
      }
    })

  } catch (error) {
    console.error('Timesheet API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet data' },
      { status: 500 }
    )
  }
}
