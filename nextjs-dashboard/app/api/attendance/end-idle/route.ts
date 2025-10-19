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

    const body = await request.json();
    const { idlePeriodId, idleEndTime } = body;

    if (!idlePeriodId) {
      return NextResponse.json({ error: 'Idle period ID required' }, { status: 400 });
    }

    // Get idle period
    const { data: idlePeriod } = await supabaseAdmin
      .from('idle_periods')
      .select('idle_start_time, attendance_record_id')
      .eq('id', idlePeriodId)
      .eq('user_id', user.id)
      .single();

    if (!idlePeriod) {
      return NextResponse.json({ error: 'Idle period not found' }, { status: 404 });
    }

    // Calculate duration
    const startTime = new Date(idlePeriod.idle_start_time);
    const endTime = new Date(idleEndTime);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Update idle period
    const { error: updateError } = await supabaseAdmin
      .from('idle_periods')
      .update({
        idle_end_time: idleEndTime,
        duration_seconds: durationSeconds,
        activity_resumed_at: idleEndTime
      })
      .eq('id', idlePeriodId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update attendance record with total idle time
    if (idlePeriod.attendance_record_id) {
      // Get current total idle seconds
      const { data: attendance } = await supabaseAdmin
        .from('attendance_records')
        .select('total_idle_seconds')
        .eq('id', idlePeriod.attendance_record_id)
        .single();

      const currentIdleSeconds = attendance?.total_idle_seconds || 0;
      const newTotalIdleSeconds = currentIdleSeconds + durationSeconds;

      // Update attendance record
      await supabaseAdmin
        .from('attendance_records')
        .update({
          total_idle_seconds: newTotalIdleSeconds,
          last_activity_time: idleEndTime
        })
        .eq('id', idlePeriod.attendance_record_id);
    }

    return NextResponse.json({
      success: true,
      durationSeconds
    });

  } catch (error) {
    console.error('End idle API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
