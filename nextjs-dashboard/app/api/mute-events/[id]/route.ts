import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: muteEventId } = await params

    if (!muteEventId) {
      return NextResponse.json(
        { error: 'Mute event ID is required' },
        { status: 400 }
      )
    }

    // Get the mute event details
    const { data: muteEvent, error: muteError } = await supabaseAdmin
      .from('mute_events')
      .select('*')
      .eq('id', muteEventId)
      .single()

    if (muteError || !muteEvent) {
      return NextResponse.json(
        { error: 'Mute event not found' },
        { status: 404 }
      )
    }

    // Get the session details
    const { data: session } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('id', muteEvent.session_id)
      .single()

    // Get audio chunks for this session
    const { data: audioChunks } = await supabaseAdmin
      .from('recording_chunks')
      .select('*')
      .eq('session_start_time', session?.session_start_time)
      .eq('user_id', muteEvent.user_id)
      .order('chunk_number', { ascending: true })

    // Get screenshots for this session (sample - first 5 and last 5)
    const { data: screenshots } = await supabaseAdmin
      .from('screenshots')
      .select('id, created_at, file_url')
      .eq('session_id', muteEvent.session_id)
      .order('created_at', { ascending: true })
      .limit(10)

    // Format timeline
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/New_York'
      })
    }

    const timeline = []

    // Add session start
    if (session) {
      timeline.push({
        type: 'session_start',
        time: formatTime(session.session_start_time),
        timestamp: session.session_start_time,
        description: 'Work Invigilator ON - Session started'
      })
    }

    // Add mute detection
    timeline.push({
      type: 'mute_detected',
      time: formatTime(muteEvent.mute_start_time),
      timestamp: muteEvent.mute_start_time,
      description: `Mute detected: ${muteEvent.detection_type.replace('_', ' ')}`,
      detectionType: muteEvent.detection_type,
      audioLevel: muteEvent.audio_level
    })

    // Add mute end if exists
    if (muteEvent.mute_end_time) {
      timeline.push({
        type: 'mute_ended',
        time: formatTime(muteEvent.mute_end_time),
        timestamp: muteEvent.mute_end_time,
        description: 'Mute ended - Audio resumed',
        duration: muteEvent.duration_seconds
      })
    }

    // Add session end
    if (session?.session_end_time) {
      timeline.push({
        type: 'session_end',
        time: formatTime(session.session_end_time),
        timestamp: session.session_end_time,
        description: 'Work Invigilator OFF - Session ended'
      })
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({
      muteEvent: {
        id: muteEvent.id,
        detectionType: muteEvent.detection_type,
        audioLevel: muteEvent.audio_level,
        muteStartTime: formatTime(muteEvent.mute_start_time),
        muteEndTime: muteEvent.mute_end_time ? formatTime(muteEvent.mute_end_time) : null,
        durationSeconds: muteEvent.duration_seconds
      },
      session: session ? {
        id: session.id,
        startTime: formatTime(session.session_start_time),
        endTime: session.session_end_time ? formatTime(session.session_end_time) : 'Active',
        totalDuration: session.total_duration_seconds
      } : null,
      audioChunks: audioChunks?.map((chunk: any) => ({
        chunkNumber: chunk.chunk_number,
        duration: chunk.duration_seconds,
        startTime: formatTime(chunk.chunk_start_time),
        filename: chunk.filename,
        fileUrl: chunk.file_url
      })) || [],
      screenshots: screenshots?.map((ss: any) => ({
        id: ss.id,
        time: formatTime(ss.created_at),
        fileUrl: ss.file_url
      })) || [],
      timeline
    })

  } catch (error) {
    console.error('Error fetching mute event details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
