'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiTile } from '@/components/ui/KpiTile';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiIcon } from '@/components/ui/KpiIcon';

export default function HomePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">Overview</h1>
            <p className="font-ui text-sm text-ink-muted">Monitor ongoing activity and team performance</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">
              Live Data
            </Badge>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiTile
            icon={<KpiIcon src="/sessions.png" alt="Active Sessions" />}
            label="Active Sessions"
            value={12}
            delta={{ value: 8.2, direction: 'up' }}
          />
          <KpiTile
            icon={<KpiIcon src="/employees.png" alt="Active Employees" />}
            label="Active Employees"
            value={34}
            delta={{ value: 2.1, direction: 'up' }}
          />
          <KpiTile
            icon={<KpiIcon src="/productivity.png" alt="Productivity" />}
            label="Productivity %"
            value="87.4%"
            delta={{ value: 3.2, direction: 'up' }}
          />
          <KpiTile
            icon={<KpiIcon src="/focus.png" alt="Focus Time" />}
            label="Avg Focus Time"
            value="6.2h"
            delta={{ value: 1.5, direction: 'down' }}
          />
          <KpiTile
            icon={<KpiIcon src="/sessions.png" alt="Average Session" />}
            label="Avg Session"
            value="142min"
            delta={{ value: 0, direction: 'flat' }}
          />
          <KpiTile
            icon={<KpiIcon src="/screenshots.png" alt="Screenshots" />}
            label="Screenshots Today"
            value={1247}
            delta={{ value: 12.3, direction: 'up' }}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Focus vs Idle Chart */}
          <Card className="xl:col-span-2" hover>
            <CardHeader>
              <CardTitle>Focus vs Idle Time (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-raised rounded-lg flex items-center justify-center">
                <div className="text-center text-ink-muted">
                  <div className="text-4xl mb-2">📈</div>
                  <p>Stacked Area Chart</p>
                  <p className="text-sm">Focus/Idle timeline visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Heatmap */}
          <Card hover>
            <CardHeader>
              <CardTitle>Team Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-raised rounded-lg flex items-center justify-center">
                <div className="text-center text-ink-muted">
                  <div className="text-4xl mb-2">🔥</div>
                  <p>7×24 Heatmap</p>
                  <p className="text-sm">Employee × Hours grid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Sessions */}
          <Card hover>
            <CardHeader>
              <CardTitle>Live Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-raised rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm font-medium text-ink-hi">Employee {i + 1}</p>
                        <p className="text-xs text-ink-muted">Session: {45 + i * 12}min</p>
                      </div>
                    </div>
                    <Badge size="sm" variant="primary">
                      View
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Variances */}
          <Card hover>
            <CardHeader>
              <CardTitle>Top Variances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Sarah Chen', change: '+23%', direction: 'up' as const },
                  { name: 'Mike Johnson', change: '+18%', direction: 'up' as const },
                  { name: 'Lisa Wang', change: '-12%', direction: 'down' as const },
                  { name: 'David Kim', change: '-8%', direction: 'down' as const }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2">
                    <span className="text-sm text-ink-hi">{item.name}</span>
                    <div className={`text-sm font-medium ${
                      item.direction === 'up' ? 'text-success' : 'text-danger'
                    }`}>
                      {item.direction === 'up' ? '↗' : '↘'} {item.change}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Screenshots */}
          <Card hover>
            <CardHeader>
              <CardTitle>Recent Screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-video bg-raised rounded border border-line flex items-center justify-center">
                    <div className="text-center text-ink-muted">
                      <div className="text-lg">📸</div>
                      <p className="text-xs">Screenshot {i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Badge variant="outline" size="sm">
                  View All (247)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}