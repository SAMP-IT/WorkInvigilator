'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProductivityGraph } from '@/components/charts/ProductivityGraph';
import { ProductivityBreakdown } from '@/components/ui/ProductivityBreakdown';
import { useAuth } from '@/lib/auth-context';

export default function ProductivityPage() {
  const { profile } = useAuth();
  const [productivityData, setProductivityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.organization_id) {
      loadProductivityData();
      loadEmployees();
    }
  }, [profile, period, selectedEmployee]);

  const loadEmployees = async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadProductivityData = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      let url = `/api/productivity-graph?organizationId=${profile.organization_id}&period=${period}`;
      if (selectedEmployee !== 'all') {
        url += `&employeeId=${selectedEmployee}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProductivityData(data);
      }
    } catch (error) {
      console.error('Failed to load productivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Productivity Analytics</h1>
            <p className="text-ink-muted">
              Analyze time spent on productive, neutral, and unproductive activities
            </p>
          </div>
          <Badge variant="primary">Beta</Badge>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Time Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-8">
                    <div className="h-64 bg-gray-300 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !productivityData ? (
          <Card>
            <CardContent className="py-8 text-center text-ink-muted">
              No productivity data available
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Total Hours</div>
                  <div className="text-2xl font-semibold text-ink-hi">
                    {productivityData.summary.totalHours}h
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Productivity Score</div>
                  <div className="text-2xl font-semibold text-primary">
                    {productivityData.summary.productivityScore}/100
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Sessions</div>
                  <div className="text-2xl font-semibold text-ink-hi">
                    {productivityData.summary.sessionsCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Screenshots</div>
                  <div className="text-2xl font-semibold text-ink-hi">
                    {productivityData.summary.screenshotsCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Productivity Graph */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductivityGraph
                    data={productivityData.distribution}
                    showLegend={true}
                    size="md"
                  />
                </CardContent>
              </Card>

              {/* Breakdown Cards */}
              <div>
                <ProductivityBreakdown
                  productive={productivityData.distribution.productive}
                  neutral={productivityData.distribution.neutral}
                  unproductive={productivityData.distribution.unproductive}
                  productivityScore={productivityData.summary.productivityScore}
                />
              </div>
            </div>

            {/* Top Activities */}
            {productivityData.topActivities && productivityData.topActivities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productivityData.topActivities.map((activity: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-raised rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              activity.category === 'productive'
                                ? 'bg-success'
                                : activity.category === 'neutral'
                                ? 'bg-warn'
                                : 'bg-danger'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink-hi">{activity.name}</p>
                            <p className="text-xs text-ink-muted capitalize">{activity.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-ink-hi">{activity.hours}h</p>
                          <p className="text-xs text-ink-muted">{activity.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Note */}
            {productivityData.note && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Data Source
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {productivityData.note}
                    </p>
                    {!productivityData.hasActivityData && (
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                        For accurate tracking, install the desktop app with activity monitoring enabled.
                        This will track actual application usage and website visits.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
