import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { supabase } from '../lib/supabase';

interface ProductivityData {
  summary: {
    totalTime: string;
    productiveTime: string;
    neutralTime: string;
    unproductiveTime: string;
    uncategorizedTime: string;
    productivePercentage: string;
    neutralPercentage: string;
    unproductivePercentage: string;
    productivityScore: number;
  };
  categoryBreakdown: Array<{
    category: string;
    time: number;
    timeFormatted: string;
    percentage: string;
    color: string;
  }>;
  topApplications: Array<{
    name: string;
    timeFormatted: string;
    category: string;
    percentage: string;
    sessions: number;
  }>;
  productiveApps: Array<{
    name: string;
    timeFormatted: string;
  }>;
  unproductiveApps: Array<{
    name: string;
    timeFormatted: string;
  }>;
  dailyBreakdown: Array<{
    date: string;
    productiveHours: string;
    neutralHours: string;
    unproductiveHours: string;
    totalHours: string;
    productivityScore: number;
  }>;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

async function fetchProductivityData(
  organizationId: string,
  startDate: string,
  endDate: string,
  employeeId?: string
): Promise<ProductivityData> {
  let url = `/api/productivity/analytics?organizationId=${organizationId}&startDate=${startDate}&endDate=${endDate}`;
  if (employeeId && employeeId !== 'all') {
    url += `&employeeId=${employeeId}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch productivity data');
  }

  return response.json();
}

async function fetchEmployees(organizationId: string): Promise<Employee[]> {
  const response = await fetch(`/api/employees?organizationId=${organizationId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }

  const data = await response.json();
  return data.employees || [];
}

export default function ProductivityBreakdownPage() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', organizationId],
    queryFn: () => fetchEmployees(organizationId),
    enabled: !!organizationId,
  });

  const { data: productivityData, isLoading, error } = useQuery({
    queryKey: ['productivity-breakdown', organizationId, startDate, endDate, selectedEmployee],
    queryFn: () => fetchProductivityData(organizationId, startDate, endDate, selectedEmployee),
    enabled: !!organizationId,
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'productive':
        return 'success';
      case 'neutral':
        return 'warning';
      case 'unproductive':
        return 'danger';
      default:
        return 'default';
    }
  };

  const exportToCSV = () => {
    if (!productivityData) return;

    let csvContent = 'Productivity Breakdown Report\n';
    csvContent += `Period:,${startDate} to ${endDate}\n`;
    csvContent += `Employee:,${selectedEmployee === 'all' ? 'All Employees' : employees.find(e => e.id === selectedEmployee)?.name || 'Unknown'}\n`;
    csvContent += `Generated:,${new Date().toLocaleString()}\n\n`;

    csvContent += 'Summary\n';
    csvContent += `Total Time:,${productivityData.summary.totalTime}\n`;
    csvContent += `Productive Time:,${productivityData.summary.productiveTime} (${productivityData.summary.productivePercentage}%)\n`;
    csvContent += `Neutral Time:,${productivityData.summary.neutralTime} (${productivityData.summary.neutralPercentage}%)\n`;
    csvContent += `Unproductive Time:,${productivityData.summary.unproductiveTime} (${productivityData.summary.unproductivePercentage}%)\n`;
    csvContent += `Productivity Score:,${productivityData.summary.productivityScore}/100\n\n`;

    csvContent += 'Top Applications\n';
    csvContent += 'Application,Category,Time,Percentage,Sessions\n';
    productivityData.topApplications.forEach(app => {
      csvContent += `${app.name},${app.category},${app.timeFormatted},${app.percentage}%,${app.sessions}\n`;
    });

    csvContent += '\nDaily Breakdown\n';
    csvContent += 'Date,Productive,Neutral,Unproductive,Total,Score\n';
    productivityData.dailyBreakdown.forEach(day => {
      csvContent += `${day.date},${day.productiveHours}h,${day.neutralHours}h,${day.unproductiveHours}h,${day.totalHours}h,${day.productivityScore}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `productivity_breakdown_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Productivity Breakdown
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Detailed analysis of productive, neutral, and unproductive time
            </p>
          </div>
          <Button onClick={exportToCSV} disabled={!productivityData} variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to load productivity data. Please try again.
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="py-8">
                  <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : productivityData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Total Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">
                    {productivityData.summary.totalTime}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Productive</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-green-600">
                    {productivityData.summary.productivePercentage}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {productivityData.summary.productiveTime}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Neutral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-yellow-600">
                    {productivityData.summary.neutralPercentage}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {productivityData.summary.neutralTime}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Unproductive</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-red-600">
                    {productivityData.summary.unproductivePercentage}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {productivityData.summary.unproductiveTime}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-blue-600">
                    {productivityData.summary.productivityScore}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">out of 100</div>
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart and Top Apps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <svg viewBox="0 0 200 200" className="w-64 h-64">
                      {(() => {
                        let currentAngle = 0;
                        return productivityData.categoryBreakdown.map((item, index) => {
                          const percentage = parseFloat(item.percentage);
                          if (percentage === 0) return null;

                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;

                          const startRad = (startAngle - 90) * (Math.PI / 180);
                          const endRad = (endAngle - 90) * (Math.PI / 180);
                          const x1 = 100 + 80 * Math.cos(startRad);
                          const y1 = 100 + 80 * Math.sin(startRad);
                          const x2 = 100 + 80 * Math.cos(endRad);
                          const y2 = 100 + 80 * Math.sin(endRad);
                          const largeArc = angle > 180 ? 1 : 0;

                          const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

                          currentAngle += angle;

                          return (
                            <path
                              key={index}
                              d={path}
                              fill={item.color}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div className="space-y-2 mt-4">
                    {productivityData.categoryBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-gray-700">{item.category}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-900">
                            {item.timeFormatted}
                          </span>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Productive & Unproductive Apps */}
              <div className="space-y-6">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Top Productive Apps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productivityData.productiveApps.length > 0 ? (
                      <div className="space-y-2">
                        {productivityData.productiveApps.map((app, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                          >
                            <span className="text-sm text-gray-900">{app.name}</span>
                            <span className="text-sm font-medium text-green-600">
                              {app.timeFormatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 text-center py-4">
                        No productive apps tracked
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Top Unproductive Apps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productivityData.unproductiveApps.length > 0 ? (
                      <div className="space-y-2">
                        {productivityData.unproductiveApps.map((app, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                          >
                            <span className="text-sm text-gray-900">{app.name}</span>
                            <span className="text-sm font-medium text-red-600">
                              {app.timeFormatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 text-center py-4">
                        No unproductive apps tracked
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Top Applications Table */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Application Usage Breakdown</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productivityData.topApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-gray-600">
                          No application usage data available for this period.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productivityData.topApplications.map((app, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium text-gray-900">{app.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCategoryColor(app.category) as any} size="sm">
                            {app.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-gray-700">
                            {app.timeFormatted}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{app.percentage}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{app.sessions}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Daily Breakdown */}
            {productivityData.dailyBreakdown.length > 0 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Productive</TableHead>
                      <TableHead>Neutral</TableHead>
                      <TableHead>Unproductive</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productivityData.dailyBreakdown.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium text-gray-900">{day.date}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-green-600">{day.productiveHours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-yellow-600">{day.neutralHours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-red-600">{day.unproductiveHours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-gray-700">{day.totalHours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-blue-600">{day.productivityScore}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    About Productivity Categories
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Productive:</strong> IDEs, Office Suite, Design Tools, Development Apps
                    <br />
                    <strong>Neutral:</strong> Communication (Slack, Email), Meetings (Zoom, Teams)
                    <br />
                    <strong>Unproductive:</strong> Social Media, Entertainment, Shopping
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Card className="bg-white">
            <CardContent className="py-8 text-center text-gray-600">
              No productivity data available for the selected period.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
