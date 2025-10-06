import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today' // today, week, month
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Check if user is admin
    if (userId) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 403 }
        )
      }
    }

    // Get date range based on period
    let startDate: Date
    const endDate = new Date()

    switch (period) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
    }

    // Get all active sessions (employees who are punched in)
    let { data: activeSessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('id, user_id, session_start_time, total_duration_seconds')
      .eq('organization_id', organizationId)
      .is('session_end_time', null) // NULL = currently punched in

    // Get active user IDs from sessions OR recent screenshots (fallback)
    let activeUserIds: string[] = []
    if (activeSessions && activeSessions.length > 0) {
      // Prioritize punch-in sessions
      activeUserIds = [...new Set(activeSessions.map(s => s.user_id))]
    } else {
      // Fallback to screenshot-based detection (for backward compatibility)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      const { data: recentScreenshots } = await supabaseAdmin
        .from('screenshots')
        .select('user_id, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', twoMinutesAgo.toISOString())
        .range(0, 999999) // Bypass default limit

      activeUserIds = [...new Set((recentScreenshots || []).map(s => s.user_id))]
      
      // Create synthetic active sessions from screenshot activity
      if (activeUserIds.length > 0) {
        // Group screenshots by user and get earliest timestamp for each
        const userScreenshotMap = new Map<string, string>()
        recentScreenshots?.forEach(s => {
          if (!userScreenshotMap.has(s.user_id) || s.created_at < userScreenshotMap.get(s.user_id)!) {
            userScreenshotMap.set(s.user_id, s.created_at)
          }
        })
        
        // Create synthetic sessions
        activeSessions = activeUserIds.map((userId, index) => ({
          id: `synthetic_${userId}`,
          user_id: userId,
          session_start_time: userScreenshotMap.get(userId) || new Date().toISOString(),
          total_duration_seconds: 0
        }))
      }
    }

    // Get profiles for active users
    const { data: activeProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', activeUserIds)

    const activeProfileMap = (activeProfiles || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {} as Record<string, { id: string; name: string; email: string }>)

    // Get all employees from this organization
    const { data: allEmployees } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, role')
      .eq('organization_id', organizationId)

    // Get sessions for the period filtered by organization
    const { data: periodSessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('session_start_time', startDate.toISOString())
      .lte('session_start_time', endDate.toISOString())

    // Get productivity metrics for the period
    const { data: periodMetrics } = await supabaseAdmin
      .from('productivity_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // If no sessions exist, get all screenshots to estimate metrics
    const { data: allPeriodScreenshots } = await supabaseAdmin
      .from('screenshots')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .range(0, 9999999) // Fetch all screenshots without limit

    // Get screenshots for the period filtered by organization
    const { data: periodScreenshots } = await supabaseAdmin
      .from('screenshots')
      .select('id, user_id, filename, file_url, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(8)

    // Get profiles for screenshots
    const screenshotUserIds = [...new Set((periodScreenshots || []).map(s => s.user_id))]
    const { data: screenshotProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', screenshotUserIds)

    const screenshotProfileMap = (screenshotProfiles || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {} as Record<string, { id: string; name: string; email: string }>)

    // Calculate key metrics
    const totalEmployees = allEmployees?.length || 0
    const activeEmployees = activeUserIds.length

    // Calculate average productivity - use screenshots if no sessions
    let totalWorkSeconds = periodSessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) || 0

    // If no sessions, estimate from screenshots (2 minutes per screenshot)
    if (totalWorkSeconds === 0 && allPeriodScreenshots && allPeriodScreenshots.length > 0) {
      totalWorkSeconds = allPeriodScreenshots.length * 120
    }

    const totalFocusSeconds = periodMetrics?.reduce((sum, m) => sum + (m.focus_time_seconds || 0), 0) ||
      Math.floor(totalWorkSeconds * 0.85) // Fallback calculation

    const avgProductivity = totalWorkSeconds > 0 ?
      Number(((totalFocusSeconds / totalWorkSeconds) * 100).toFixed(1)) : 0

    // Calculate average focus time per day
    const daysInPeriod = period === 'today' ? 1 : (period === 'week' ? 7 : 30)
    const avgFocusHours = Number((totalFocusSeconds / (daysInPeriod * 3600)).toFixed(1))

    // Calculate average session duration
    let avgSessionDuration = 0
    if (periodSessions && periodSessions.length > 0) {
      avgSessionDuration = Math.round((totalWorkSeconds / periodSessions.length) / 60)
    } else if (totalWorkSeconds > 0) {
      // Estimate average session from total work time
      avgSessionDuration = Math.round(totalWorkSeconds / 60 / daysInPeriod)
    }

    // Get recent active sessions with more details
    const recentActiveSessions = activeSessions?.slice(0, 4).map(session => {
      const startTime = new Date(session.session_start_time)
      const now = new Date()
      const durationMs = now.getTime() - startTime.getTime()
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
      const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000)

      const profile = activeProfileMap[session.user_id]
      
      // Format duration based on how long the session has been running
      let durationFormatted = ''
      if (durationHours > 0) {
        durationFormatted = `${durationHours}h ${durationMinutes}m`
      } else if (durationMinutes > 0) {
        durationFormatted = `${durationMinutes}m`
      } else {
        durationFormatted = `${durationSeconds}s`
      }
      
      return {
        id: session.id,
        employeeId: session.user_id,
        employeeName: profile?.name || profile?.email || 'Unknown',
        startTime: startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        duration: durationFormatted,
        status: 'active' as const
      }
    }) || []

    // Calculate top performers (employees with highest productivity in period)
    const employeeProductivity = new Map<string, {
      name: string,
      email: string,
      totalSeconds: number,
      focusSeconds: number,
      productivity: number
    }>()

    // Group sessions by employee
    if (periodSessions && periodSessions.length > 0) {
      periodSessions.forEach(session => {
        const existing = employeeProductivity.get(session.user_id)
        const employee = allEmployees?.find(emp => emp.id === session.user_id)

        if (employee) {
          employeeProductivity.set(session.user_id, {
            name: employee.name || employee.email,
            email: employee.email,
            totalSeconds: (existing?.totalSeconds || 0) + (session.total_duration_seconds || 0),
            focusSeconds: existing?.focusSeconds || 0,
            productivity: 0 // Will calculate below
          })
        }
      })

      // Add focus time data
      periodMetrics?.forEach(metric => {
        const existing = employeeProductivity.get(metric.user_id)
        if (existing) {
          existing.focusSeconds += metric.focus_time_seconds || 0
        }
      })
    } else if (allPeriodScreenshots && allPeriodScreenshots.length > 0) {
      // Estimate from screenshots if no sessions
      const screenshotsByUser = allPeriodScreenshots.reduce((acc, screenshot) => {
        acc[screenshot.user_id] = (acc[screenshot.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(screenshotsByUser).forEach(([userId, count]) => {
        const employee = allEmployees?.find(emp => emp.id === userId)
        if (employee) {
          const estimatedSeconds = count * 120 // 2 minutes per screenshot
          employeeProductivity.set(userId, {
            name: employee.name || employee.email,
            email: employee.email,
            totalSeconds: estimatedSeconds,
            focusSeconds: Math.floor(estimatedSeconds * 0.85),
            productivity: 0
          })
        }
      })
    }

    // Calculate productivity percentages and create top performers list
    const topPerformers = Array.from(employeeProductivity.entries())
      .map(([userId, data]) => {
        const productivity = data.totalSeconds > 0 ?
          Number(((data.focusSeconds / data.totalSeconds) * 100).toFixed(1)) : 0

        return {
          employeeId: userId,
          name: data.name,
          email: data.email,
          productivity,
          workHours: Math.round(data.totalSeconds / 3600 * 10) / 10, // Round to 1 decimal
          focusHours: Math.round(data.focusSeconds / 3600 * 10) / 10,
          change: Math.random() * 10 - 5 // Mock change until we have historical data
        }
      })
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 4)

    // Format recent screenshots for dashboard
    const recentScreenshots = periodScreenshots?.map(screenshot => {
      const profile = screenshotProfileMap[screenshot.user_id]
      return {
        id: screenshot.id,
        employeeId: screenshot.user_id,
        employeeName: profile?.name || profile?.email || 'Unknown',
        timestamp: new Date(screenshot.created_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        url: screenshot.file_url,
        filename: screenshot.filename
      }
    }) || []

    // Calculate period-specific insights
    const insights = {
      totalSessions: periodSessions?.length || 0,
      totalScreenshots: allPeriodScreenshots?.length || 0,
      avgSessionsPerEmployee: totalEmployees > 0 ?
        Number(((periodSessions?.length || 0) / totalEmployees).toFixed(1)) : 0,
      mostActiveDay: 'Monday', // TODO: Calculate from actual data
      peakHours: '10:00-12:00', // TODO: Calculate from actual data
    }

    return NextResponse.json({
      period: period,
      timestamp: new Date().toISOString(),

      // Key Performance Indicators
      kpis: {
        activeSessions: activeSessions?.length || 0,
        activeEmployees: activeEmployees,
        totalEmployees,
        avgProductivity,
        avgFocusHours,
        avgSessionDuration,
        totalScreenshots: allPeriodScreenshots?.length || 0
      },

      // Recent Activity
      recentActiveSessions,
      topPerformers,
      recentScreenshots,

      // Period Insights
      insights,

      // Summary Stats
      summary: {
        totalWorkHours: Number((totalWorkSeconds / 3600).toFixed(1)),
        totalFocusHours: Number((totalFocusSeconds / 3600).toFixed(1)),
        activeEmployeePercentage: totalEmployees > 0 ?
          Number(((activeEmployees / totalEmployees) * 100).toFixed(1)) : 0,
        periodLabel: period === 'today' ? 'Today' :
                    period === 'week' ? 'Last 7 Days' : 'Last 30 Days'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}

// POST endpoint for real-time updates or actions
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'refresh':
        // Force refresh of dashboard data
        return NextResponse.json({ message: 'Dashboard data refreshed' })

      case 'getQuickStats':
        // Get minimal stats for frequent updates
        const { data: activeCount } = await supabaseAdmin
          .from('recording_sessions')
          .select('id', { count: 'exact', head: true })
          .is('session_end_time', null)

        const { data: employeeCount } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })

        return NextResponse.json({
          activeSessions: activeCount || 0,
          totalEmployees: employeeCount || 0,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process dashboard action' },
      { status: 500 }
    )
  }
}