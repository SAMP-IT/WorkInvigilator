import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to fetch organization_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { activities, sessionId } = body;

    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ error: 'Invalid activities data' }, { status: 400 });
    }

    // Fetch all productivity categories for auto-categorization
    const { data: categories } = await supabaseAdmin
      .from('productivity_categories')
      .select('*')
      .eq('organization_id', profile.organization_id);

    const categoryMap = new Map(
      categories?.map(cat => [cat.identifier.toLowerCase(), cat]) || []
    );

    // Process and categorize each activity
    const processedActivities = activities.map(activity => {
      let category = 'neutral';
      let productivityScore = 0;

      // Try to match by app name
      const appKey = activity.appName?.toLowerCase();
      if (appKey && categoryMap.has(appKey)) {
        const cat = categoryMap.get(appKey)!;
        category = cat.category;
        productivityScore = cat.productivity_score;
      }

      // If it's a browser and we have a domain, try to match by domain
      if (activity.domain) {
        const domainKey = activity.domain.toLowerCase();
        if (categoryMap.has(domainKey)) {
          const cat = categoryMap.get(domainKey)!;
          category = cat.category;
          productivityScore = cat.productivity_score;
        }
      }

      return {
        user_id: user.id,
        organization_id: profile.organization_id,
        session_id: sessionId || null,
        app_name: activity.appName,
        window_title: activity.windowTitle,
        url: activity.url || null,
        domain: activity.domain || null,
        category,
        productivity_score: productivityScore,
        start_time: activity.timestamp || new Date().toISOString(),
        end_time: null, // Will be updated when activity ends
        duration_seconds: null, // Will be calculated later
      };
    });

    // Batch insert activity logs
    const { error: insertError } = await supabaseAdmin
      .from('activity_logs')
      .insert(processedActivities);

    if (insertError) {
      console.error('Error inserting activity logs:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: processedActivities.length,
    });

  } catch (error) {
    console.error('Activity logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve activity logs for a user
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to fetch organization_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    let query = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('start_time', { ascending: false });

    // Filter by employee if specified (managers only)
    if (employeeId) {
      query = query.eq('user_id', employeeId);
    } else {
      // Non-managers can only see their own data
      query = query.eq('user_id', user.id);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: data });

  } catch (error) {
    console.error('Activity logs GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
