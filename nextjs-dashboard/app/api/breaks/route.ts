import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const organizationId = searchParams.get('organizationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('organization_id', organizationId)

    // Filter by employee if specified
    if (employeeId && employeeId !== 'all') {
      query = query.eq('user_id', employeeId)
    }

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('break_date', startDate)
    }
    if (endDate) {
      query = query.lte('break_date', endDate)
    }

    // Apply ordering
    query = query.order('break_start_time', { ascending: false })

    const { data: breakSessions, error: breaksError } = await query

    if (breaksError) {
      return NextResponse.json(
        { error: 'Failed to fetch break sessions' },
        { status: 500 }
      )
    }

    // Get unique user IDs to fetch profiles
    const userIds = [...new Set((breakSessions || []).map(b => b.user_id))]

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

    // Format break sessions for frontend
    const formattedBreakSessions = (breakSessions || []).map(session => {
      const profile = profileMap[session.user_id]

      // Format timestamps
      const breakDate = new Date(session.break_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      const startTime = new Date(session.break_start_time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York'
      })

      const endTime = new Date(session.break_end_time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York'
      })

      // Format duration
      const durationMs = session.break_duration_ms || 0
      const minutes = Math.floor(durationMs / 60000)
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60

      const duration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`

      return {
        id: session.id,
        employeeId: session.user_id,
        employeeName: profile?.name || profile?.email || 'Unknown Employee',
        breakDate,
        startTime,
        endTime,
        duration,
        durationMs
      }
    })

    // Calculate statistics
    const totalBreakTime = formattedBreakSessions.reduce((sum, s) => sum + s.durationMs, 0)
    const averageBreakDuration = formattedBreakSessions.length > 0
      ? Math.round(totalBreakTime / formattedBreakSessions.length)
      : 0

    return NextResponse.json({
      breakSessions: formattedBreakSessions,
      totalCount: formattedBreakSessions.length,
      totalBreakTime,
      averageBreakDuration
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch break sessions' },
      { status: 500 }
    )
  }
}
