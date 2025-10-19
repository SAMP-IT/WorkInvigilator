"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

export default function OverviewPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      loadDashboardStats();
    }
  }, [profile]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/realtime?organizationId=${profile?.organization_id}`
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      category: "Time Tracking",
      icon: "⏱️",
      color: "bg-blue-500",
      items: [
        {
          title: "Automatic Time Tracking",
          description: "Desktop app tracks work hours automatically with no manual input",
          route: "/dashboard",
          badge: "Live",
          stats: dashboardStats ? `${dashboardStats.organizationStats.activeNow} active now` : null
        },
        {
          title: "Idle Detection",
          description: "Auto-pause after 3 minutes of inactivity (no mouse/keyboard)",
          route: "/dashboard",
          badge: "3-min threshold",
          stats: dashboardStats ? `${dashboardStats.organizationStats.idleNow} idle` : null
        },
        {
          title: "Break Management",
          description: "Track and manage employee breaks automatically",
          route: "/breaks",
          badge: "Automated"
        }
      ]
    },
    {
      category: "Productivity Analysis",
      icon: "📊",
      color: "bg-green-500",
      items: [
        {
          title: "Productivity Categorization",
          description: "Apps auto-categorized as Productive, Neutral, or Unproductive",
          route: "/productivity-breakdown",
          badge: "65+ Rules",
          visual: "Pie Chart"
        },
        {
          title: "App & Website Tracker",
          description: "Records application names, window titles, and usage duration",
          route: "/productivity-breakdown",
          badge: "Real-time",
          visual: "Visual Charts"
        },
        {
          title: "Productivity Graphs",
          description: "Beautiful visualizations of productive vs unproductive time",
          route: "/productivity-breakdown",
          badge: "Interactive"
        }
      ]
    },
    {
      category: "Location & Attendance",
      icon: "📍",
      color: "bg-purple-500",
      items: [
        {
          title: "Geolocation Verification",
          description: "GPS tracking for clock-in/out with geofence verification",
          route: "/geolocation",
          badge: "GPS Enabled",
          stats: dashboardStats ? `${dashboardStats.organizationStats.totalEmployees} employees` : null
        },
        {
          title: "Attendance Calendar",
          description: "Visual calendar with presence, absence, late login, and half-days",
          route: "/attendance-calendar",
          badge: "Calendar View"
        },
        {
          title: "Late Start / Early Logout",
          description: "Automatic logs for punctuality violations",
          route: "/employee-report",
          badge: "Auto-detect",
          stats: dashboardStats ? `${dashboardStats.organizationStats.lateToday} late today` : null
        }
      ]
    },
    {
      category: "Reports & Analytics",
      icon: "📈",
      color: "bg-orange-500",
      items: [
        {
          title: "Employee Reports",
          description: "Daily/weekly reports with work hours, productivity, idle time, punctuality",
          route: "/employee-report",
          badge: "Comprehensive"
        },
        {
          title: "Real-time Dashboard",
          description: "Live view of who's working, idle, offline, or late",
          route: "/dashboard",
          badge: "Live Data",
          stats: dashboardStats ? `${dashboardStats.organizationStats.activeNow}/${dashboardStats.organizationStats.totalEmployees} active` : null
        },
        {
          title: "Idle Time Analytics",
          description: "Detailed analysis of engagement levels and distractions",
          route: "/dashboard",
          badge: "Insights"
        }
      ]
    },
    {
      category: "Payroll & Export",
      icon: "💰",
      color: "bg-emerald-500",
      items: [
        {
          title: "Automated Salary Calculator",
          description: "Payroll-ready data based on hourly rate × worked hours",
          route: "/reports",
          badge: "Auto-calculate",
          features: ["Regular hours", "Overtime (1.5x)", "Optional deductions"]
        },
        {
          title: "Export Functionality",
          description: "Download reports as CSV or PDF for offline analysis",
          route: "/reports",
          badge: "CSV & PDF",
          features: ["Excel compatible", "Print-ready", "Archival"]
        },
        {
          title: "Custom Work Schedules",
          description: "Support for flexible shifts and per-employee schedules",
          route: "/settings",
          badge: "Flexible"
        }
      ]
    },
    {
      category: "Monitoring & Security",
      icon: "🔒",
      color: "bg-red-500",
      items: [
        {
          title: "Screenshot Capture",
          description: "Automated screenshots every 30 seconds during active sessions",
          route: "/screenshots",
          badge: "Every 30s"
        },
        {
          title: "Audio Recording",
          description: "Record work sessions with mute detection",
          route: "/audio",
          badge: "5-min chunks"
        },
        {
          title: "Activity Logs",
          description: "Complete audit trail of all employee activities",
          route: "/sessions",
          badge: "Full Audit"
        }
      ]
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-8 text-white">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">
              🚀 Work Invigilator - Complete Overview
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Comprehensive employee monitoring and productivity tracking system with automatic time tracking, geolocation, productivity analysis, and payroll automation.
            </p>
            {dashboardStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.activeNow}</div>
                  <div className="text-sm text-white/80">Active Now</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.totalHoursToday}</div>
                  <div className="text-sm text-white/80">Hours Today</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.avgProductivity}</div>
                  <div className="text-sm text-white/80">Avg Productivity</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.totalEmployees}</div>
                  <div className="text-sm text-white/80">Total Employees</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => router.push("/dashboard")}
            className="h-20 text-lg"
            variant="outline"
          >
            📊 Live Dashboard
          </Button>
          <Button
            onClick={() => router.push("/employee-report")}
            className="h-20 text-lg"
            variant="outline"
          >
            📄 Employee Reports
          </Button>
          <Button
            onClick={() => router.push("/productivity-breakdown")}
            className="h-20 text-lg"
            variant="outline"
          >
            📈 Productivity
          </Button>
          <Button
            onClick={() => router.push("/attendance-calendar")}
            className="h-20 text-lg"
            variant="outline"
          >
            📅 Calendar
          </Button>
        </div>

        {/* Features Grid */}
        {features.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`${category.color} text-white text-3xl w-12 h-12 rounded-lg flex items-center justify-center`}>
                {category.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ink-hi">{category.category}</h2>
                <p className="text-sm text-ink-muted">{category.items.length} features</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category.items.map((item, itemIndex) => (
                <Card
                  key={itemIndex}
                  className="cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-primary"
                  onClick={() => router.push(item.route)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      {item.badge && (
                        <Badge variant="success" size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-ink-muted mb-3">
                      {item.description}
                    </p>

                    {item.stats && (
                      <div className="bg-raised rounded-lg p-2 mb-2">
                        <div className="text-sm font-semibold text-primary">
                          {item.stats}
                        </div>
                      </div>
                    )}

                    {item.visual && (
                      <div className="bg-raised rounded-lg p-2 mb-2">
                        <div className="text-xs text-ink-mid">
                          🎨 {item.visual}
                        </div>
                      </div>
                    )}

                    {item.features && (
                      <div className="space-y-1">
                        {item.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-success rounded-full"></div>
                            <span className="text-xs text-ink-mid">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-line">
                      <span className="text-xs text-primary hover:underline">
                        View Details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Feature Highlights */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">✨ Key Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-ink-hi mb-3 flex items-center space-x-2">
                  <span className="text-2xl">🤖</span>
                  <span>Fully Automated</span>
                </h3>
                <ul className="space-y-2 text-sm text-ink-mid">
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Auto clock-in/out based on computer activity</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Automatic idle detection (3-minute threshold)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Auto-categorized productivity (65+ pre-configured rules)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Automatic late/early detection</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Automated payroll calculations</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-ink-hi mb-3 flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <span>Beautiful Visualizations</span>
                </h3>
                <ul className="space-y-2 text-sm text-ink-mid">
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Interactive pie charts for productivity breakdown</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Calendar view with color-coded attendance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Real-time dashboard with live updates</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Daily/weekly trend charts</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-success">✓</span>
                    <span>Export to CSV/PDF for offline analysis</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Guide */}
        <Card>
          <CardHeader>
            <CardTitle>📍 Quick Navigation Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Daily Monitoring</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/dashboard")} className="cursor-pointer hover:text-primary">→ Live Dashboard</div>
                  <div onClick={() => router.push("/sessions")} className="cursor-pointer hover:text-primary">→ Active Sessions</div>
                  <div onClick={() => router.push("/screenshots")} className="cursor-pointer hover:text-primary">→ Screenshots</div>
                </div>
              </div>

              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Productivity Analysis</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/productivity-breakdown")} className="cursor-pointer hover:text-primary">→ Productivity Breakdown</div>
                  <div onClick={() => router.push("/productivity-reports")} className="cursor-pointer hover:text-primary">→ Productivity Reports</div>
                  <div onClick={() => router.push("/reports")} className="cursor-pointer hover:text-primary">→ Detailed Reports</div>
                </div>
              </div>

              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Attendance & Payroll</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/attendance-calendar")} className="cursor-pointer hover:text-primary">→ Attendance Calendar</div>
                  <div onClick={() => router.push("/employee-report")} className="cursor-pointer hover:text-primary">→ Employee Reports</div>
                  <div onClick={() => router.push("/monthly-hours")} className="cursor-pointer hover:text-primary">→ Monthly Hours</div>
                </div>
              </div>

              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Location Tracking</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/geolocation")} className="cursor-pointer hover:text-primary">→ Geolocation Tracking</div>
                  <div onClick={() => router.push("/attendance")} className="cursor-pointer hover:text-primary">→ Attendance Records</div>
                  <div onClick={() => router.push("/timesheet")} className="cursor-pointer hover:text-primary">→ Timesheet</div>
                </div>
              </div>

              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Team Management</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/employees")} className="cursor-pointer hover:text-primary">→ Employees</div>
                  <div onClick={() => router.push("/breaks")} className="cursor-pointer hover:text-primary">→ Break Sessions</div>
                  <div onClick={() => router.push("/mute-events")} className="cursor-pointer hover:text-primary">→ Mute Events</div>
                </div>
              </div>

              <div className="p-4 bg-raised rounded-lg">
                <div className="font-semibold text-ink-hi mb-2">For Configuration</div>
                <div className="space-y-1 text-sm text-ink-mid">
                  <div onClick={() => router.push("/settings")} className="cursor-pointer hover:text-primary">→ Settings</div>
                  <div className="cursor-pointer hover:text-primary">→ Work Schedules</div>
                  <div className="cursor-pointer hover:text-primary">→ Productivity Rules</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
