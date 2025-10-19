import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Build query for activity logs
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('start_time', start + 'T00:00:00Z')
      .lte('start_time', end + 'T23:59:59Z')
      .not('duration_seconds', 'is', null)

    if (employeeId) {
      query = query.eq('user_id', employeeId)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch productivity data' },
        { status: 500 }
      )
    }

    // Calculate totals by category
    const productiveTime = activities
      ?.filter(a => a.category === 'productive')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const neutralTime = activities
      ?.filter(a => a.category === 'neutral')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const unproductiveTime = activities
      ?.filter(a => a.category === 'unproductive')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const uncategorizedTime = activities
      ?.filter(a => a.category === 'uncategorized')
      .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0

    const totalTime = productiveTime + neutralTime + unproductiveTime + uncategorizedTime

    // Calculate percentages
    const productivePercentage = totalTime > 0 ? (productiveTime / totalTime) * 100 : 0
    const neutralPercentage = totalTime > 0 ? (neutralTime / totalTime) * 100 : 0
    const unproductivePercentage = totalTime > 0 ? (unproductiveTime / totalTime) * 100 : 0
    const uncategorizedPercentage = totalTime > 0 ? (uncategorizedTime / totalTime) * 100 : 0

    // Calculate productivity score (weighted: productive=100, neutral=50, unproductive=0)
    const productivityScore = totalTime > 0
      ? Math.round(((productiveTime * 100 + neutralTime * 50) / totalTime))
      : 0

    // Group by application
    const appStats: { [key: string]: { time: number; category: string; count: number } } = {}
    activities?.forEach(activity => {
      if (!appStats[activity.app_name]) {
        appStats[activity.app_name] = {
          time: 0,
          category: activity.category || 'uncategorized',
          count: 0
        }
      }
      appStats[activity.app_name].time += activity.duration_seconds || 0
      appStats[activity.app_name].count += 1
    })

    // Convert to array and sort by time
    const topApplications = Object.entries(appStats)
      .map(([name, stats]) => ({
        name,
        timeSeconds: stats.time,
        timeFormatted: formatDuration(stats.time),
        category: stats.category,
        percentage: totalTime > 0 ? ((stats.time / totalTime) * 100).toFixed(1) : '0',
        sessions: stats.count
      }))
      .sort((a, b) => b.timeSeconds - a.timeSeconds)
      .slice(0, 10)

    // Group by day for daily breakdown
    const dailyStats: {
      [key: string]: {
        productive: number
        neutral: number
        unproductive: number
        uncategorized: number
        total: number
      }
    } = {}

    activities?.forEach(activity => {
      const day = activity.start_time.split('T')[0]
      if (!dailyStats[day]) {
        dailyStats[day] = {
          productive: 0,
          neutral: 0,
          unproductive: 0,
          uncategorized: 0,
          total: 0
        }
      }

      const duration = activity.duration_seconds || 0
      dailyStats[day].total += duration

      if (activity.category === 'productive') {
        dailyStats[day].productive += duration
      } else if (activity.category === 'neutral') {
        dailyStats[day].neutral += duration
      } else if (activity.category === 'unproductive') {
        dailyStats[day].unproductive += duration
      } else {
        dailyStats[day].uncategorized += duration
      }
    })

    // Convert to array for charting
    const dailyBreakdown = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        productiveHours: (stats.productive / 3600).toFixed(2),
        neutralHours: (stats.neutral / 3600).toFixed(2),
        unproductiveHours: (stats.unproductive / 3600).toFixed(2),
        uncategorizedHours: (stats.uncategorized / 3600).toFixed(2),
        totalHours: (stats.total / 3600).toFixed(2),
        productivityScore: stats.total > 0
          ? Math.round(((stats.productive * 100 + stats.neutral * 50) / stats.total))
          : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get top productive and unproductive apps
    const productiveApps = topApplications.filter(app => app.category === 'productive').slice(0, 5)
    const unproductiveApps = topApplications.filter(app => app.category === 'unproductive').slice(0, 5)

    return NextResponse.json({
      summary: {
        totalTime: formatDuration(totalTime),
        totalTimeSeconds: totalTime,
        productiveTime: formatDuration(productiveTime),
        productiveTimeSeconds: productiveTime,
        neutralTime: formatDuration(neutralTime),
        neutralTimeSeconds: neutralTime,
        unproductiveTime: formatDuration(unproductiveTime),
        unproductiveTimeSeconds: unproductiveTime,
        uncategorizedTime: formatDuration(uncategorizedTime),
        uncategorizedTimeSeconds: uncategorizedTime,
        productivePercentage: productivePercentage.toFixed(1),
        neutralPercentage: neutralPercentage.toFixed(1),
        unproductivePercentage: unproductivePercentage.toFixed(1),
        uncategorizedPercentage: uncategorizedPercentage.toFixed(1),
        productivityScore
      },
      categoryBreakdown: [
        {
          category: 'Productive',
          time: productiveTime,
          timeFormatted: formatDuration(productiveTime),
          percentage: productivePercentage.toFixed(1),
          color: '#10b981'
        },
        {
          category: 'Neutral',
          time: neutralTime,
          timeFormatted: formatDuration(neutralTime),
          percentage: neutralPercentage.toFixed(1),
          color: '#f59e0b'
        },
        {
          category: 'Unproductive',
          time: unproductiveTime,
          timeFormatted: formatDuration(unproductiveTime),
          percentage: unproductivePercentage.toFixed(1),
          color: '#ef4444'
        },
        {
          category: 'Uncategorized',
          time: uncategorizedTime,
          timeFormatted: formatDuration(uncategorizedTime),
          percentage: uncategorizedPercentage.toFixed(1),
          color: '#9ca3af'
        }
      ],
      topApplications,
      productiveApps,
      unproductiveApps,
      dailyBreakdown,
      period: {
        startDate: start,
        endDate: end
      }
    })

  } catch (error) {
    console.error('Productivity analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
