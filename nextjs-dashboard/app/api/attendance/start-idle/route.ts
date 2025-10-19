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

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { attendanceId, idleStartTime } = body;

    // Determine idle type based on duration and time of day
    const idleStart = new Date(idleStartTime);
    const hour = idleStart.getHours();

    let idleType = 'short_break';
    if (hour >= 12 && hour < 14) {
      idleType = 'lunch_break';
    }

    // Create idle period record
    const { data: idlePeriod, error: insertError } = await supabaseAdmin
      .from('idle_periods')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        attendance_record_id: attendanceId,
        idle_start_time: idleStartTime,
        idle_type: idleType,
        detected_by: 'auto'
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idlePeriodId: idlePeriod?.id
    });

  } catch (error) {
    console.error('Start idle API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
