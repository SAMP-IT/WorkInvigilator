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

    // Get mute events first
    const { data: muteEvents, error } = await supabaseAdmin
      .from('mute_events')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('mute_start_time', dateStart.toISOString())
      .lte('mute_start_time', dateEnd.toISOString())
      .order('mute_start_time', { ascending: false })

    if (error) {
      console.error('Error fetching mute events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mute events' },
        { status: 500 }
      )
    }

    // Get all unique user IDs
    const userIds = [...new Set(muteEvents.map((event: any) => event.user_id))]

    // Get employee details separately
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, department')
      .in('id', userIds)

    // Create a map of user_id to profile
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])

    // Format the response
    const formattedEvents = muteEvents.map((event: any) => {
      const profile = profileMap.get(event.user_id)

      const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/New_York'
        })
      }

      // Calculate duration (either from DB or calculate for active events)
      let durationSeconds = event.duration_seconds
      if (!durationSeconds && event.mute_start_time) {
        // Calculate duration for active mute events
        const startTime = new Date(event.mute_start_time).getTime()
        const endTime = event.mute_end_time ? new Date(event.mute_end_time).getTime() : Date.now()
        durationSeconds = Math.floor((endTime - startTime) / 1000)
      }

      return {
        id: event.id,
        employeeName: profile?.name || 'Unknown',
        employeeEmail: profile?.email || 'Unknown',
        employeeDepartment: profile?.department || 'N/A',
        muteStartTime: formatTime(event.mute_start_time),
        muteEndTime: event.mute_end_time ? formatTime(event.mute_end_time) : 'Ongoing',
        durationSeconds: durationSeconds || 0,
        detectionType: event.detection_type,
        audioLevel: event.audio_level,
        date: new Date(event.mute_start_time).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        status: event.mute_end_time ? 'completed' : 'active',
        sessionId: event.session_id,
        userId: event.user_id
      }
    })

    return NextResponse.json({
      events: formattedEvents,
      total: formattedEvents.length
    })

  } catch (error) {
    console.error('Error in mute events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
