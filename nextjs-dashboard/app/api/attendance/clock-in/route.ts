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
    const { clockInTime, date, locationLogId } = body;

    // Get organization work hours settings
    const { data: settings } = await supabaseAdmin
      .from('work_hours_settings')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single();

    const workStartTime = settings?.work_start_time || '09:00:00';
    const lateThreshold = settings?.late_threshold_minutes || 15;

    // Calculate if employee is late
    const clockInDate = new Date(clockInTime);
    const clockInTimeOnly = clockInDate.toTimeString().split(' ')[0]; // HH:MM:SS

    // Parse expected start time and calculate late by
    const [expectedHour, expectedMin] = workStartTime.split(':').map(Number);
    const [actualHour, actualMin, actualSec] = clockInTimeOnly.split(':').map(Number);

    const expectedMinutes = expectedHour * 60 + expectedMin;
    const actualMinutes = actualHour * 60 + actualMin;
    const lateByMinutes = Math.max(0, actualMinutes - expectedMinutes);

    const isLate = lateByMinutes > lateThreshold;
    const status = isLate ? 'late' : 'present';

    // Get location verification status if locationLogId is provided
    let clockInVerified = true; // Default to true if no geofencing
    if (locationLogId) {
      const { data: locationLog } = await supabaseAdmin
        .from('location_logs')
        .select('is_verified')
        .eq('id', locationLogId)
        .single();

      if (locationLog) {
        clockInVerified = locationLog.is_verified;
      }
    }

    // Check if attendance record already exists for today
    const { data: existing } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .eq('date', date)
      .single();

    let attendanceId;

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('attendance_records')
        .update({
          clock_in_time: clockInTime,
          first_activity_time: clockInTime,
          is_late: isLate,
          late_by_minutes: lateByMinutes,
          status: status,
          auto_clocked_in: true,
          clock_in_location_id: locationLogId || null,
          clock_in_verified: clockInVerified
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      attendanceId = existing.id;
    } else {
      // Create new attendance record
      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from('attendance_records')
        .insert({
          user_id: user.id,
          organization_id: profile.organization_id,
          date: date,
          clock_in_time: clockInTime,
          first_activity_time: clockInTime,
          is_late: isLate,
          late_by_minutes: lateByMinutes,
          status: status,
          auto_clocked_in: true,
          clock_in_location_id: locationLogId || null,
          clock_in_verified: clockInVerified
        })
        .select('id')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      attendanceId = newRecord?.id;
    }

    return NextResponse.json({
      success: true,
      attendanceId,
      isLate,
      lateByMinutes,
      status
    });

  } catch (error) {
    console.error('Clock-in API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
