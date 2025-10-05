import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {

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
        // Get last 7 days of data
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // Get screenshots from last 7 days (as primary activity indicator)
        const { data: screenshots } = await supabaseAdmin
          .from('screenshots')
          .select('created_at')
          .eq('user_id', employee.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })

        // Get audio recordings from last 7 days
        const { data: audioChunks } = await supabaseAdmin
          .from('audio_chunks')
          .select('created_at, duration_seconds')
          .eq('user_id', employee.id)
          .gte('created_at', sevenDaysAgo.toISOString())

        // Get employee sessions from last 7 days (if exists)
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

        // Calculate total work time from sessions OR estimate from screenshots/audio
        let totalWorkSeconds = sessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) || 0

        // If no sessions, estimate work time from audio chunks
        if (totalWorkSeconds === 0 && audioChunks && audioChunks.length > 0) {
          totalWorkSeconds = audioChunks.reduce((sum, a) => sum + (a.duration_seconds || 0), 0)
        }

        // If still no work time, estimate from screenshot count (assume 1 screenshot every 2 minutes)
        if (totalWorkSeconds === 0 && screenshots && screenshots.length > 0) {
          totalWorkSeconds = screenshots.length * 120 // 2 minutes per screenshot
        }

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
          .gte('break_date', sevenDaysAgo.toISOString().split('T')[0])

        const totalBreakMs = breakSessions?.reduce((sum, b) => sum + (b.break_duration_ms || 0), 0) || 0
        const totalBreakSeconds = Math.floor(totalBreakMs / 1000)
        const totalBreakHours = totalBreakSeconds / 3600

        // Calculate average break hours per day (total break hours / number of days with breaks)
        const avgBreakHDay = breakSessions && breakSessions.length > 0 ?
          Number((totalBreakHours / 7).toFixed(1)) : 0

        // Calculate average session from sessions OR estimate from work time
        let avgSessionMin = 0
        if (sessions && sessions.length > 0) {
          avgSessionMin = Math.round((totalWorkSeconds / sessions.length) / 60)
        } else if (totalWorkSeconds > 0) {
          // Estimate based on typical work sessions (assume multiple sessions per day)
          avgSessionMin = Math.round(totalWorkSeconds / 60 / 7) // Average per day
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