import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface DashboardStats {
  organizationStats: {
    activeNow: number;
    totalEmployees: number;
    totalHoursToday: string;
    avgProductivity: string;
    idleNow: number;
    lateToday: number;
  };
}

async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const response = await fetch(
    `/api/analytics/realtime?organizationId=${organizationId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  return response.json();
}

export default function Overview() {
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string>('');

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

  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboardStats', organizationId],
    queryFn: () => fetchDashboardStats(organizationId),
    enabled: !!organizationId,
    refetchInterval: 30000,
    staleTime: 30000,
  });

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">
              Work Invigilator - Complete Overview
            </h1>
            <p className="text-xl text-blue-50 mb-6">
              Comprehensive employee monitoring and productivity tracking system with automatic time tracking, geolocation, productivity analysis, and payroll automation.
            </p>
            {dashboardStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.activeNow}</div>
                  <div className="text-sm text-blue-100">Active Now</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.totalHoursToday}</div>
                  <div className="text-sm text-blue-100">Hours Today</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.avgProductivity}</div>
                  <div className="text-sm text-blue-100">Avg Productivity</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{dashboardStats.organizationStats.totalEmployees}</div>
                  <div className="text-sm text-blue-100">Total Employees</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            className="h-20 text-lg bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            📊 Live Dashboard
          </Button>
          <Button
            onClick={() => navigate("/employee-report")}
            className="h-20 text-lg bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            📄 Employee Reports
          </Button>
          <Button
            onClick={() => navigate("/productivity-breakdown")}
            className="h-20 text-lg bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            📈 Productivity
          </Button>
          <Button
            onClick={() => navigate("/attendance-calendar")}
            className="h-20 text-lg bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            📅 Calendar
          </Button>
        </div>

        {/* Features Grid */}
        {features.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`${category.color} text-white text-3xl w-12 h-12 rounded-lg flex items-center justify-center shadow-md`}>
                {category.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                <p className="text-sm text-gray-600">{category.items.length} features</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category.items.map((item, itemIndex) => (
                <Card
                  key={itemIndex}
                  className="cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500 bg-white"
                  onClick={() => navigate(item.route)}
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
                    <p className="text-sm text-gray-600 mb-3">
                      {item.description}
                    </p>

                    {'stats' in item && item.stats && (
                      <div className="bg-blue-50 rounded-lg p-2 mb-2">
                        <div className="text-sm font-semibold text-blue-700">
                          {item.stats}
                        </div>
                      </div>
                    )}

                    {'visual' in item && item.visual && (
                      <div className="bg-gray-100 rounded-lg p-2 mb-2">
                        <div className="text-xs text-gray-700">
                          🎨 {item.visual}
                        </div>
                      </div>
                    )}

                    {'features' in item && item.features && (
                      <div className="space-y-1">
                        {item.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                            <span className="text-xs text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-blue-600 hover:underline">
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
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl">Key Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <span className="text-2xl">🤖</span>
                  <span>Fully Automated</span>
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Auto clock-in/out based on computer activity</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Automatic idle detection (3-minute threshold)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Auto-categorized productivity (65+ pre-configured rules)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Automatic late/early detection</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Automated payroll calculations</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <span>Beautiful Visualizations</span>
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Interactive pie charts for productivity breakdown</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Calendar view with color-coded attendance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Real-time dashboard with live updates</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Daily/weekly trend charts</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>Export to CSV/PDF for offline analysis</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Guide */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Quick Navigation Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Daily Monitoring</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/dashboard")} className="cursor-pointer hover:text-blue-600">→ Live Dashboard</div>
                  <div onClick={() => navigate("/sessions")} className="cursor-pointer hover:text-blue-600">→ Active Sessions</div>
                  <div onClick={() => navigate("/screenshots")} className="cursor-pointer hover:text-blue-600">→ Screenshots</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Productivity Analysis</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/productivity-breakdown")} className="cursor-pointer hover:text-blue-600">→ Productivity Breakdown</div>
                  <div onClick={() => navigate("/productivity-reports")} className="cursor-pointer hover:text-blue-600">→ Productivity Reports</div>
                  <div onClick={() => navigate("/reports")} className="cursor-pointer hover:text-blue-600">→ Detailed Reports</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Attendance & Payroll</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/attendance-calendar")} className="cursor-pointer hover:text-blue-600">→ Attendance Calendar</div>
                  <div onClick={() => navigate("/employee-report")} className="cursor-pointer hover:text-blue-600">→ Employee Reports</div>
                  <div onClick={() => navigate("/monthly-hours")} className="cursor-pointer hover:text-blue-600">→ Monthly Hours</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Location Tracking</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/geolocation")} className="cursor-pointer hover:text-blue-600">→ Geolocation Tracking</div>
                  <div onClick={() => navigate("/attendance")} className="cursor-pointer hover:text-blue-600">→ Attendance Records</div>
                  <div onClick={() => navigate("/timesheet")} className="cursor-pointer hover:text-blue-600">→ Timesheet</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Team Management</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/employees")} className="cursor-pointer hover:text-blue-600">→ Employees</div>
                  <div onClick={() => navigate("/breaks")} className="cursor-pointer hover:text-blue-600">→ Break Sessions</div>
                  <div onClick={() => navigate("/mute-events")} className="cursor-pointer hover:text-blue-600">→ Mute Events</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">For Configuration</div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div onClick={() => navigate("/settings")} className="cursor-pointer hover:text-blue-600">→ Settings</div>
                  <div className="cursor-pointer hover:text-blue-600">→ Work Schedules</div>
                  <div className="cursor-pointer hover:text-blue-600">→ Productivity Rules</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
