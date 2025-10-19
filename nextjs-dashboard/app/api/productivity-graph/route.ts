import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId')
    const period = searchParams.get('period') || 'today' // today, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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
          dateStart.setHours(0, 0, 0, 0)
      }
    }

    // For now, estimate productivity based on available data (screenshots, sessions, breaks)
    // Later this will be replaced with actual activity_logs data when desktop app tracking is implemented

    // Get sessions for the period
    let sessionsQuery = supabaseAdmin
      .from('recording_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('session_start_time', dateStart.toISOString())
      .lte('session_start_time', dateEnd.toISOString())

    if (employeeId) {
      sessionsQuery = sessionsQuery.eq('user_id', employeeId)
    }

    const { data: sessions } = await sessionsQuery

    // Get screenshots for the period
    let screenshotsQuery = supabaseAdmin
      .from('screenshots')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', dateStart.toISOString())
      .lte('created_at', dateEnd.toISOString())

    if (employeeId) {
      screenshotsQuery = screenshotsQuery.eq('user_id', employeeId)
    }

    const { data: screenshots } = await screenshotsQuery

    // Get breaks for the period
    let breaksQuery = supabaseAdmin
      .from('break_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('break_start_time', dateStart.toISOString())
      .lte('break_start_time', dateEnd.toISOString())

    if (employeeId) {
      breaksQuery = breaksQuery.eq('user_id', employeeId)
    }

    const { data: breaks } = await breaksQuery

    // Get mute events for the period
    let muteQuery = supabaseAdmin
      .from('mute_events')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('mute_start_time', dateStart.toISOString())
      .lte('mute_start_time', dateEnd.toISOString())

    if (employeeId) {
      muteQuery = muteQuery.eq('user_id', employeeId)
    }

    const { data: muteEvents } = await muteQuery

    // Get activity logs if they exist (for future use)
    let activityQuery = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('logged_at', dateStart.toISOString())
      .lte('logged_at', dateEnd.toISOString())

    if (employeeId) {
      activityQuery = activityQuery.eq('user_id', employeeId)
    }

    const { data: activityLogs } = await activityQuery

    // Calculate productivity distribution
    let productiveSeconds = 0
    let neutralSeconds = 0
    let unproductiveSeconds = 0

    if (activityLogs && activityLogs.length > 0) {
      // Use actual activity logs when available
      // Sort by timestamp
      const sortedLogs = [...activityLogs].sort((a: any, b: any) =>
        new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
      )

      // Calculate duration between consecutive logs (assuming 10-second tracking interval)
      for (let i = 0; i < sortedLogs.length; i++) {
        const log: any = sortedLogs[i]
        const nextLog: any = sortedLogs[i + 1]

        // Calculate duration to next log (or default to 10 seconds for last log)
        let duration = 10
        if (nextLog) {
          const timeDiff = (new Date(nextLog.logged_at).getTime() - new Date(log.logged_at).getTime()) / 1000
          // Cap at 60 seconds to avoid huge gaps counting as activity
          duration = Math.min(timeDiff, 60)
        }

        // Add to appropriate category based on productivity score
        if (log.productivity_score >= 70) {
          productiveSeconds += duration
        } else if (log.productivity_score >= 40) {
          neutralSeconds += duration
        } else {
          unproductiveSeconds += duration
        }
      }
    } else {
      // Estimate based on available data
      // This is a simplified estimation algorithm

      // Calculate total work time from sessions
      const totalSessionSeconds = sessions?.reduce((sum, s) => {
        return sum + (s.total_duration_seconds || 0)
      }, 0) || 0

      // Calculate total break time
      const totalBreakSeconds = breaks?.reduce((sum, b) => {
        return sum + ((b.break_duration_ms || 0) / 1000)
      }, 0) || 0

      // Calculate mute time (considered less productive)
      const totalMuteSeconds = muteEvents?.reduce((sum, m) => {
        return sum + (m.duration_seconds || 0)
      }, 0) || 0

      // Estimate based on screenshot frequency
      // More screenshots = more activity = more productive
      const screenshotCount = screenshots?.length || 0
      const avgScreenshotInterval = totalSessionSeconds > 0 ? totalSessionSeconds / Math.max(screenshotCount, 1) : 0

      // Heuristic: If screenshots taken every 2-5 minutes, consider productive
      // If 5-10 minutes, neutral. If >10 minutes, unproductive or idle

      if (totalSessionSeconds > 0) {
        if (avgScreenshotInterval > 0 && avgScreenshotInterval <= 300) { // 0-5 min
          // High activity - mostly productive
          productiveSeconds = Math.floor(totalSessionSeconds * 0.70)
          neutralSeconds = Math.floor(totalSessionSeconds * 0.25)
          unproductiveSeconds = totalSessionSeconds - productiveSeconds - neutralSeconds
        } else if (avgScreenshotInterval <= 600) { // 5-10 min
          // Medium activity - balanced
          productiveSeconds = Math.floor(totalSessionSeconds * 0.50)
          neutralSeconds = Math.floor(totalSessionSeconds * 0.35)
          unproductiveSeconds = totalSessionSeconds - productiveSeconds - neutralSeconds
        } else {
          // Low activity - less productive
          productiveSeconds = Math.floor(totalSessionSeconds * 0.35)
          neutralSeconds = Math.floor(totalSessionSeconds * 0.30)
          unproductiveSeconds = totalSessionSeconds - productiveSeconds - neutralSeconds
        }

        // Adjust for mute time (reduce productive time)
        if (totalMuteSeconds > 0) {
          const muteRatio = Math.min(totalMuteSeconds / totalSessionSeconds, 0.5)
          const reduction = Math.floor(productiveSeconds * muteRatio)
          productiveSeconds -= reduction
          unproductiveSeconds += reduction
        }
      }
    }

    // Calculate totals
    const totalSeconds = productiveSeconds + neutralSeconds + unproductiveSeconds
    const totalHours = totalSeconds / 3600

    // Calculate percentages
    const productivePercentage = totalSeconds > 0 ? (productiveSeconds / totalSeconds) * 100 : 0
    const neutralPercentage = totalSeconds > 0 ? (neutralSeconds / totalSeconds) * 100 : 0
    const unproductivePercentage = totalSeconds > 0 ? (unproductiveSeconds / totalSeconds) * 100 : 0

    // Get top apps/domains if activity logs exist
    const topActivities: any[] = []
    if (activityLogs && activityLogs.length > 0) {
      // Group by app/domain
      const activityMap = new Map<string, { name: string; category: string; seconds: number }>()

      // Sort logs first
      const sortedLogs = [...activityLogs].sort((a: any, b: any) =>
        new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
      )

      sortedLogs.forEach((log: any, index: number) => {
        const key = log.app_name || log.domain || 'Unknown'
        const nextLog: any = sortedLogs[index + 1]

        // Calculate duration to next log
        let duration = 10
        if (nextLog) {
          const timeDiff = (new Date(nextLog.logged_at).getTime() - new Date(log.logged_at).getTime()) / 1000
          duration = Math.min(timeDiff, 60)
        }

        const existing = activityMap.get(key)

        if (existing) {
          existing.seconds += duration
        } else {
          activityMap.set(key, {
            name: key,
            category: log.category || 'uncategorized',
            seconds: duration
          })
        }
      })

      // Sort by time spent and get top 10
      const sorted = Array.from(activityMap.values())
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 10)

      topActivities.push(...sorted.map(item => ({
        name: item.name,
        category: item.category,
        hours: parseFloat((item.seconds / 3600).toFixed(2)),
        percentage: totalSeconds > 0 ? parseFloat(((item.seconds / totalSeconds) * 100).toFixed(1)) : 0
      })))
    }

    // Calculate productivity score (0-100)
    const productivityScore = totalSeconds > 0
      ? parseFloat(((productiveSeconds * 1.0 + neutralSeconds * 0.5 + unproductiveSeconds * 0) / totalSeconds * 100).toFixed(1))
      : 0

    return NextResponse.json({
      period: {
        startDate: dateStart.toISOString(),
        endDate: dateEnd.toISOString(),
        label: period
      },
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalSeconds,
        productivityScore,
        sessionsCount: sessions?.length || 0,
        screenshotsCount: screenshots?.length || 0,
        breaksCount: breaks?.length || 0,
        muteEventsCount: muteEvents?.length || 0
      },
      distribution: {
        productive: {
          seconds: productiveSeconds,
          hours: parseFloat((productiveSeconds / 3600).toFixed(2)),
          percentage: parseFloat(productivePercentage.toFixed(1))
        },
        neutral: {
          seconds: neutralSeconds,
          hours: parseFloat((neutralSeconds / 3600).toFixed(2)),
          percentage: parseFloat(neutralPercentage.toFixed(1))
        },
        unproductive: {
          seconds: unproductiveSeconds,
          hours: parseFloat((unproductiveSeconds / 3600).toFixed(2)),
          percentage: parseFloat(unproductivePercentage.toFixed(1))
        }
      },
      topActivities,
      hasActivityData: activityLogs && activityLogs.length > 0,
      note: activityLogs && activityLogs.length > 0
        ? 'Using actual activity tracking data'
        : 'Using estimated data based on sessions and screenshots. Install desktop app activity tracking for accurate data.'
    })

  } catch (error) {
    console.error('Productivity graph API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch productivity data' },
      { status: 500 }
    )
  }
}
