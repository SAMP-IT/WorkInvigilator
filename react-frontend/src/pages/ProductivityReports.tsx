import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProductivityLeaderboard } from '../components/ui/ProductivityLeaderboard';
import { ProductivityTrendChart } from '../components/charts/ProductivityTrendChart';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';
import { supabase } from '../lib/supabase';

interface TrendData {
  date: string;
  dateLabel: string;
  totalHours: number;
  productivityPercentage: number;
  activeEmployees: number;
}

interface Employee {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  productivityPercentage: number;
  totalHours: number;
  productiveHours: number;
  neutralHours: number;
  unproductiveHours: number;
  sessionsCount: number;
  trend?: string;
  percentageAboveAverage?: number;
  percentageBelowAverage?: number;
}

interface DepartmentAverage {
  department: string;
  employeeCount: number;
  avgProductivity: number;
  avgHours: number;
  topPerformer: string;
}

interface ReportsData {
  teamSummary: {
    totalEmployees: number;
    productivityPercentage: number;
    highPerformers: number;
    averagePerformers: number;
    lowPerformers: number;
  };
  topPerformers: Employee[];
  bottomPerformers: Employee[];
  rankings: Employee[];
  dailyTrends: TrendData[];
  departmentAverages?: DepartmentAverage[];
  dataQuality?: {
    note: string;
  };
}

async function fetchReportsData(
  organizationId: string,
  period: string,
  department?: string
): Promise<ReportsData> {
  let url = `/api/productivity-reports?organizationId=${organizationId}&period=${period}`;
  if (department && department !== 'all') {
    url += `&department=${department}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch reports data');
  }

  return response.json();
}

async function fetchDepartments(organizationId: string): Promise<string[]> {
  const response = await fetch(`/api/employees?organizationId=${organizationId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }

  const data = await response.json();
  const depts = Array.from(new Set(
    (data.employees || []).map((emp: any) => emp.department).filter(Boolean)
  )).sort() as string[];

  return depts;
}

export default function ProductivityReports() {
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [period, setPeriod] = useState('week');
  const [department, setDepartment] = useState('all');

  useEffect(() => {
    async function loadOrganization() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
        }
      }
    }
    loadOrganization();
  }, []);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => fetchDepartments(organizationId),
    enabled: !!organizationId,
  });

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ['productivity-reports', organizationId, period, department],
    queryFn: () => fetchReportsData(organizationId, period, department),
    enabled: !!organizationId,
  });

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  const getProductivityColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportCSV = () => {
    if (!reportsData || !reportsData.rankings) return;

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
      ...reportsData.rankings.map((emp) => [
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Productivity Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              Detailed productivity analysis, rankings, and team comparison
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={exportCSV} disabled={isLoading || !reportsData}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Time Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to load reports data. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="py-8">
                  <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !reportsData ? (
          <Card className="bg-white">
            <CardContent className="py-8 text-center text-gray-600">
              No reports data available
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Team Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Team Avg Productivity</div>
                  <div className={`text-3xl font-bold mt-1 ${getProductivityColor(reportsData.teamSummary.productivityPercentage)}`}>
                    {reportsData.teamSummary.productivityPercentage}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {reportsData.teamSummary.totalEmployees} employees
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">High Performers</div>
                  <div className="text-3xl font-bold text-green-600 mt-1">
                    {reportsData.teamSummary.highPerformers}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Greater than or equal to 75% productivity</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Average Performers</div>
                  <div className="text-3xl font-bold text-yellow-600 mt-1">
                    {reportsData.teamSummary.averagePerformers}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">50-74% productivity</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Needs Support</div>
                  <div className="text-3xl font-bold text-red-600 mt-1">
                    {reportsData.teamSummary.lowPerformers}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Less than 50% productivity</div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboards */}
            <ProductivityLeaderboard
              topPerformers={reportsData.topPerformers}
              bottomPerformers={reportsData.bottomPerformers}
              teamAverage={reportsData.teamSummary.productivityPercentage}
              onEmployeeClick={(employeeId) => navigate(`/employees?id=${employeeId}`)}
            />

            {/* Productivity Trend */}
            <Card className="bg-white">
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
              <Card className="bg-white">
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
                      {reportsData.departmentAverages.map((dept, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <span className="font-medium text-gray-900">{dept.department}</span>
                          </TableCell>
                          <TableCell>{dept.employeeCount}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${getProductivityColor(dept.avgProductivity)}`}>
                              {dept.avgProductivity}%
                            </span>
                          </TableCell>
                          <TableCell>{dept.avgHours}h</TableCell>
                          <TableCell>
                            <span className="text-gray-700">{dept.topPerformer}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Full Rankings */}
            <Card className="bg-white">
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
                    {reportsData.rankings.map((emp) => (
                      <TableRow
                        key={emp.employeeId}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/employees?id=${emp.employeeId}`)}
                      >
                        <TableCell>
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm text-gray-900">
                            {emp.rank}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">{emp.employeeName}</span>
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
                          <span className="font-mono text-gray-700">{emp.totalHours}h</span>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Data Source
                    </p>
                    <p className="text-sm text-blue-800">
                      {reportsData.dataQuality.note}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
