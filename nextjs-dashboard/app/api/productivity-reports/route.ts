import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const period = searchParams.get('period') || 'week' // today, week, month, custom
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const departmentFilter = searchParams.get('department')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    let dateStart: Date
    let dateEnd: Date = new Date()

    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateEnd = new Date(endDate)
    } else {
      switch (period) {
        case 'today':
          dateStart = new Date()
          dateStart.setHours(0, 0, 0, 0)
          break
        case 'week':
          dateStart = new Date()
          dateStart.setDate(dateStart.getDate() - 7)
          break
        case 'month':
          dateStart = new Date()
          dateStart.setDate(dateStart.getDate() - 30)
          break
        default:
          dateStart = new Date()
          dateStart.setDate(dateStart.getDate() - 7)
      }
    }

    // Get all employees in organization
    let employeesQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, email, department, role')
      .eq('organization_id', organizationId)
      .in('role', ['user', 'admin'])

    if (departmentFilter && departmentFilter !== 'all') {
      employeesQuery = employeesQuery.eq('department', departmentFilter)
    }

    const { data: employees } = await employeesQuery

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        employees: [],
        summary: {},
        rankings: [],
        dailyTrends: []
      })
    }

    // Get sessions for all employees
    const { data: sessions } = await supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('user_id', employees.map(e => e.id))
      .gte('session_start_time', dateStart.toISOString())
      .lte('session_start_time', dateEnd.toISOString())

    // Get screenshots for activity analysis
    const { data: screenshots } = await supabaseAdmin
      .from('screenshots')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .in('user_id', employees.map(e => e.id))
      .gte('created_at', dateStart.toISOString())
      .lte('created_at', dateEnd.toISOString())

    // Get breaks
    const { data: breaks } = await supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('user_id', employees.map(e => e.id))
      .gte('break_start_time', dateStart.toISOString())
      .lte('break_start_time', dateEnd.toISOString())

    // Get activity logs if available
    const { data: activityLogs } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .in('user_id', employees.map(e => e.id))
      .gte('start_time', dateStart.toISOString())
      .lte('start_time', dateEnd.toISOString())

    // Calculate productivity for each employee
    const employeeMetrics = employees.map(employee => {
      // Get employee's sessions
      const employeeSessions = sessions?.filter(s => s.user_id === employee.id) || []
      const employeeScreenshots = screenshots?.filter(s => s.user_id === employee.id) || []
      const employeeBreaks = breaks?.filter(b => b.user_id === employee.id) || []
      const employeeActivities = activityLogs?.filter(a => a.user_id === employee.id) || []

      // Calculate total time
      const totalSeconds = employeeSessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0)
      const totalHours = totalSeconds / 3600

      // Calculate productivity breakdown
      let productiveSeconds = 0
      let neutralSeconds = 0
      let unproductiveSeconds = 0

      if (employeeActivities.length > 0) {
        // Use actual activity data
        employeeActivities.forEach(log => {
          const duration = log.duration_seconds || 0
          switch (log.category) {
            case 'productive':
              productiveSeconds += duration
              break
            case 'neutral':
              neutralSeconds += duration
              break
            case 'unproductive':
              unproductiveSeconds += duration
              break
          }
        })
      } else {
        // Estimate based on screenshot frequency
        const screenshotCount = employeeScreenshots.length
        const avgInterval = totalSeconds > 0 ? totalSeconds / Math.max(screenshotCount, 1) : 0

        if (totalSeconds > 0) {
          if (avgInterval > 0 && avgInterval <= 300) {
            productiveSeconds = Math.floor(totalSeconds * 0.70)
            neutralSeconds = Math.floor(totalSeconds * 0.25)
            unproductiveSeconds = totalSeconds - productiveSeconds - neutralSeconds
          } else if (avgInterval <= 600) {
            productiveSeconds = Math.floor(totalSeconds * 0.50)
            neutralSeconds = Math.floor(totalSeconds * 0.35)
            unproductiveSeconds = totalSeconds - productiveSeconds - neutralSeconds
          } else {
            productiveSeconds = Math.floor(totalSeconds * 0.35)
            neutralSeconds = Math.floor(totalSeconds * 0.30)
            unproductiveSeconds = totalSeconds - productiveSeconds - neutralSeconds
          }
        }
      }

      // Calculate productivity percentage (DeskTime formula)
      const productivityPercentage = totalSeconds > 0
        ? parseFloat(((productiveSeconds / totalSeconds) * 100).toFixed(1))
        : 0

      // Calculate neutral percentage
      const neutralPercentage = totalSeconds > 0
        ? parseFloat(((neutralSeconds / totalSeconds) * 100).toFixed(1))
        : 0

      // Calculate unproductive percentage
      const unproductivePercentage = totalSeconds > 0
        ? parseFloat(((unproductiveSeconds / totalSeconds) * 100).toFixed(1))
        : 0

      // Calculate productivity score (weighted)
      const productivityScore = totalSeconds > 0
        ? parseFloat(((productiveSeconds * 1.0 + neutralSeconds * 0.5) / totalSeconds * 100).toFixed(1))
        : 0

      return {
        employeeId: employee.id,
        employeeName: employee.name || employee.email.split('@')[0],
        email: employee.email,
        department: employee.department || 'N/A',

        // Time metrics
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalSeconds,

        // Productivity breakdown
        productiveHours: parseFloat((productiveSeconds / 3600).toFixed(2)),
        neutralHours: parseFloat((neutralSeconds / 3600).toFixed(2)),
        unproductiveHours: parseFloat((unproductiveSeconds / 3600).toFixed(2)),

        // Percentages (DeskTime style)
        productivityPercentage, // Key metric: productive time / total time
        neutralPercentage,
        unproductivePercentage,

        // Weighted score
        productivityScore,

        // Activity counts
        sessionsCount: employeeSessions.length,
        screenshotsCount: employeeScreenshots.length,
        breaksCount: employeeBreaks.length,

        // Additional metrics
        avgSessionHours: employeeSessions.length > 0
          ? parseFloat((totalHours / employeeSessions.length).toFixed(2))
          : 0,
        hasActivityData: employeeActivities.length > 0
      }
    })

    // Sort by productivity percentage (DeskTime ranking)
    const rankedEmployees = [...employeeMetrics].sort((a, b) => b.productivityPercentage - a.productivityPercentage)

    // Calculate team averages
    const teamAverage = {
      totalHours: parseFloat((employeeMetrics.reduce((sum, e) => sum + e.totalHours, 0) / employeeMetrics.length).toFixed(2)),
      productivityPercentage: parseFloat((employeeMetrics.reduce((sum, e) => sum + e.productivityPercentage, 0) / employeeMetrics.length).toFixed(1)),
      neutralPercentage: parseFloat((employeeMetrics.reduce((sum, e) => sum + e.neutralPercentage, 0) / employeeMetrics.length).toFixed(1)),
      unproductivePercentage: parseFloat((employeeMetrics.reduce((sum, e) => sum + e.unproductivePercentage, 0) / employeeMetrics.length).toFixed(1)),
      productivityScore: parseFloat((employeeMetrics.reduce((sum, e) => sum + e.productivityScore, 0) / employeeMetrics.length).toFixed(1))
    }

    // Identify top and bottom performers
    const topPerformers = rankedEmployees.slice(0, 5)
    const bottomPerformers = rankedEmployees.slice(-5).reverse()

    // Calculate department averages
    const departmentMap = new Map<string, any[]>()
    employeeMetrics.forEach(emp => {
      if (!departmentMap.has(emp.department)) {
        departmentMap.set(emp.department, [])
      }
      departmentMap.get(emp.department)!.push(emp)
    })

    const departmentAverages = Array.from(departmentMap.entries()).map(([dept, emps]) => ({
      department: dept,
      employeeCount: emps.length,
      avgProductivity: parseFloat((emps.reduce((sum, e) => sum + e.productivityPercentage, 0) / emps.length).toFixed(1)),
      avgHours: parseFloat((emps.reduce((sum, e) => sum + e.totalHours, 0) / emps.length).toFixed(2)),
      topPerformer: emps.sort((a, b) => b.productivityPercentage - a.productivityPercentage)[0]?.employeeName
    })).sort((a, b) => b.avgProductivity - a.avgProductivity)

    // Calculate daily trends
    const dailyTrends: any[] = []
    const dayMs = 24 * 60 * 60 * 1000
    const daysInPeriod = Math.ceil((dateEnd.getTime() - dateStart.getTime()) / dayMs)

    for (let i = 0; i < daysInPeriod; i++) {
      const dayStart = new Date(dateStart.getTime() + i * dayMs)
      const dayEnd = new Date(dayStart.getTime() + dayMs)

      const daySessions = sessions?.filter(s => {
        const sessionDate = new Date(s.session_start_time)
        return sessionDate >= dayStart && sessionDate < dayEnd
      }) || []

      const dayScreenshots = screenshots?.filter(s => {
        const screenshotDate = new Date(s.created_at)
        return screenshotDate >= dayStart && screenshotDate < dayEnd
      }) || []

      const dayTotalSeconds = daySessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0)

      // Estimate productivity for the day
      const dayScreenshotCount = dayScreenshots.length
      const dayAvgInterval = dayTotalSeconds > 0 ? dayTotalSeconds / Math.max(dayScreenshotCount, 1) : 0

      let dayProductiveSeconds = 0
      if (dayTotalSeconds > 0) {
        if (dayAvgInterval > 0 && dayAvgInterval <= 300) {
          dayProductiveSeconds = Math.floor(dayTotalSeconds * 0.70)
        } else if (dayAvgInterval <= 600) {
          dayProductiveSeconds = Math.floor(dayTotalSeconds * 0.50)
        } else {
          dayProductiveSeconds = Math.floor(dayTotalSeconds * 0.35)
        }
      }

      const dayProductivity = dayTotalSeconds > 0
        ? parseFloat(((dayProductiveSeconds / dayTotalSeconds) * 100).toFixed(1))
        : 0

      dailyTrends.push({
        date: dayStart.toISOString().split('T')[0],
        dateLabel: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalHours: parseFloat((dayTotalSeconds / 3600).toFixed(2)),
        productivityPercentage: dayProductivity,
        activeEmployees: new Set(daySessions.map(s => s.user_id)).size,
        sessionsCount: daySessions.length
      })
    }

    return NextResponse.json({
      period: {
        startDate: dateStart.toISOString(),
        endDate: dateEnd.toISOString(),
        label: period,
        daysCount: daysInPeriod
      },

      // All employees with metrics
      employees: rankedEmployees,

      // Rankings (sorted by productivity percentage)
      rankings: rankedEmployees.map((emp, index) => ({
        rank: index + 1,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department,
        productivityPercentage: emp.productivityPercentage,
        totalHours: emp.totalHours,
        trend: index < 5 ? 'top' : index >= rankedEmployees.length - 5 ? 'bottom' : 'middle'
      })),

      // Top and bottom performers
      topPerformers: topPerformers.map((emp, index) => ({
        rank: index + 1,
        ...emp,
        percentageAboveAverage: parseFloat((emp.productivityPercentage - teamAverage.productivityPercentage).toFixed(1))
      })),

      bottomPerformers: bottomPerformers.map((emp, index) => ({
        rank: rankedEmployees.length - index,
        ...emp,
        percentageBelowAverage: parseFloat((teamAverage.productivityPercentage - emp.productivityPercentage).toFixed(1))
      })),

      // Team summary
      teamSummary: {
        totalEmployees: employeeMetrics.length,
        ...teamAverage,
        totalHoursSum: parseFloat(employeeMetrics.reduce((sum, e) => sum + e.totalHours, 0).toFixed(2)),
        highPerformers: rankedEmployees.filter(e => e.productivityPercentage >= 75).length,
        lowPerformers: rankedEmployees.filter(e => e.productivityPercentage < 50).length,
        averagePerformers: rankedEmployees.filter(e => e.productivityPercentage >= 50 && e.productivityPercentage < 75).length
      },

      // Department comparison
      departmentAverages,

      // Daily trends
      dailyTrends,

      // Data quality indicator
      dataQuality: {
        hasActivityLogs: activityLogs && activityLogs.length > 0,
        estimationMode: !activityLogs || activityLogs.length === 0,
        note: activityLogs && activityLogs.length > 0
          ? 'Using actual activity tracking data'
          : 'Using estimated data based on session activity. Install desktop app tracking for accurate metrics.'
      }
    })

  } catch (error) {
    console.error('Productivity reports API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate productivity reports' },
      { status: 500 }
    )
  }
}
