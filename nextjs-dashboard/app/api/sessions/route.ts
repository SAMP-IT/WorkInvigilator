import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all recording sessions with user info and metrics
    const { data: sessions } = await supabase
      .from('recording_sessions')
      .select(`
        id,
        user_id,
        session_start_time,
        session_end_time,
        total_duration_seconds,
        total_chunks,
        created_at,
        profiles!recording_sessions_user_id_fkey (
          name,
          email
        )
      `)
      .order('session_start_time', { ascending: false })

    // Get productivity metrics and screenshots for each session
    const sessionsWithMetrics = await Promise.all(
      (sessions || []).map(async (session) => {
        // Get productivity metrics for this session
        const { data: metrics } = await supabase
          .from('productivity_metrics')
          .select('focus_time_seconds, productivity_percentage, screenshots_count')
          .eq('session_id', session.id)
          .single()

        // Get screenshots count for this session
        const { count: screenshotsCount } = await supabase
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

        // Generate employee avatar
        const employeeName = session.profiles?.name || 'Unknown Employee'
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
          apps: ['Work Applications'], // Simplified since we don't track specific apps
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
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions data' },
      { status: 500 }
    )
  }
}