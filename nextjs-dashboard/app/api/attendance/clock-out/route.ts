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
    const { attendanceId, clockOutTime, locationLogId } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: 'Attendance ID required' }, { status: 400 });
    }

    // Get attendance record
    const { data: attendance } = await supabaseAdmin
      .from('attendance_records')
      .select('clock_in_time, total_break_seconds, total_idle_seconds')
      .eq('id', attendanceId)
      .eq('user_id', user.id)
      .single();

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Get location verification status if locationLogId is provided
    let clockOutVerified = true; // Default to true if no geofencing
    if (locationLogId) {
      const { data: locationLog } = await supabaseAdmin
        .from('location_logs')
        .select('is_verified')
        .eq('id', locationLogId)
        .single();

      if (locationLog) {
        clockOutVerified = locationLog.is_verified;
      }
    }

    // Calculate total work time
    const clockInTime = new Date(attendance.clock_in_time);
    const clockOutTimeDate = new Date(clockOutTime);
    const totalSeconds = Math.floor((clockOutTimeDate.getTime() - clockInTime.getTime()) / 1000);

    const totalBreakSeconds = attendance.total_break_seconds || 0;
    const totalIdleSeconds = attendance.total_idle_seconds || 0;
    const netWorkSeconds = Math.max(0, totalSeconds - totalBreakSeconds - totalIdleSeconds);

    // Update attendance record
    const { error: updateError } = await supabaseAdmin
      .from('attendance_records')
      .update({
        clock_out_time: clockOutTime,
        last_activity_time: clockOutTime,
        total_work_seconds: netWorkSeconds,
        auto_clocked_out: true,
        clock_out_location_id: locationLogId || null,
        clock_out_verified: clockOutVerified,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendanceId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      totalWorkSeconds: netWorkSeconds,
      totalBreakSeconds,
      totalIdleSeconds
    });

  } catch (error) {
    console.error('Clock-out API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
