import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month') // Format: YYYY-MM
    const year = searchParams.get('year')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Calculate month range
    let startDate: Date
    let endDate: Date

    if (month) {
      // Use specific month
      startDate = new Date(month + '-01')
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (year) {
      // Use specific year
      startDate = new Date(parseInt(year), 0, 1)
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999)
    } else {
      // Default to current month
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    // Build base query
    let sessionsQuery = supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('session_start_time', startDate.toISOString())
      .lte('session_start_time', endDate.toISOString())

    // Filter by employee if specified
    if (employeeId) {
      sessionsQuery = sessionsQuery.eq('user_id', employeeId)
    }

    const { data: sessions } = await sessionsQuery

    // Get break sessions
    let breaksQuery = supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('break_start_time', startDate.toISOString())
      .lte('break_start_time', endDate.toISOString())

    if (employeeId) {
      breaksQuery = breaksQuery.eq('user_id', employeeId)
    }

    const { data: breaks } = await breaksQuery

    // Get employee profiles for hourly rates
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, hourly_rate')
      .eq('organization_id', organizationId)

    if (employeeId) {
      profilesQuery = profilesQuery.eq('id', employeeId)
    }

    const { data: profiles } = await profilesQuery

    // Create a map for easy lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Group data by employee and date
    const dailyDataMap = new Map<string, Map<string, {
      workSeconds: number
      breakSeconds: number
      sessions: number
    }>>()

    // Process sessions
    sessions?.forEach(session => {
      const sessionDate = new Date(session.session_start_time)
      const dateKey = sessionDate.toISOString().split('T')[0]
      const userId = session.user_id

      if (!dailyDataMap.has(userId)) {
        dailyDataMap.set(userId, new Map())
      }

      const userDailyData = dailyDataMap.get(userId)!
      if (!userDailyData.has(dateKey)) {
        userDailyData.set(dateKey, { workSeconds: 0, breakSeconds: 0, sessions: 0 })
      }

      const dayData = userDailyData.get(dateKey)!

      // Calculate work duration
      let sessionSeconds = 0
      if (session.session_end_time) {
        sessionSeconds = Math.min(session.total_duration_seconds || 0, 86400) // Cap at 24 hours
      } else {
        // Active session - calculate real-time duration
        const startTime = new Date(session.session_start_time).getTime()
        const now = Date.now()
        sessionSeconds = Math.min(Math.floor((now - startTime) / 1000), 86400)
      }

      dayData.workSeconds += sessionSeconds
      dayData.sessions += 1
    })

    // Process breaks
    breaks?.forEach(breakSession => {
      const breakDate = new Date(breakSession.break_start_time)
      const dateKey = breakDate.toISOString().split('T')[0]
      const userId = breakSession.user_id

      if (!dailyDataMap.has(userId)) {
        dailyDataMap.set(userId, new Map())
      }

      const userDailyData = dailyDataMap.get(userId)!
      if (!userDailyData.has(dateKey)) {
        userDailyData.set(dateKey, { workSeconds: 0, breakSeconds: 0, sessions: 0 })
      }

      const dayData = userDailyData.get(dateKey)!

      // Calculate break duration
      if (breakSession.break_end_time) {
        const breakDurationMs = breakSession.break_duration_ms || 0
        const breakSeconds = Math.floor(breakDurationMs / 1000)
        dayData.breakSeconds += Math.min(breakSeconds, 14400) // Cap at 4 hours
      } else {
        // Active break
        const startTime = new Date(breakSession.break_start_time).getTime()
        const now = Date.now()
        const breakSeconds = Math.floor((now - startTime) / 1000)
        dayData.breakSeconds += Math.min(breakSeconds, 14400)
      }
    })

    // Calculate employee summaries
    const employeeSummaries = Array.from(dailyDataMap.entries()).map(([userId, dailyData]) => {
      const profile = profileMap.get(userId)
      const employeeName = profile?.name || profile?.email?.split('@')[0] || 'Unknown'

      let totalWorkSeconds = 0
      let totalBreakSeconds = 0
      let totalSessions = 0
      const dailyBreakdown: any[] = []

      // Calculate daily breakdown and totals
      dailyData.forEach((data, date) => {
        const workHours = data.workSeconds / 3600
        const breakHours = data.breakSeconds / 3600
        const netHours = Math.max(0, workHours - breakHours)

        totalWorkSeconds += data.workSeconds
        totalBreakSeconds += data.breakSeconds
        totalSessions += data.sessions

        dailyBreakdown.push({
          date: new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          workHours: parseFloat(workHours.toFixed(2)),
          breakHours: parseFloat(breakHours.toFixed(2)),
          netHours: parseFloat(netHours.toFixed(2)),
          sessions: data.sessions
        })
      })

      // Sort daily breakdown by date
      dailyBreakdown.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/')
        const [dayB, monthB, yearB] = b.date.split('/')
        return new Date(`${yearA}-${monthA}-${dayA}`).getTime() -
               new Date(`${yearB}-${monthB}-${dayB}`).getTime()
      })

      const totalWorkHours = totalWorkSeconds / 3600
      const totalBreakHours = totalBreakSeconds / 3600
      const totalNetHours = Math.max(0, totalWorkHours - totalBreakHours)

      // Calculate salary if hourly rate is available
      const hourlyRate = profile?.hourly_rate || 0
      const regularHours = Math.min(totalNetHours, 160) // Standard 160 hours/month
      const overtimeHours = Math.max(0, totalNetHours - 160)
      const regularPay = regularHours * hourlyRate
      const overtimePay = overtimeHours * hourlyRate * 1.5 // 1.5x for overtime
      const totalSalary = regularPay + overtimePay

      // Calculate cumulative data for charts
      const cumulativeData: any[] = []
      let cumulativeHours = 0
      dailyBreakdown.forEach(day => {
        cumulativeHours += day.netHours
        cumulativeData.push({
          date: day.date.substring(0, 5), // DD/MM format
          cumulative: parseFloat(cumulativeHours.toFixed(2)),
          daily: day.netHours
        })
      })

      return {
        employeeId: userId,
        employeeName,
        email: profile?.email || '',
        department: profile?.department || 'N/A',
        hourlyRate,
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        totalBreakHours: parseFloat(totalBreakHours.toFixed(2)),
        totalNetHours: parseFloat(totalNetHours.toFixed(2)),
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        totalSessions,
        averageHoursPerDay: dailyBreakdown.length > 0 ?
          parseFloat((totalNetHours / dailyBreakdown.length).toFixed(2)) : 0,
        workingDays: dailyBreakdown.length,
        salary: {
          regularPay: parseFloat(regularPay.toFixed(2)),
          overtimePay: parseFloat(overtimePay.toFixed(2)),
          totalSalary: parseFloat(totalSalary.toFixed(2))
        },
        dailyBreakdown,
        cumulativeData
      }
    })

    // Sort by total hours descending
    employeeSummaries.sort((a, b) => b.totalNetHours - a.totalNetHours)

    // Calculate organization-wide summary
    const organizationSummary = {
      totalEmployees: employeeSummaries.length,
      totalWorkHours: parseFloat(employeeSummaries.reduce((sum, e) => sum + e.totalWorkHours, 0).toFixed(2)),
      totalBreakHours: parseFloat(employeeSummaries.reduce((sum, e) => sum + e.totalBreakHours, 0).toFixed(2)),
      totalNetHours: parseFloat(employeeSummaries.reduce((sum, e) => sum + e.totalNetHours, 0).toFixed(2)),
      totalSalary: parseFloat(employeeSummaries.reduce((sum, e) => sum + e.salary.totalSalary, 0).toFixed(2)),
      totalOvertimeHours: parseFloat(employeeSummaries.reduce((sum, e) => sum + e.overtimeHours, 0).toFixed(2)),
      averageHoursPerEmployee: employeeSummaries.length > 0 ?
        parseFloat((employeeSummaries.reduce((sum, e) => sum + e.totalNetHours, 0) / employeeSummaries.length).toFixed(2)) : 0
    }

    return NextResponse.json({
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        monthName: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      },
      employees: employeeSummaries,
      summary: organizationSummary
    })

  } catch (error) {
    console.error('Monthly hours API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly hours data' },
      { status: 500 }
    )
  }
}
