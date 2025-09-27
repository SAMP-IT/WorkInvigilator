import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get recordings from the recordings table (complete recordings)
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select(`
        id,
        user_id,
        filename,
        duration,
        file_url,
        created_at,
        profiles!recordings_user_id_fkey (
          name,
          email
        )
      `)
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Get recording chunks (chunked recordings)
    const { data: chunks, error: chunksError } = await supabase
      .from('recording_chunks')
      .select(`
        id,
        user_id,
        session_start_time,
        chunk_number,
        filename,
        file_url,
        duration_seconds,
        chunk_start_time,
        created_at,
        profiles!recording_chunks_user_id_fkey (
          name,
          email
        )
      `)
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (recordingsError && chunksError) {
      console.error('Error fetching audio data:', { recordingsError, chunksError })
      return NextResponse.json(
        { error: 'Failed to fetch audio recordings' },
        { status: 500 }
      )
    }

    // Combine and format recordings and chunks
    const allAudioRecordings = []

    // Process complete recordings
    if (recordings && recordings.length > 0) {
      recordings.forEach(recording => {
        allAudioRecordings.push({
          id: recording.id,
          type: 'complete',
          user_id: recording.user_id,
          employeeName: recording.profiles?.name || recording.profiles?.email || 'Unknown',
          filename: recording.filename,
          duration: recording.duration, // Duration in milliseconds
          durationFormatted: formatDuration(recording.duration),
          file_url: recording.file_url,
          created_at: recording.created_at,
          timestamp: new Date(recording.created_at).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          file_size: null, // Not stored in current schema
          session_info: null
        })
      })
    }

    // Process recording chunks - group by session
    if (chunks && chunks.length > 0) {
      const chunksGroupedBySession = chunks.reduce((acc, chunk) => {
        const sessionKey = chunk.session_start_time || 'unknown'
        if (!acc[sessionKey]) {
          acc[sessionKey] = []
        }
        acc[sessionKey].push(chunk)
        return acc
      }, {} as Record<string, typeof chunks>)

      // Create entries for each session's chunks
      Object.entries(chunksGroupedBySession).forEach(([sessionStart, sessionChunks]) => {
        const totalDuration = sessionChunks.reduce((sum, chunk) => sum + (chunk.duration_seconds * 1000 || 0), 0)
        const firstChunk = sessionChunks[0]

        allAudioRecordings.push({
          id: `session-${sessionStart}`,
          type: 'chunked',
          user_id: firstChunk.user_id,
          employeeName: firstChunk.profiles?.name || firstChunk.profiles?.email || 'Unknown',
          filename: `Session ${new Date(sessionStart).toLocaleDateString()} (${sessionChunks.length} chunks)`,
          duration: totalDuration,
          durationFormatted: formatDuration(totalDuration),
          file_url: null, // Chunked recordings don't have single URL
          created_at: sessionStart,
          timestamp: new Date(sessionStart).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          file_size: null,
          session_info: {
            session_start_time: sessionStart,
            total_chunks: sessionChunks.length,
            chunks: sessionChunks.map(chunk => ({
              id: chunk.id,
              chunk_number: chunk.chunk_number,
              filename: chunk.filename,
              file_url: chunk.file_url,
              duration_seconds: chunk.duration_seconds,
              chunk_start_time: chunk.chunk_start_time
            }))
          }
        })
      })
    }

    // Sort all recordings by creation date (most recent first)
    allAudioRecordings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Get total count for pagination
    const { count: totalRecordings } = await supabase
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', employeeId)

    const { count: totalChunks } = await supabase
      .from('recording_chunks')
      .select('session_start_time', { count: 'exact', head: true })
      .eq('user_id', employeeId)

    // Estimate total count (this is approximate for chunked sessions)
    const totalCount = (totalRecordings || 0) + Math.ceil((totalChunks || 0) / 4) // Assume avg 4 chunks per session

    return NextResponse.json({
      recordings: allAudioRecordings,
      totalCount,
      hasMore: (offset + limit) < totalCount,
      pagination: {
        offset,
        limit,
        total: totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching audio recordings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio recordings' },
      { status: 500 }
    )
  }
}

// Helper function to format duration from milliseconds
function formatDuration(milliseconds: number | null): string {
  if (!milliseconds || milliseconds === 0) return '0:00'

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `0:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Get all employees for audio management
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'getEmployees') {
      // Get all employees that have audio recordings
      const { data: employees } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          department
        `)
        .order('name', { ascending: true })

      // Get recording counts for each employee
      const employeesWithCounts = await Promise.all(
        (employees || []).map(async (employee) => {
          const { count: recordingCount } = await supabase
            .from('recordings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', employee.id)

          const { count: chunkCount } = await supabase
            .from('recording_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', employee.id)

          return {
            ...employee,
            recordingCount: recordingCount || 0,
            chunkCount: chunkCount || 0,
            totalAudioFiles: (recordingCount || 0) + (chunkCount || 0)
          }
        })
      )

      return NextResponse.json({
        employees: employeesWithCounts
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in audio POST endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}