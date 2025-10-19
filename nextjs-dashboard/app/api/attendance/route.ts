import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status'); // filter by status

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        profiles!inner(id, name, email)
      `)
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    // Filter by employee
    if (employeeId) {
      query = query.eq('user_id', employeeId);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format records
    const formattedRecords = records?.map((record: any) => {
      const profile = record.profiles;
      const workHours = record.total_work_seconds / 3600;
      const breakHours = record.total_break_seconds / 3600;
      const idleHours = record.total_idle_seconds / 3600;

      // Calculate clock in/out times
      const clockIn = record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : '-';

      const clockOut = record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'Active';

      return {
        id: record.id,
        userId: record.user_id,
        employeeName: profile?.name || profile?.email?.split('@')[0] || 'Unknown',
        employeeEmail: profile?.email,
        date: record.date,
        clockIn,
        clockOut,
        workHours: parseFloat(workHours.toFixed(2)),
        breakHours: parseFloat(breakHours.toFixed(2)),
        idleHours: parseFloat(idleHours.toFixed(2)),
        totalHours: parseFloat(((workHours + breakHours + idleHours).toFixed(2))),
        status: record.status,
        isLate: record.is_late,
        lateByMinutes: record.late_by_minutes || 0,
        autoClocked: record.auto_clocked_in && record.auto_clocked_out,
        notes: record.notes
      };
    }) || [];

    return NextResponse.json({
      records: formattedRecords,
      totalCount: formattedRecords.length
    });

  } catch (error) {
    console.error('Attendance GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
