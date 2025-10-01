import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🎵 Audio API called:', { employeeId, organizationId, startDate, endDate, limit })

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

    // Get recording chunks filtered by organization and date range
    let chunksQuery = supabaseAdmin
      .from('recording_chunks')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)

    // Apply date filters if provided
    if (startDate) {
      // Date from HTML5 input is in yyyy-mm-dd format, parse as UTC
      const startDateTime = new Date(startDate + 'T00:00:00Z')
      console.log('🎵 Parsed startDate:', { input: startDate, parsed: startDateTime.toISOString() })
      chunksQuery = chunksQuery.gte('created_at', startDateTime.toISOString())
    }
    if (endDate) {
      // Date from HTML5 input is in yyyy-mm-dd format, add 1 day to include the entire end date, parse as UTC
      const endDateTime = new Date(endDate + 'T00:00:00Z')
      endDateTime.setUTCDate(endDateTime.getUTCDate() + 1)
      console.log('🎵 Parsed endDate:', { input: endDate, parsed: endDateTime.toISOString() })
      chunksQuery = chunksQuery.lt('created_at', endDateTime.toISOString())
    }

    chunksQuery = chunksQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: chunks, error: chunksError } = await chunksQuery

    console.log('🎵 Audio chunks found:', chunks?.length || 0, 'Error:', chunksError)

    // Get employee profile separately
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', employeeId)
      .single()

    if (chunksError) {
      console.error('Error fetching audio chunks:', chunksError)
      return NextResponse.json(
        { error: 'Failed to fetch audio recordings' },
        { status: 500 }
      )
    }

    // Format audio recordings
    const allAudioRecordings = []

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
          employeeName: profile?.name || profile?.email || 'Unknown',
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
    const { count: totalChunks } = await supabaseAdmin
      .from('recording_chunks')
      .select('session_start_time', { count: 'exact', head: true })
      .eq('user_id', employeeId)

    // Estimate total count (number of unique sessions)
    const totalCount = allAudioRecordings.length

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
      const { data: employees } = await supabaseAdmin
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
          const { count: chunkCount } = await supabaseAdmin
            .from('recording_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', employee.id)

          return {
            ...employee,
            recordingCount: 0,
            chunkCount: chunkCount || 0,
            totalAudioFiles: chunkCount || 0
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