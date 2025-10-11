import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const organizationId = searchParams.get('organizationId')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get employee info
    const { data: employee } = await supabaseAdmin
      .from('profiles')
      .select('name, email, department')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Calculate date range - use custom dates if provided, otherwise use period
    let startDate: Date
    let endDate: Date

    if (customStartDate && customEndDate) {
      // Use custom date range
      startDate = new Date(customStartDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(customEndDate)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Use period-based date range
      endDate = new Date()
      switch (period) {
        case 'daily':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case 'weekly':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'monthly':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)
          break
        default:
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
      }
    }

    // Get sessions for the period filtered by organization
    const { data: sessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('session_start_time', startDate.toISOString())
      .lte('session_start_time', endDate.toISOString())
      .order('session_start_time', { ascending: false })

    // Get productivity metrics for the period filtered by organization
    const { data: metrics } = await supabaseAdmin
      .from('productivity_metrics')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Get screenshots count for the period filtered by organization
    const { count: screenshotsCount } = await supabaseAdmin
      .from('screenshots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate totals - ALWAYS check recording_chunks since sessions may not exist
    let totalWorkSeconds = sessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) || 0

    // Get recording chunks data (this is what the desktop app actually creates)
    const { data: chunks } = await supabaseAdmin
      .from('recording_chunks')
      .select('duration_seconds, session_start_time, chunk_start_time')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const chunksWorkSeconds = chunks?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0

    // Use whichever is greater (chunks or sessions)
    totalWorkSeconds = Math.max(totalWorkSeconds, chunksWorkSeconds)

    // If still 0, estimate from screenshots (2 minutes per screenshot as fallback)
    if (totalWorkSeconds === 0 && screenshotsCount && screenshotsCount > 0) {
      totalWorkSeconds = screenshotsCount * 120 // 2 minutes per screenshot
    }
    
    const totalFocusSeconds = metrics?.reduce((sum, m) => sum + (m.focus_time_seconds || 0), 0) || Math.floor(totalWorkSeconds * 0.85)
    const avgProductivity = metrics && metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.productivity_percentage || 0), 0) / metrics.length
      : totalWorkSeconds > 0 ? (totalFocusSeconds / totalWorkSeconds) * 100 : 0

    // Format time durations
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        return `${minutes}m`
      } else {
        return `${secs}s`
      }
    }

    // Generate period label
    const periodLabel = period === 'daily'
      ? `Today - ${endDate.toLocaleDateString('en-GB')}`
      : period === 'weekly'
      ? `This Week - ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`
      : `This Month - ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`

    // Get break sessions for more accurate calculations filtered by organization
    const { data: breakSessions } = await supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .gte('break_start_time', startDate.toISOString())
      .lte('break_start_time', endDate.toISOString())

    // Calculate break time
    const totalBreakSeconds = breakSessions?.reduce((sum, b) => {
      if (b.break_start_time && b.break_end_time) {
        const breakDuration = new Date(b.break_end_time).getTime() - new Date(b.break_start_time).getTime()
        return sum + Math.floor(breakDuration / 1000)
      }
      return sum + (b.break_duration_ms ? Math.floor(b.break_duration_ms / 1000) : 0)
    }, 0) || 0

    // Calculate application usage (currently using generic categories)
    const applications = [
      {
        name: 'Productive Applications',
        time: formatTime(totalFocusSeconds),
        percentage: totalWorkSeconds > 0 ? Math.round((totalFocusSeconds / totalWorkSeconds) * 100) : 0
      },
      {
        name: 'Other Applications',
        time: formatTime(totalWorkSeconds - totalFocusSeconds),
        percentage: totalWorkSeconds > 0 ? Math.round(((totalWorkSeconds - totalFocusSeconds) / totalWorkSeconds) * 100) : 0
      }
    ].filter(app => app.percentage > 0)

    // Enhanced insights
    const insights = {
      averageSessionDuration: sessions && sessions.length > 0 ? formatTime(Math.floor(totalWorkSeconds / sessions.length)) : '0m',
      longestSession: sessions && sessions.length > 0 ?
        formatTime(Math.max(...sessions.map(s => s.total_duration_seconds || 0))) : '0m',
      totalBreakTime: formatTime(totalBreakSeconds),
      screenshotsPerHour: totalWorkSeconds > 0 ?
        Math.round((screenshotsCount || 0) / (totalWorkSeconds / 3600)) : 0,
      productivityTrend: 'stable', // TODO: Calculate actual trend
      mostProductiveTime: '10:00-12:00' // TODO: Calculate from session data
    }

    // Build response based on period
    const reportData = {
      employeeName: employee.name || employee.email,
      employeeEmail: employee.email,
      department: employee.department || 'General',
      period: periodLabel,
      workHours: formatTime(totalWorkSeconds),
      focusTime: formatTime(totalFocusSeconds),
      breakTime: formatTime(totalBreakSeconds),
      productivity: Number(avgProductivity.toFixed(1)),
      sessionsCount: sessions?.length || chunks?.length || (totalWorkSeconds > 0 ? 1 : 0),
      screenshotsCount: screenshotsCount || 0,
      breakSessionsCount: breakSessions?.length || 0,
      applications,
      insights,
      summary: {
        totalWorkHours: Number((totalWorkSeconds / 3600).toFixed(1)),
        totalFocusHours: Number((totalFocusSeconds / 3600).toFixed(1)),
        totalBreakHours: Number((totalBreakSeconds / 3600).toFixed(1)),
        efficiencyRatio: totalWorkSeconds > 0 ?
          Number(((totalFocusSeconds / totalWorkSeconds) * 100).toFixed(1)) : 0,
        workLifeBalance: totalBreakSeconds > 0 && totalWorkSeconds > 0 ?
          Number(((totalBreakSeconds / totalWorkSeconds) * 100).toFixed(1)) : 0
      }
    }

    // Add period-specific breakdowns
    if (period === 'daily' && sessions) {
      const breakdowns = sessions.map(session => ({
        time: `${new Date(session.session_start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })}-${session.session_end_time ? new Date(session.session_end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) : 'Active'}`,
        activity: 'Work Session',
        focus: Math.round(((session.total_duration_seconds || 0) * 0.85 / (session.total_duration_seconds || 1)) * 100)
      }))
      Object.assign(reportData, { breakdowns })
    }

    if (period === 'weekly') {
      // Group sessions by day
      const dailyData = new Map<string, { duration: number; focus: number; productivity: number }>()
      if (sessions && sessions.length > 0) {
        sessions.forEach(session => {
          const day = new Date(session.session_start_time).toLocaleDateString('en-US', { weekday: 'long' })
          if (!dailyData.has(day)) {
            dailyData.set(day, { duration: 0, focus: 0, productivity: 0 })
          }
          const current = dailyData.get(day)!
          current.duration += session.total_duration_seconds || 0
          current.focus += Math.floor((session.total_duration_seconds || 0) * 0.85)
        })
      }

      const dailyBreakdown = Array.from(dailyData.entries()).map(([day, data]) => ({
        day,
        hours: formatTime(data.duration),
        focus: formatTime(data.focus),
        productivity: data.duration > 0 ? Number(((data.focus / data.duration) * 100).toFixed(1)) : 0
      }))
      Object.assign(reportData, { dailyBreakdown })
    }

    return NextResponse.json({ report: reportData })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}