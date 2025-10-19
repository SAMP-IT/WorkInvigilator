'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProductivityLeaderboard } from '@/components/ui/ProductivityLeaderboard';
import { ProductivityTrendChart } from '@/components/charts/ProductivityTrendChart';
import { useAuth } from '@/lib/auth-context';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';

export default function ProductivityReportsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.organization_id) {
      loadReportsData();
      loadDepartments();
    }
  }, [profile, period, department]);

  const loadDepartments = async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (response.ok) {
        const data = await response.json();
        const depts = Array.from(new Set(
          (data.employees || []).map((emp: any) => emp.department).filter(Boolean)
        )).sort() as string[];
        setDepartments(depts);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReportsData = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      let url = `/api/productivity-reports?organizationId=${profile.organization_id}&period=${period}`;
      if (department !== 'all') {
        url += `&department=${department}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportsData(data);
      }
    } catch (error) {
      console.error('Failed to load reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  const getProductivityColor = (percentage: number) => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 50) return 'text-warn';
    return 'text-danger';
  };

  const exportCSV = () => {
    if (!reportsData || !reportsData.employees) return;

    const headers = [
      'Rank',
      'Name',
      'Department',
      'Productivity %',
      'Total Hours',
      'Productive Hours',
      'Neutral Hours',
      'Unproductive Hours',
      'Sessions'
    ];

    const csvRows = [
      headers.join(','),
      ...reportsData.rankings.map((emp: any) => [
        emp.rank,
        `"${emp.employeeName}"`,
        `"${emp.department}"`,
        emp.productivityPercentage,
        emp.totalHours,
        emp.productiveHours,
        emp.neutralHours,
        emp.unproductiveHours,
        emp.sessionsCount
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Productivity Reports</h1>
            <p className="text-ink-muted">
              Detailed productivity analysis, rankings, and team comparison
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={exportCSV} disabled={loading || !reportsData}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">Time Period</label>
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
                <label className="block text-sm font-medium text-ink-hi mb-2">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-8">
                  <div className="h-48 bg-gray-300 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !reportsData ? (
          <Card>
            <CardContent className="py-8 text-center text-ink-muted">
              No reports data available
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Team Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Team Avg Productivity</div>
                  <div className={`text-3xl font-bold ${getProductivityColor(reportsData.teamSummary.productivityPercentage)}`}>
                    {reportsData.teamSummary.productivityPercentage}%
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    {reportsData.teamSummary.totalEmployees} employees
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">High Performers</div>
                  <div className="text-3xl font-bold text-success">
                    {reportsData.teamSummary.highPerformers}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">≥75% productivity</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Average Performers</div>
                  <div className="text-3xl font-bold text-warn">
                    {reportsData.teamSummary.averagePerformers}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">50-74% productivity</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Needs Support</div>
                  <div className="text-3xl font-bold text-danger">
                    {reportsData.teamSummary.lowPerformers}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">&lt;50% productivity</div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboards */}
            <ProductivityLeaderboard
              topPerformers={reportsData.topPerformers}
              bottomPerformers={reportsData.bottomPerformers}
              teamAverage={reportsData.teamSummary.productivityPercentage}
              onEmployeeClick={(employeeId) => router.push(`/employees?id=${employeeId}`)}
            />

            {/* Productivity Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity Trend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductivityTrendChart
                  data={reportsData.dailyTrends}
                  type="line"
                  showActiveEmployees={true}
                />
              </CardContent>
            </Card>

            {/* Department Comparison */}
            {reportsData.departmentAverages && reportsData.departmentAverages.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Department Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead>Avg Productivity</TableHead>
                        <TableHead>Avg Hours</TableHead>
                        <TableHead>Top Performer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportsData.departmentAverages.map((dept: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <span className="font-medium text-ink-hi">{dept.department}</span>
                          </TableCell>
                          <TableCell>{dept.employeeCount}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${getProductivityColor(dept.avgProductivity)}`}>
                              {dept.avgProductivity}%
                            </span>
                          </TableCell>
                          <TableCell>{dept.avgHours}h</TableCell>
                          <TableCell>
                            <span className="text-ink-mid">{dept.topPerformer}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Full Rankings */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Productivity %</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsData.rankings.map((emp: any) => (
                      <TableRow
                        key={emp.employeeId}
                        className="cursor-pointer hover:bg-raised"
                        onClick={() => router.push(`/employees?id=${emp.employeeId}`)}
                      >
                        <TableCell>
                          <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center font-bold text-sm">
                            {emp.rank}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-ink-hi">{emp.employeeName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" size="sm">{emp.department}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xl font-bold ${getProductivityColor(emp.productivityPercentage)}`}>
                            {emp.productivityPercentage}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-ink-mid">{emp.totalHours}h</span>
                        </TableCell>
                        <TableCell>
                          {emp.trend === 'top' && <Badge variant="success">Top Performer</Badge>}
                          {emp.trend === 'bottom' && <Badge variant="warning">Needs Support</Badge>}
                          {emp.trend === 'middle' && <Badge variant="outline">Average</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Data Quality Note */}
            {reportsData.dataQuality && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Data Source
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {reportsData.dataQuality.note}
                    </p>
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
