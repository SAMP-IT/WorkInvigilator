import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProductivityGraph } from '../components/charts/ProductivityGraph';
import { ProductivityBreakdown } from '../components/ui/ProductivityBreakdown';
import { supabase } from '../lib/supabase';

interface ProductivityData {
  summary: {
    totalHours: number;
    productivityScore: number;
    sessionsCount: number;
    screenshotsCount: number;
  };
  distribution: {
    productive: {
      hours: number;
      percentage: number;
    };
    neutral: {
      hours: number;
      percentage: number;
    };
    unproductive: {
      hours: number;
      percentage: number;
    };
  };
  topActivities: Array<{
    name: string;
    category: string;
    hours: number;
    percentage: number;
  }>;
  note?: string;
  hasActivityData?: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

async function fetchProductivityData(
  organizationId: string,
  period: string,
  employeeId?: string
): Promise<ProductivityData> {
  let url = `/api/productivity-graph?organizationId=${organizationId}&period=${period}`;
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

export default function Productivity() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [period, setPeriod] = useState('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

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
    queryKey: ['productivity', organizationId, period, selectedEmployee],
    queryFn: () => fetchProductivityData(organizationId, period, selectedEmployee),
    enabled: !!organizationId,
  });

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Productivity Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">
              Analyze time spent on productive, neutral, and unproductive activities
            </p>
          </div>
          <Badge variant="primary">Beta</Badge>
        </div>

        {/* Filters */}
        <Card className="bg-white">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Time Period
                </label>
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
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to load productivity data. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="bg-white">
                  <CardContent className="py-8">
                    <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !productivityData ? (
          <Card className="bg-white">
            <CardContent className="py-8 text-center text-gray-600">
              No productivity data available
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Total Hours</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {productivityData.summary.totalHours}h
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Productivity Score</div>
                  <div className="text-2xl font-semibold text-blue-600 mt-1">
                    {productivityData.summary.productivityScore}/100
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Sessions</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {productivityData.summary.sessionsCount}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600">Screenshots</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {productivityData.summary.screenshotsCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Productivity Graph */}
              <Card className="bg-white">
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
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Top Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productivityData.topActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              activity.category === 'productive'
                                ? 'bg-green-500'
                                : activity.category === 'neutral'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                            <p className="text-xs text-gray-600 capitalize">{activity.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{activity.hours}h</p>
                          <p className="text-xs text-gray-600">{activity.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Note */}
            {productivityData.note && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Data Source
                    </p>
                    <p className="text-sm text-blue-800">
                      {productivityData.note}
                    </p>
                    {!productivityData.hasActivityData && (
                      <p className="text-xs text-blue-700 mt-2">
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
    </div>
  );
}
