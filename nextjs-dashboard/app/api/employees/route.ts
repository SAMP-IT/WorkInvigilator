import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Starting employee fetch...') // Debug log

    // Get organization_id from query params (passed from frontend)
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get employees filtered by organization
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .in('role', ['user', 'admin']) // Include both users and admins
      .order('created_at', { ascending: false })

    console.log('API: Raw employees data:', employees) // Debug log
    console.log('API: Error:', employeesError) // Debug log

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json(
        { error: 'Failed to fetch employees data', details: employeesError },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      console.log('API: No employees found') // Debug log
      return NextResponse.json({
        employees: [],
        totalCount: 0
      })
    }

    // Calculate real metrics for each employee
    const employeesWithMetrics = await Promise.all(
      employees.map(async (employee) => {
        // Get last 7 days of sessions for productivity calculation
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // Get employee sessions from last 7 days
        const { data: sessions } = await supabaseAdmin
          .from('recording_sessions')
          .select('*')
          .eq('user_id', employee.id)
          .gte('session_start_time', sevenDaysAgo.toISOString())
          .order('session_start_time', { ascending: false })

        // Get productivity metrics from last 7 days
        const { data: metrics } = await supabaseAdmin
          .from('productivity_metrics')
          .select('*')
          .eq('user_id', employee.id)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0])

        // Check if user has active session
        const { data: activeSessions } = await supabaseAdmin
          .from('recording_sessions')
          .select('*')
          .eq('user_id', employee.id)
          .is('session_end_time', null)
          .limit(1)

        // Calculate metrics
        const totalWorkSeconds = sessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) || 0
        const totalFocusSeconds = metrics?.reduce((sum, m) => sum + (m.focus_time_seconds || 0), 0) ||
          Math.floor(totalWorkSeconds * 0.85) // Fallback: assume 85% focus time

        const productivity7d = totalWorkSeconds > 0 ?
          Number(((totalFocusSeconds / totalWorkSeconds) * 100).toFixed(1)) : 0

        // Get break sessions for this employee (last 7 days)
        const { data: breakSessions } = await supabaseAdmin
          .from('break_sessions')
          .select('break_duration_ms')
          .eq('user_id', employee.id)
          .eq('organization_id', organizationId)
          .gte('break_date', sevenDaysAgo)

        const totalBreakMs = breakSessions?.reduce((sum, b) => sum + (b.break_duration_ms || 0), 0) || 0
        const totalBreakSeconds = Math.floor(totalBreakMs / 1000)
        const avgBreakHDay = totalBreakSeconds > 0 ?
          Number((totalBreakSeconds / (7 * 3600)).toFixed(1)) : 0

        const avgSessionMin = sessions && sessions.length > 0 ?
          Math.round((totalWorkSeconds / sessions.length) / 60) : 0

        // Determine last active time
        let lastActive = 'Never'
        if (sessions && sessions.length > 0) {
          const lastSession = sessions[0]
          const lastActiveTime = new Date(lastSession.session_start_time)
          const now = new Date()
          const hoursDiff = Math.round((now.getTime() - lastActiveTime.getTime()) / (1000 * 60 * 60))

          if (hoursDiff < 1) {
            lastActive = 'Less than 1 hour ago'
          } else if (hoursDiff < 24) {
            lastActive = `${hoursDiff} hours ago`
          } else {
            const daysDiff = Math.round(hoursDiff / 24)
            lastActive = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`
          }
        }

        // Determine status (online if has active session)
        const status = activeSessions && activeSessions.length > 0 ? 'online' : 'offline'

        return {
          id: employee.id,
          name: employee.name || employee.email.split('@')[0],
          email: employee.email,
          department: employee.department || 'General',
          role: employee.role || 'user',
          productivity7d,
          avgBreakHDay,
          avgSessionMin,
          lastActive,
          status: status as 'online' | 'offline',
          createdAt: employee.created_at,
          shiftStartTime: employee.shift_start_time,
          shiftEndTime: employee.shift_end_time
        }
      })
    )

    console.log('API: Returning employees with real metrics:', employeesWithMetrics.length) // Debug log

    return NextResponse.json({
      employees: employeesWithMetrics,
      totalCount: employeesWithMetrics.length
    })

  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, department, role, shiftStartTime, shiftEndTime, organizationId } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    console.log('Creating user account...', { email, name })

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Generate a UUID for the new user
    const userId = crypto.randomUUID()

    // Try to create user with regular signup first
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: role || 'user'
        }
      }
    })

    if (signUpError) {
      console.error('Sign up error:', signUpError)
      return NextResponse.json(
        { error: `Failed to create user: ${signUpError.message}` },
        { status: 400 }
      )
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      )
    }

    console.log('User signed up:', signUpData.user.id)

    // Now create/update the profile with organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: signUpData.user.id,
        email,
        name,
        department: department || 'General',
        role: (role || 'user').toLowerCase(),
        organization_id: organizationId,
        shift_start_time: shiftStartTime || null,
        shift_end_time: shiftEndTime || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log('Employee created successfully:', profile)

    return NextResponse.json({
      employee: profile,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        emailConfirmed: signUpData.user.email_confirmed_at ? true : false
      },
      message: 'Employee created successfully!'
    })

  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}