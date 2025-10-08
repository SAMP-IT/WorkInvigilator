import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidUrl, extractFilePathFromUrl } from '@/lib/backblaze-utils'

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
      .from('screenshots')
      .select('*')
      .eq('organization_id', organizationId)

    // Filter by employee if specified
    if (employeeId && employeeId !== 'all') {
      query = query.eq('user_id', employeeId)
    }

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      // Add 1 day to endDate to include the entire end date
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      query = query.lt('created_at', endDateTime.toISOString())
    }

    // Apply ordering - use range to bypass 1000 row limit
    query = query.order('created_at', { ascending: false })

    const { data: screenshots } = await query.range(0, 999999) // Fetch up to 1 million rows

    // Get unique user IDs to fetch profiles
    const userIds = [...new Set((screenshots || []).map(s => s.user_id))]

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

    // Format screenshots for frontend with URL validation
    const formattedScreenshots = await Promise.all((screenshots || []).map(async screenshot => {
      // Extract timestamp from created_at
      const timestamp = new Date(screenshot.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York'
      })

      // Estimate file size (placeholder since we don't store it)
      const estimatedSize = (Math.random() * 0.8 + 0.5).toFixed(1) + 'MB'

      const profile = profileMap[screenshot.user_id]

      // Get valid Backblaze URL, regenerating if expired (primary storage only)
      let validUrl = screenshot.file_url
      if (screenshot.storage_provider === 'backblaze' && screenshot.file_url) {
        const filePath = extractFilePathFromUrl(screenshot.file_url)
        if (filePath) {
          try {
            validUrl = await getValidUrl(
              screenshot.file_url,
              screenshot.backup_file_url,
              filePath,
              'screenshots',
              screenshot.storage_provider
            )
          } catch (error) {
            console.error('Failed to regenerate Backblaze signed URL for screenshot:', screenshot.id, error)
            // Keep original Backblaze URL even if regeneration fails
            validUrl = screenshot.file_url
          }
        }
      }

      return {
        id: screenshot.id,
        employeeId: screenshot.user_id,
        employeeName: profile?.name || profile?.email || 'Unknown Employee',
        timestamp,
        url: validUrl,
        backupUrl: screenshot.backup_file_url,  // Include backup URL for fallback
        size: estimatedSize,
        application: 'Work Application', // Placeholder since we don't track specific apps yet
        filename: screenshot.filename
      }
    }))

    // Get summary statistics with same filters
    let countQuery = supabaseAdmin
      .from('screenshots')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (employeeId && employeeId !== 'all') {
      countQuery = countQuery.eq('user_id', employeeId)
    }

    // Apply same date filters for count
    if (startDate) {
      countQuery = countQuery.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      countQuery = countQuery.lt('created_at', endDateTime.toISOString())
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      screenshots: formattedScreenshots,
      totalCount: totalCount || 0,
      todayCount: totalCount || 0
    })

  } catch (error) {
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
    const { data: screenshot } = await supabaseAdmin
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
    const { error } = await supabaseAdmin
      .from('screenshots')
      .delete()
      .eq('id', screenshotId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete screenshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Screenshot deleted successfully' })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete screenshot' },
      { status: 500 }
    )
  }
}