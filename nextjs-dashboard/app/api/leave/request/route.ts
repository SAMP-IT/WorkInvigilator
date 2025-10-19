import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST - Create leave request
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else {
      // Try cookie-based auth for web
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // In a real implementation, parse the cookie and verify the session
      return NextResponse.json({ error: 'Cookie auth not implemented' }, { status: 501 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason } = body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Calculate total days (including weekends for now)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check if user has enough balance
    const currentYear = new Date().getFullYear();
    const { data: balance } = await supabaseAdmin
      .from('leave_balances')
      .select('available_days')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .eq('leave_type', leaveType)
      .single();

    if (balance && balance.available_days < totalDays) {
      return NextResponse.json({
        error: 'Insufficient leave balance',
        available: balance.available_days,
        requested: totalDays
      }, { status: 400 });
    }

    // Create leave request
    const { data: leaveRequest, error: insertError } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: userId,
        organization_id: profile.organization_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leaveRequest
    });

  } catch (error) {
    console.error('Leave request API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        profiles!leave_requests_user_id_fkey(name, email),
        approver:profiles!leave_requests_approved_by_fkey(name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      requests: requests || []
    });

  } catch (error) {
    console.error('Leave request GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
