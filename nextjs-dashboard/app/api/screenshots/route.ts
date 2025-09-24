import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('screenshots')
      .select(`
        id,
        user_id,
        filename,
        file_url,
        created_at,
        session_id,
        profiles!screenshots_user_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by employee if specified
    if (employeeId && employeeId !== 'all') {
      query = query.eq('user_id', employeeId)
    }

    // Apply limit
    query = query.limit(limit)

    const { data: screenshots } = await query

    // Format screenshots for frontend
    const formattedScreenshots = (screenshots || []).map(screenshot => {
      // Extract timestamp from created_at
      const timestamp = new Date(screenshot.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Estimate file size (placeholder since we don't store it)
      const estimatedSize = (Math.random() * 0.8 + 0.5).toFixed(1) + 'MB'

      return {
        id: screenshot.id,
        employeeId: screenshot.user_id,
        employeeName: screenshot.profiles?.name || 'Unknown Employee',
        timestamp,
        url: screenshot.file_url,
        size: estimatedSize,
        application: 'Work Application', // Placeholder since we don't track specific apps yet
        filename: screenshot.filename
      }
    })

    // Get summary statistics
    const { count: totalCount } = await supabase
      .from('screenshots')
      .select('*', { count: 'exact', head: true })
      .eq(employeeId && employeeId !== 'all' ? 'user_id' : 'id', employeeId && employeeId !== 'all' ? employeeId : screenshot => true)

    return NextResponse.json({
      screenshots: formattedScreenshots,
      totalCount: totalCount || 0,
      todayCount: formattedScreenshots.length // Simplified - all are from recent activity
    })

  } catch (error) {
    console.error('Error fetching screenshots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshots data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const screenshotId = searchParams.get('id')

    if (!screenshotId) {
      return NextResponse.json(
        { error: 'Screenshot ID is required' },
        { status: 400 }
      )
    }

    // Get screenshot info before deletion
    const { data: screenshot } = await supabase
      .from('screenshots')
      .select('filename, file_url')
      .eq('id', screenshotId)
      .single()

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      )
    }

    // Delete from database
    const { error } = await supabase
      .from('screenshots')
      .delete()
      .eq('id', screenshotId)

    if (error) {
      console.error('Error deleting screenshot from database:', error)
      return NextResponse.json(
        { error: 'Failed to delete screenshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Screenshot deleted successfully' })

  } catch (error) {
    console.error('Error deleting screenshot:', error)
    return NextResponse.json(
      { error: 'Failed to delete screenshot' },
      { status: 500 }
    )
  }
}