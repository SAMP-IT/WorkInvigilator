import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Create a Supabase client with the user's token to verify auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get activity data from request body
    const body = await request.json()
    const {
      sessionId,
      appName,
      windowTitle,
      url,
      startTime,
      endTime,
      durationSeconds
    } = body

    if (!appName || !startTime) {
      return NextResponse.json(
        { error: 'Application name and start time are required' },
        { status: 400 }
      )
    }

    // Get user's profile to get organization_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const organizationId = profile.organization_id

    // Extract domain from URL if provided
    let domain = null
    if (url) {
      try {
        const urlObj = new URL(url)
        domain = urlObj.hostname
      } catch (e) {
        // Invalid URL, ignore
      }
    }

    // Categorize the activity
    let category = 'uncategorized'
    let productivityScore = 50

    // Try to match by app name first
    const { data: appRule } = await supabaseAdmin
      .from('productivity_categories')
      .select('category, productivity_score')
      .eq('organization_id', organizationId)
      .eq('match_type', 'app')
      .eq('match_value', appName)
      .eq('is_active', true)
      .single()

    if (appRule) {
      category = appRule.category
      productivityScore = appRule.productivity_score || 50
    } else if (domain) {
      // Try to match by domain
      const { data: domainRule } = await supabaseAdmin
        .from('productivity_categories')
        .select('category, productivity_score')
        .eq('organization_id', organizationId)
        .eq('match_type', 'domain')
        .eq('match_value', domain)
        .eq('is_active', true)
        .single()

      if (domainRule) {
        category = domainRule.category
        productivityScore = domainRule.productivity_score || 50
      }
    }

    // Insert activity log
    const { data: activityLog, error: insertError } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        session_id: sessionId || null,
        app_name: appName,
        window_title: windowTitle || null,
        url: url || null,
        domain: domain,
        start_time: startTime,
        end_time: endTime || null,
        duration_seconds: durationSeconds || null,
        category,
        productivity_score: productivityScore
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting activity log:', insertError)
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activityLogId: activityLog.id,
      category,
      productivityScore
    })

  } catch (error) {
    console.error('Activity log API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
