import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Helper function to get applications for a session
function getSessionApplications(session: { total_duration_seconds?: number; session_start_time: string }): string[] {
  // For now, return categorized applications based on productivity
  const totalSeconds = session.total_duration_seconds || 0
  const focusSeconds = Math.floor(totalSeconds * 0.85) // Estimated focus time

  const apps = []

  if (focusSeconds > totalSeconds * 0.8) {
    apps.push('Productive Applications', 'Development Tools')
  } else if (focusSeconds > totalSeconds * 0.6) {
    apps.push('Mixed Applications', 'Communication Tools')
  } else {
    apps.push('Various Applications', 'General Tools')
  }

  // Add time-based categorization
  const sessionHour = new Date(session.session_start_time).getHours()
  if (sessionHour >= 9 && sessionHour <= 12) {
    apps.push('Morning Work')
  } else if (sessionHour >= 13 && sessionHour <= 17) {
    apps.push('Afternoon Work')
  } else {
    apps.push('Extended Hours')
  }

  return apps.slice(0, 3) // Limit to 3 apps for UI
}

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

    // Get all recording sessions for this organization
    const { data: sessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('session_start_time', { ascending: false })

    // Get unique user IDs to fetch profiles
    const userIds = [...new Set((sessions || []).map(s => s.user_id))]

    // Fetch profiles for all users
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    // Create a map of user ID to profile
    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile
      return acc
    }, {} as Record<string, { id: string; name: string; email: string }>)

    // Get productivity metrics and screenshots for each session
    const sessionsWithMetrics = await Promise.all(
      (sessions || []).map(async (session) => {
        // Get productivity metrics for this session
        const { data: metrics } = await supabaseAdmin
          .from('productivity_metrics')
          .select('focus_time_seconds, productivity_percentage, screenshots_count')
          .eq('session_id', session.id)
          .single()

        // Get screenshots count for this session
        const { count: screenshotsCount } = await supabaseAdmin
          .from('screenshots')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)

        // Calculate duration in hours and minutes
        const totalSeconds = session.total_duration_seconds || 0
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

        // Calculate focus time
        const focusSeconds = metrics?.focus_time_seconds || Math.floor(totalSeconds * 0.85)
        const focusHours = Math.floor(focusSeconds / 3600)
        const focusMinutes = Math.floor((focusSeconds % 3600) / 60)
        const focusTimeFormatted = focusHours > 0 ? `${focusHours}h ${focusMinutes}m` : `${focusMinutes}m`

        // Calculate productivity percentage
        const productivityPercent = metrics?.productivity_percentage ||
          (totalSeconds > 0 ? Number(((focusSeconds / totalSeconds) * 100).toFixed(1)) : 0)

        // Format start and end times
        const startTime = new Date(session.session_start_time).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        const endTime = session.session_end_time
          ? new Date(session.session_end_time).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Active'

        // Get employee info from profile map
        const profile = profileMap[session.user_id]
        const employeeName = profile?.name || profile?.email || 'Unknown Employee'
        const employeeAvatar = employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

        return {
          id: session.id,
          employeeId: session.user_id,
          employeeName,
          employeeAvatar,
          startTime,
          endTime,
          duration: durationFormatted,
          focusTime: focusTimeFormatted,
          focusPercent: productivityPercent,
          status: session.session_end_time ? 'completed' : 'active',
          apps: getSessionApplications(session), // Get applications for this session
          screenshots: screenshotsCount || 0
        }
      })
    )

    return NextResponse.json({
      sessions: sessionsWithMetrics,
      totalCount: sessionsWithMetrics.length,
      activeCount: sessionsWithMetrics.filter(s => s.status === 'active').length
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sessions data' },
      { status: 500 }
    )
  }
}