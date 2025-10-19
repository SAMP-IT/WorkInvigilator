import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {

    // Get organization_id and date range from query params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Default to current month if no dates provided
    const startDate = dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const endDate = dateTo || new Date().toISOString().split('T')[0]

    // Get employees filtered by organization
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .in('role', ['user', 'admin']) // Include both users and admins
      .order('created_at', { ascending: false })


    if (employeesError) {
      return NextResponse.json(
        { error: 'Failed to fetch employees data', details: employeesError },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        employees: [],
        totalCount: 0
      })
    }

    // Calculate real metrics for each employee
    const employeesWithMetrics = await Promise.all(
      employees.map(async (employee) => {
        // Get screenshots from date range
        const { data: screenshots, count: totalScreenshots } = await supabaseAdmin
          .from('screenshots')
          .select('created_at', { count: 'exact', head: false })
          .eq('user_id', employee.id)
          .gte('created_at', `${startDate}T00:00:00.000Z`)
          .lte('created_at', `${endDate}T23:59:59.999Z`)
          .order('created_at', { ascending: false })
          .limit(1000) // Increased limit for monthly data

        // Get audio recordings from date range
        const { data: audioChunks } = await supabaseAdmin
          .from('audio_chunks')
          .select('created_at, duration_seconds')
          .eq('user_id', employee.id)
          .gte('created_at', `${startDate}T00:00:00.000Z`)
          .lte('created_at', `${endDate}T23:59:59.999Z`)
          .limit(1000)

        // Get employee sessions from date range
        const { data: allSessions } = await supabaseAdmin
          .from('recording_sessions')
          .select('*')
          .eq('user_id', employee.id)
          .gte('session_start_time', `${startDate}T00:00:00.000Z`)
          .lte('session_start_time', `${endDate}T23:59:59.999Z`)
          .order('session_start_time', { ascending: false })

        // Filter out invalid sessions
        // Valid session criteria:
        // 1. Must have end time (completed session)
        // 2. Duration must be between 1 second and 24 hours (86400 seconds)
        // 3. Duration must not be null or negative
        const validSessions = allSessions?.filter(s => {
          if (!s.session_end_time) return false; // Skip active sessions
          if (!s.total_duration_seconds) return false; // Skip null durations
          if (s.total_duration_seconds < 0) return false; // Skip negative durations
          if (s.total_duration_seconds > 86400) return false; // Skip sessions > 24 hours
          return true;
        }) || []

        // Remove overlapping sessions (keep only the first one in each overlap)
        // Sort by start time first
        const sortedSessions = [...validSessions].sort((a, b) =>
          new Date(a.session_start_time).getTime() - new Date(b.session_start_time).getTime()
        )

        const sessions = []
        let lastEndTime = 0

        for (const session of sortedSessions) {
          const startTime = new Date(session.session_start_time).getTime()
          const endTime = new Date(session.session_end_time).getTime()

          // Only include if it doesn't overlap with previous session
          if (startTime >= lastEndTime) {
            sessions.push(session)
            lastEndTime = endTime
          } else {
            console.warn(`Skipping overlapping session for employee ${employee.email}`)
          }
        }

        // Get productivity metrics from date range
        const { data: metrics } = await supabaseAdmin
          .from('productivity_metrics')
          .select('*')
          .eq('user_id', employee.id)
          .gte('date', startDate)
          .lte('date', endDate)

        // Calculate total work time from valid sessions only
        let totalWorkSeconds = sessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0)

        // If no sessions, estimate work time from audio chunks
        if (totalWorkSeconds === 0 && audioChunks && audioChunks.length > 0) {
          totalWorkSeconds = audioChunks.reduce((sum, a) => sum + (a.duration_seconds || 0), 0)
        }

        // If still no work time, estimate from screenshot count (assume 1 screenshot every 2 minutes)
        if (totalWorkSeconds === 0 && totalScreenshots && totalScreenshots > 0) {
          totalWorkSeconds = totalScreenshots * 120 // 2 minutes per screenshot
        }

        const totalFocusSeconds = metrics?.reduce((sum, m) => sum + (m.focus_time_seconds || 0), 0) ||
          Math.floor(totalWorkSeconds * 0.85) // Fallback: assume 85% focus time

        const productivity7d = totalWorkSeconds > 0 ?
          Number(((totalFocusSeconds / totalWorkSeconds) * 100).toFixed(1)) : 0

        // Get break sessions for this employee from date range
        const { data: breakSessions } = await supabaseAdmin
          .from('break_sessions')
          .select('break_duration_ms')
          .eq('user_id', employee.id)
          .eq('organization_id', organizationId)
          .gte('break_date', startDate)
          .lte('break_date', endDate)

        const totalBreakMs = breakSessions?.reduce((sum, b) => sum + (b.break_duration_ms || 0), 0) || 0
        const totalBreakSeconds = Math.floor(totalBreakMs / 1000)
        const totalBreakHours = Number((totalBreakSeconds / 3600).toFixed(1))

        // Calculate total work hours
        let totalWorkHours = Number((totalWorkSeconds / 3600).toFixed(1))

        // Realistic work hours cap
        // Maximum reasonable work hours:
        // - 30 days × 12 hours/day = 360 hours (extreme overtime every day)
        // - 22 work days × 16 hours/day = 352 hours (very long shifts)
        // Cap at 360 hours - anything above indicates overlapping sessions or data issues
        const REALISTIC_MAX_HOURS = 360

        if (totalWorkHours > REALISTIC_MAX_HOURS) {
          console.warn(`Employee ${employee.email} has unrealistic work hours: ${totalWorkHours}h. Capping at ${REALISTIC_MAX_HOURS}h.`)
          totalWorkHours = REALISTIC_MAX_HOURS
        }

        // Determine last active time from screenshots, audio, or sessions
        let lastActive = 'Never'
        let lastActiveTime: Date | null = null

        if (screenshots && screenshots.length > 0) {
          lastActiveTime = new Date(screenshots[0].created_at)
        } else if (audioChunks && audioChunks.length > 0) {
          lastActiveTime = new Date(audioChunks[0].created_at)
        } else if (sessions && sessions.length > 0) {
          lastActiveTime = new Date(sessions[0].session_start_time)
        }

        if (lastActiveTime) {
          const now = new Date()
          const hoursDiff = Math.round((now.getTime() - lastActiveTime.getTime()) / (1000 * 60 * 60))

          if (hoursDiff < 1) {
            lastActive = 'Just now'
          } else if (hoursDiff < 24) {
            lastActive = `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`
          } else {
            const daysDiff = Math.round(hoursDiff / 24)
            lastActive = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`
          }
        }

        // Determine status - prioritize punch-in status, fallback to recent activity
        let status: 'online' | 'offline' = 'offline'

        // Check if user has active session (is punched in)
        const { data: activeSession } = await supabaseAdmin
          .from('recording_sessions')
          .select('id')
          .eq('user_id', employee.id)
          .is('session_end_time', null) // NULL = punched in
          .limit(1)

        if (activeSession && activeSession.length > 0) {
          status = 'online'
        } else {
          // Fallback to screenshot-based detection (within last 10 minutes)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
          const isRecentlyActive = lastActiveTime && lastActiveTime > tenMinutesAgo
          status = isRecentlyActive ? 'online' : 'offline'
        }

        return {
          id: employee.id,
          name: employee.name || employee.email.split('@')[0],
          email: employee.email,
          department: employee.department || 'General',
          role: employee.role || 'user',
          productivity7d,
          totalBreakHours,
          totalWorkHours,
          lastActive,
          status: status as 'online' | 'offline',
          createdAt: employee.created_at,
          shiftStartTime: employee.shift_start_time,
          shiftEndTime: employee.shift_end_time,
          hourlyRate: employee.hourly_rate || 0
        }
      })
    )


    return NextResponse.json({
      employees: employeesWithMetrics,
      totalCount: employeesWithMetrics.length
    })

  } catch (error) {
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

    // Use Admin API to create user (bypasses email confirmation)
    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role: role || 'user'
      }
    })

    if (createUserError) {
      return NextResponse.json(
        { error: `Failed to create user: ${createUserError.message}` },
        { status: 400 }
      )
    }

    if (!createUserData.user) {
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      )
    }


    // Now create/update the profile with organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: createUserData.user.id,
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
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }


    return NextResponse.json({
      employee: profile,
      user: {
        id: createUserData.user.id,
        email: createUserData.user.email,
        emailConfirmed: createUserData.user.email_confirmed_at ? true : false
      },
      message: 'Employee created successfully!'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const organizationId = searchParams.get('organizationId')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify the employee belongs to the organization
    const { data: employee, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, email')
      .eq('id', employeeId)
      .eq('organization_id', organizationId)
      .single()

    if (verifyError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // Delete all related data for the employee
    // 1. Delete screenshots
    await supabaseAdmin
      .from('screenshots')
      .delete()
      .eq('user_id', employeeId)

    // 2. Delete audio chunks
    await supabaseAdmin
      .from('audio_chunks')
      .delete()
      .eq('user_id', employeeId)

    // 3. Delete recording sessions
    await supabaseAdmin
      .from('recording_sessions')
      .delete()
      .eq('user_id', employeeId)

    // 4. Delete productivity metrics
    await supabaseAdmin
      .from('productivity_metrics')
      .delete()
      .eq('user_id', employeeId)

    // 5. Delete break sessions
    await supabaseAdmin
      .from('break_sessions')
      .delete()
      .eq('user_id', employeeId)

    // 6. Delete activity logs
    await supabaseAdmin
      .from('activity_logs')
      .delete()
      .eq('user_id', employeeId)

    // 7. Delete attendance records
    await supabaseAdmin
      .from('attendance')
      .delete()
      .eq('user_id', employeeId)

    // 8. Delete idle time logs
    await supabaseAdmin
      .from('idle_time_logs')
      .delete()
      .eq('user_id', employeeId)

    // 9. Delete the profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', employeeId)

    if (profileDeleteError) {
      return NextResponse.json(
        { error: `Failed to delete profile: ${profileDeleteError.message}` },
        { status: 500 }
      )
    }

    // 10. Delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)

    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError)
      // Continue anyway since profile is deleted
    }

    return NextResponse.json({
      message: 'Employee account and all related data deleted successfully',
      deletedEmployeeId: employeeId,
      deletedEmail: employee.email
    })

  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee account' },
      { status: 500 }
    )
  }
}