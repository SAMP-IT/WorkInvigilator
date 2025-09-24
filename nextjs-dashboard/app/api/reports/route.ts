import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get employee info
    const { data: employee } = await supabase
      .from('profiles')
      .select('name, email, department')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Calculate date range based on period
    let startDate: Date
    let endDate = new Date()

    switch (period) {
      case 'daily':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'monthly':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
    }

    // Get sessions for the period
    const { data: sessions } = await supabase
      .from('recording_sessions')
      .select('*')
      .eq('user_id', employeeId)
      .gte('session_start_time', startDate.toISOString())
      .lte('session_start_time', endDate.toISOString())
      .order('session_start_time', { ascending: false })

    // Get productivity metrics for the period
    const { data: metrics } = await supabase
      .from('productivity_metrics')
      .select('*')
      .eq('user_id', employeeId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Get screenshots count for the period
    const { count: screenshotsCount } = await supabase
      .from('screenshots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', employeeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate totals
    const totalWorkSeconds = sessions?.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) || 0
    const totalFocusSeconds = metrics?.reduce((sum, m) => sum + (m.focus_time_seconds || 0), 0) || Math.floor(totalWorkSeconds * 0.85)
    const avgProductivity = metrics && metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.productivity_percentage || 0), 0) / metrics.length
      : totalWorkSeconds > 0 ? (totalFocusSeconds / totalWorkSeconds) * 100 : 0

    // Format time durations
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    }

    // Generate period label
    const periodLabel = period === 'daily'
      ? `Today - ${endDate.toLocaleDateString('en-GB')}`
      : period === 'weekly'
      ? `This Week - ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`
      : `This Month - ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`

    // Build response based on period
    const reportData = {
      employeeName: employee.name,
      employeeEmail: employee.email,
      department: employee.department,
      period: periodLabel,
      workHours: formatTime(totalWorkSeconds),
      focusTime: formatTime(totalFocusSeconds),
      productivity: Number(avgProductivity.toFixed(1)),
      sessionsCount: sessions?.length || 0,
      screenshotsCount: screenshotsCount || 0,
      applications: [
        { name: 'Work Applications', time: formatTime(totalWorkSeconds), percentage: 100 }
      ]
    }

    // Add period-specific breakdowns
    if (period === 'daily' && sessions) {
      (reportData as any).breakdowns = sessions.map(session => ({
        time: `${new Date(session.session_start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}-${session.session_end_time ? new Date(session.session_end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Active'}`,
        activity: 'Work Session',
        focus: Math.round(((session.total_duration_seconds || 0) * 0.85 / (session.total_duration_seconds || 1)) * 100)
      }))
    }

    if (period === 'weekly') {
      // Group sessions by day
      const dailyData = new Map()
      if (sessions && sessions.length > 0) {
        sessions.forEach(session => {
          const day = new Date(session.session_start_time).toLocaleDateString('en-US', { weekday: 'long' })
          if (!dailyData.has(day)) {
            dailyData.set(day, { duration: 0, focus: 0, productivity: 0 })
          }
          const current = dailyData.get(day)
          current.duration += session.total_duration_seconds || 0
          current.focus += Math.floor((session.total_duration_seconds || 0) * 0.85)
        })
      }

      (reportData as any).dailyBreakdown = Array.from(dailyData.entries()).map(([day, data]: [string, any]) => ({
        day,
        hours: formatTime(data.duration),
        focus: formatTime(data.focus),
        productivity: data.duration > 0 ? Number(((data.focus / data.duration) * 100).toFixed(1)) : 0
      }))
    }

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}