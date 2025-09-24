"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiTile } from "@/components/ui/KpiTile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KpiIcon } from "@/components/ui/KpiIcon";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      const { data: employeesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(4);

      setEmployees(employeesData || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  }

  const openEmployeeModal = (employee: Profile) => {
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
            value={12}
            delta={{ value: 8.2, direction: "up" }}
            onClick={() => router.push("/sessions")}
          />
          <KpiTile
            icon={<KpiIcon src="/employees.png" alt="Active Employees" />}
            label="Active Employees"
            value={34}
            delta={{ value: 2.1, direction: "up" }}
            onClick={() => router.push("/employees")}
          />
          <KpiTile
            icon={<KpiIcon src="/productivity.png" alt="Productivity" />}
            label="Productivity %"
            value="87.4%"
            delta={{ value: 3.2, direction: "up" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/focus.png" alt="Focus Time" />}
            label="Avg Focus Time"
            value="6.2h"
            delta={{ value: 1.5, direction: "down" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/sessions.png" alt="Average Session" />}
            label="Avg Session"
            value="142min"
            delta={{ value: 0, direction: "flat" }}
            onClick={() => router.push("/reports")}
          />
          <KpiTile
            icon={<KpiIcon src="/screenshots.png" alt="Screenshots" />}
            label="Screenshots Today"
            value={1247}
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
                  employees.map((employee, i) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 bg-raised rounded-lg"
                    >
                      <div
                        className="flex items-center space-x-3 cursor-pointer flex-1"
                        onClick={() => openEmployeeModal(employee)}
                      >
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-sm font-medium text-ink-hi hover:text-primary transition-colors">
                            {employee.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-ink-muted">
                            Session: {45 + i * 12}min
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
                {[
                  {
                    name: "Sarah Chen",
                    change: "+23%",
                    direction: "up" as const,
                  },
                  {
                    name: "Mike Johnson",
                    change: "+18%",
                    direction: "up" as const,
                  },
                  {
                    name: "Lisa Wang",
                    change: "-12%",
                    direction: "down" as const,
                  },
                  {
                    name: "David Kim",
                    change: "-8%",
                    direction: "down" as const,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2"
                  >
                    <span className="text-sm text-ink-hi">{item.name}</span>
                    <div
                      className={`text-sm font-medium ${
                        item.direction === "up" ? "text-success" : "text-danger"
                      }`}
                    >
                      {item.direction === "up" ? "↗" : "↘"} {item.change}
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
                  <div
                    key={i}
                    className="aspect-video bg-raised rounded border border-line flex items-center justify-center"
                  >
                    <div className="text-center text-ink-muted">
                      <div className="text-lg">📸</div>
                      <p className="text-xs">Screenshot {i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Badge
                  variant="outline"
                  size="sm"
                  className="cursor-pointer hover:bg-primary hover:text-white"
                  onClick={() => router.push("/screenshots")}
                >
                  View All (247)
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
                  {selectedEmployee.email.split("@")[0]}
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
