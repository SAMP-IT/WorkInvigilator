"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiTile } from "@/components/ui/KpiTile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KpiIcon } from "@/components/ui/KpiIcon";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Profile } from "@/lib/supabase";

interface EmployeeWithMetrics {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  productivity7d: number;
  avgBreakHDay: number;
  avgSessionMin: number;
  lastActive: string;
  status: 'online' | 'offline';
  createdAt: string;
}

interface Screenshot {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  url: string;
  size: string;
  application: string;
  filename: string;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithMetrics[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithMetrics | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      loadData();
    }
  }, [profile, searchParams]);

  async function loadData() {
    setLoading(true);
    try {
      console.log('🔄 Starting to load dashboard data...');

      if (!profile?.organization_id) {
        console.error('No organization ID found');
        setLoading(false);
        return;
      }

      // Get period from URL params or default to today
      const period = searchParams?.get('period') || 'today';

      // Load dashboard metrics filtered by organization
      const dashboardResponse = await fetch(`/api/dashboard?period=${period}&organizationId=${profile.organization_id}`);
      console.log('📡 Dashboard API response status:', dashboardResponse.status);

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('✅ Dashboard data loaded:', dashboardData);

        // Set screenshots from dashboard data
        const screenshots = dashboardData.recentScreenshots || [];
        console.log('📸 Setting screenshots:', screenshots.length);
        setScreenshots(screenshots);

        // Create employees array from dashboard data for compatibility
        const employeesFromDashboard = dashboardData.topPerformers?.map((performer: { employeeId: string; name: string; email: string; productivity: number; breakHours?: number; workHours: number }) => ({
          id: performer.employeeId,
          name: performer.name,
          email: performer.email,
          productivity7d: performer.productivity,
          avgBreakHDay: performer.breakHours || 0,
          avgSessionMin: Math.round(performer.workHours * 60),
          status: 'offline' as const // Will be updated by separate call if needed
        })) || [];

        console.log('👥 Setting employees:', employeesFromDashboard.length);
        setEmployees(employeesFromDashboard);
      } else {
        console.error('❌ Failed to load dashboard data:', dashboardResponse.status);

        // Fallback to individual API calls
        await loadDataFallback();
      }
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      // Fallback to individual API calls
      await loadDataFallback();
    } finally {
      console.log('✅ Loading complete, setting loading to false');
      setLoading(false);
    }
  }

  async function loadDataFallback() {
    try {
      // Load employees with metrics (fallback)
      const employeesResponse = await fetch('/api/employees');
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log('Employees loaded (fallback):', employeesData); // Debug log
        setEmployees(employeesData.employees || []);
      } else {
        console.error('Failed to load employees:', employeesResponse.status);
      }

      // Load recent screenshots (fallback)
      const screenshotsResponse = await fetch('/api/screenshots?limit=4');
      if (screenshotsResponse.ok) {
        const screenshotsData = await screenshotsResponse.json();
        console.log('Screenshots loaded (fallback):', screenshotsData); // Debug log
        setScreenshots(screenshotsData.screenshots || []);
      } else {
        console.error('Failed to load screenshots:', screenshotsResponse.status);
      }
    } catch (error) {
      console.error("Error in fallback data loading:", error);
    }
  }

  const openEmployeeModal = (employee: EmployeeWithMetrics) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
              Overview
            </h1>
            <p className="font-ui text-sm text-ink-muted">
              Monitor ongoing activity and team performance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">Live Data</Badge>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiTile
            icon={<KpiIcon src="/sessions.png" alt="Active Sessions" />}
            label="Active Sessions"
            value={employees.filter(emp => emp.status === 'online').length}
            delta={{ value: 8.2, direction: "up" }}
            onClick={() => router.push("/sessions")}
          />
          <KpiTile
            icon={<KpiIcon src="/employees.png" alt="Active Employees" />}
            label="Active Employees"
            value={employees.length}
            delta={{ value: 2.1, direction: "up" }}
            onClick={() => router.push("/employees")}
          />
          <KpiTile
            icon={<KpiIcon src="/productivity.png" alt="Productivity" />}
            label="Productivity %"
            value={employees.length > 0 ?
              `${(employees.reduce((sum, emp) => sum + emp.productivity7d, 0) / employees.length).toFixed(1)}%` :
              "0%"}
            delta={{ value: 3.2, direction: "up" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/focus.png" alt="Break Time" />}
            label="Avg Break Time"
            value={employees.length > 0 ?
              `${(employees.reduce((sum, emp) => sum + emp.avgBreakHDay, 0) / employees.length).toFixed(1)}h` :
              "0h"}
            delta={{ value: 1.5, direction: "up" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/sessions.png" alt="Average Session" />}
            label="Avg Session"
            value={employees.length > 0 ?
              `${Math.round(employees.reduce((sum, emp) => sum + emp.avgSessionMin, 0) / employees.length)}min` :
              "0min"}
            delta={{ value: 0, direction: "flat" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/screenshots.png" alt="Screenshots" />}
            label="Screenshots Today"
            value={screenshots.length}
            delta={{ value: 12.3, direction: "up" }}
            onClick={() => router.push("/screenshots")}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Live Sessions */}
          <Card hover>
            <CardHeader>
              <CardTitle>Live Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-raised rounded-lg animate-pulse"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                          <div className="h-3 bg-gray-300 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                  ))
                ) : employees.length > 0 ? (
                  employees.slice(0, 4).map((employee, i) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 bg-raised rounded-lg"
                    >
                      <div
                        className="flex items-center space-x-3 cursor-pointer flex-1"
                        onClick={() => openEmployeeModal(employee)}
                      >
                        <div className={`w-2 h-2 rounded-full ${employee.status === 'online' ? 'bg-success animate-pulse' : 'bg-gray-400'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-ink-hi hover:text-primary transition-colors">
                            {employee.name || employee.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-ink-muted">
                            Session: {employee.avgSessionMin}min
                          </p>
                        </div>
                      </div>
                      <Badge
                        size="sm"
                        variant="primary"
                        className="cursor-pointer"
                        onClick={() => openEmployeeModal(employee)}
                      >
                        View
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-ink-muted">
                    <p className="text-sm">No active sessions</p>
                  </div>
                )}
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
                {employees.length > 0 ? (
                  employees
                    .sort((a, b) => b.productivity7d - a.productivity7d)
                    .slice(0, 4)
                    .map((employee, i) => {
                      const change = employee.productivity7d - 75; // Mock baseline of 75%
                      const direction = change >= 0 ? "up" : "down";
                      return (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-2"
                        >
                          <span className="text-sm text-ink-hi">{employee.name || employee.email.split("@")[0]}</span>
                          <div
                            className={`text-sm font-medium ${
                              direction === "up" ? "text-success" : "text-danger"
                            }`}
                          >
                            {direction === "up" ? "↗" : "↘"} {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-4 text-ink-muted">
                    <p className="text-sm">No employee data available</p>
                  </div>
                )}
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
                {screenshots.length > 0 ? (
                  screenshots.slice(0, 4).map((screenshot, i) => (
                    <div
                      key={screenshot.id}
                      className="aspect-video bg-raised rounded border border-line flex items-center justify-center overflow-hidden"
                    >
                      {screenshot.url ? (
                        <img
                          src={screenshot.url}
                          alt={`Screenshot by ${screenshot.employeeName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-ink-muted">
                          <div className="text-lg">📸</div>
                          <p className="text-xs">{screenshot.employeeName}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-video bg-raised rounded border border-line flex items-center justify-center"
                    >
                      <div className="text-center text-ink-muted">
                        <div className="text-lg">📸</div>
                        <p className="text-xs">No Screenshot</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 text-center">
                <Badge
                  variant="outline"
                  size="sm"
                  className="cursor-pointer hover:bg-primary hover:text-white"
                  onClick={() => router.push("/screenshots")}
                >
                  View All ({screenshots.length})
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {selectedEmployee && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-ink-hi">
                Employee Details
              </h2>
              <button
                onClick={closeModal}
                className="text-ink-muted hover:text-ink-hi"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-ink-hi mb-2">
                  {selectedEmployee.name || selectedEmployee.email.split("@")[0]}
                </h3>
                <p className="text-sm text-ink-muted">
                  {selectedEmployee.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-raised p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-ink-mid mb-2">
                    Session Time
                  </h4>
                  <p className="text-lg font-semibold text-ink-hi">2h 45m</p>
                </div>
                <div className="bg-raised p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-ink-mid mb-2">
                    Status
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm text-ink-hi">Active</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-ink-mid mb-3">
                  Live Actions
                </h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-success text-white rounded-lg hover:bg-success/80 transition-colors font-medium">
                    🔴 Listen to Live Audio
                  </button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Go to Audio and Select the
                      Employee to listen to past audios
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() =>
                        router.push(`/audio?employee=${selectedEmployee.id}`)
                      }
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                    >
                      🎧 Past Audios
                    </button>
                    <button
                      onClick={() =>
                        router.push(
                          `/screenshots?employee=${selectedEmployee.id}`
                        )
                      }
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      📸 Screenshots
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-raised p-4 rounded-lg">
                <h4 className="text-sm font-medium text-ink-mid mb-2">
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Last Screenshot</span>
                    <span className="text-ink-hi">2 minutes ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Last Audio Recording</span>
                    <span className="text-ink-hi">5 minutes ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Session Started</span>
                    <span className="text-ink-hi">2h 45m ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
