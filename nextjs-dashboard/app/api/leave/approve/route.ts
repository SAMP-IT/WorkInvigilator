import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let managerId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      managerId = user.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', managerId)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only managers can approve leave requests' }, { status: 403 });
    }

    const body = await request.json();
    const { leaveRequestId, action, rejectionReason } = body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get leave request
    const { data: leaveRequest } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', leaveRequestId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Leave request already processed' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update leave request
      await supabaseAdmin
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: managerId,
          approved_at: now
        })
        .eq('id', leaveRequestId);

      // Update leave balance
      const currentYear = new Date().getFullYear();
      const { data: balance } = await supabaseAdmin
        .from('leave_balances')
        .select('used_days')
        .eq('user_id', leaveRequest.user_id)
        .eq('year', currentYear)
        .eq('leave_type', leaveRequest.leave_type)
        .single();

      if (balance) {
        await supabaseAdmin
          .from('leave_balances')
          .update({
            used_days: balance.used_days + leaveRequest.total_days
          })
          .eq('user_id', leaveRequest.user_id)
          .eq('year', currentYear)
          .eq('leave_type', leaveRequest.leave_type);
      }

      // Create attendance records for leave days
      const startDate = new Date(leaveRequest.start_date);
      const endDate = new Date(leaveRequest.end_date);

      const leaveRecords = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        leaveRecords.push({
          user_id: leaveRequest.user_id,
          organization_id: profile.organization_id,
          date: dateStr,
          clock_in_time: `${dateStr}T09:00:00Z`,
          status: 'on_leave',
          notes: `${leaveRequest.leave_type} - ${leaveRequest.reason || 'No reason provided'}`,
          auto_clocked_in: false,
          auto_clocked_out: false
        });
      }

      // Insert attendance records (ignore conflicts for existing dates)
      await supabaseAdmin
        .from('attendance_records')
        .upsert(leaveRecords, { onConflict: 'user_id,organization_id,date' });

      return NextResponse.json({
        success: true,
        message: 'Leave request approved'
      });

    } else {
      // Reject
      await supabaseAdmin
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: managerId,
          approved_at: now,
          rejection_reason: rejectionReason || 'No reason provided'
        })
        .eq('id', leaveRequestId);

      return NextResponse.json({
        success: true,
        message: 'Leave request rejected'
      });
    }

  } catch (error) {
    console.error('Leave approve API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
