"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { useAuth } from "@/lib/auth-context";

interface EmployeeReportData {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    expectedStartTime: string;
    expectedEndTime: string;
  };
  period: {
    startDate: string;
    endDate: string;
    reportType: string;
    totalDays: number;
  };
  summary: {
    totalWorkedTime: string;
    totalWorkedSeconds: number;
    totalBreakTime: string;
    totalIdleTime: string;
    productivityPercentage: number;
    productiveTime: string;
    neutralTime: string;
    unproductiveTime: string;
    averageDailyWorkTime: string;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    attendanceRate: string;
    lateStarts: number;
    earlyLogouts: number;
    onTimeStarts: number;
    totalSessions: number;
  };
  dailyBreakdown: Array<{
    date: string;
    clockInTime: string | null;
    clockOutTime: string | null;
    totalWorkTime: string;
    totalBreakTime: string;
    totalIdleTime: string;
    status: string;
    isLate: boolean;
    lateByMinutes: number;
    isEarlyLogout: boolean;
    idlePeriods: number;
  }>;
  insights: {
    punctuality: string;
    productivity: string;
    attendance: string;
    idleTimeRatio: string;
  };
}

export default function EmployeeReportPage() {
  const { profile } = useAuth();
  const [reportData, setReportData] = useState<EmployeeReportData | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [reportType, setReportType] = useState<"daily" | "weekly" | "custom">("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (profile?.organization_id) {
      loadEmployees();
    }
  }, [profile]);

  const loadEmployees = async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch(
        `/api/employees?organizationId=${profile.organization_id}`
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
        // Auto-select first employee
        if (data.employees?.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data.employees[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const loadReport = async () => {
    if (!selectedEmployee || !profile?.organization_id) {
      setError("Please select an employee");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `/api/reports/employee?organizationId=${profile.organization_id}&employeeId=${selectedEmployee}&reportType=${reportType}`;

      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch employee report");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError("Failed to load employee report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Report - ${reportData.employee.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          .header { margin-bottom: 30px; }
          .info { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin: 20px 0; }
          .info-label { font-weight: bold; color: #666; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .metric { border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 8px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #10b981; }
          .metric-label { color: #666; font-size: 12px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-success { background-color: #d1fae5; color: #065f46; }
          .badge-warning { background-color: #fef3c7; color: #92400e; }
          .badge-danger { background-color: #fee2e2; color: #991b1b; }
          .insight { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 10px 0; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Employee Performance Report</h1>
          <div class="info">
            <div class="info-label">Employee:</div>
            <div>${reportData.employee.name} (${reportData.employee.email})</div>
            <div class="info-label">Department:</div>
            <div>${reportData.employee.department || "N/A"}</div>
            <div class="info-label">Period:</div>
            <div>${reportData.period.reportType.toUpperCase()} - ${reportData.period.startDate} to ${reportData.period.endDate}</div>
            <div class="info-label">Generated:</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>

        <h2>Summary</h2>
        <div class="metrics">
          <div class="metric">
            <div class="metric-value">${reportData.summary.totalWorkedTime}</div>
            <div class="metric-label">Total Worked Hours</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.summary.productivityPercentage}%</div>
            <div class="metric-label">Productivity</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.summary.totalIdleTime}</div>
            <div class="metric-label">Idle Time</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.summary.daysLate}</div>
            <div class="metric-label">Late Starts</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.summary.earlyLogouts}</div>
            <div class="metric-label">Early Logouts</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.summary.attendanceRate}</div>
            <div class="metric-label">Attendance Rate</div>
          </div>
        </div>

        <h2>Performance Insights</h2>
        <div class="insight">
          <strong>Punctuality:</strong> ${reportData.insights.punctuality} - ${reportData.summary.onTimeStarts} on-time starts, ${reportData.summary.lateStarts} late starts<br>
          <strong>Productivity:</strong> ${reportData.insights.productivity} - ${reportData.summary.productivityPercentage}% productive<br>
          <strong>Attendance:</strong> ${reportData.insights.attendance} - ${reportData.summary.daysPresent}/${reportData.period.totalDays} days present<br>
          <strong>Idle Time:</strong> ${reportData.insights.idleTimeRatio} of work time
        </div>

        <h2>Daily Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Work Time</th>
              <th>Idle Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.dailyBreakdown.map(day => `
              <tr>
                <td>${day.date}</td>
                <td>${day.clockInTime ? new Date(day.clockInTime).toLocaleTimeString() : "N/A"}</td>
                <td>${day.clockOutTime ? new Date(day.clockOutTime).toLocaleTimeString() : "N/A"}</td>
                <td>${day.totalWorkTime}</td>
                <td>${day.totalIdleTime}</td>
                <td>
                  ${day.isLate ? '<span class="badge badge-danger">LATE (' + day.lateByMinutes + ' min)</span>' : ''}
                  ${day.isEarlyLogout ? '<span class="badge badge-warning">EARLY</span>' : ''}
                  ${!day.isLate && !day.isEarlyLogout && day.clockInTime ? '<span class="badge badge-success">ON TIME</span>' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = "Employee Performance Report\n";
    csvContent += `Employee:,${reportData.employee.name}\n`;
    csvContent += `Email:,${reportData.employee.email}\n`;
    csvContent += `Department:,${reportData.employee.department || "N/A"}\n`;
    csvContent += `Period:,${reportData.period.startDate} to ${reportData.period.endDate}\n`;
    csvContent += `Report Type:,${reportData.period.reportType}\n`;
    csvContent += `Generated:,${new Date().toLocaleString()}\n\n`;

    csvContent += "Summary\n";
    csvContent += `Total Worked Hours:,${reportData.summary.totalWorkedTime}\n`;
    csvContent += `Productivity:,${reportData.summary.productivityPercentage}%\n`;
    csvContent += `Total Idle Time:,${reportData.summary.totalIdleTime}\n`;
    csvContent += `Total Break Time:,${reportData.summary.totalBreakTime}\n`;
    csvContent += `Days Present:,${reportData.summary.daysPresent}\n`;
    csvContent += `Days Absent:,${reportData.summary.daysAbsent}\n`;
    csvContent += `Late Starts:,${reportData.summary.lateStarts}\n`;
    csvContent += `Early Logouts:,${reportData.summary.earlyLogouts}\n`;
    csvContent += `On-Time Starts:,${reportData.summary.onTimeStarts}\n`;
    csvContent += `Attendance Rate:,${reportData.summary.attendanceRate}\n\n`;

    csvContent += "Insights\n";
    csvContent += `Punctuality:,${reportData.insights.punctuality}\n`;
    csvContent += `Productivity:,${reportData.insights.productivity}\n`;
    csvContent += `Attendance:,${reportData.insights.attendance}\n`;
    csvContent += `Idle Time Ratio:,${reportData.insights.idleTimeRatio}\n\n`;

    csvContent += "Daily Breakdown\n";
    csvContent += "Date,Clock In,Clock Out,Work Time,Break Time,Idle Time,Status,Late By (min)\n";
    reportData.dailyBreakdown.forEach(day => {
      csvContent += `${day.date},${day.clockInTime || "N/A"},${day.clockOutTime || "N/A"},${day.totalWorkTime},${day.totalBreakTime},${day.totalIdleTime},${day.isLate ? "LATE" : day.isEarlyLogout ? "EARLY" : "ON TIME"},${day.lateByMinutes}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `employee_report_${reportData.employee.name}_${reportData.period.startDate}_${reportData.period.endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInsightColor = (insight: string) => {
    if (insight === "Excellent") return "text-success";
    if (insight === "Good") return "text-primary";
    return "text-danger";
  };

  const getInsightBadge = (insight: string) => {
    if (insight === "Excellent") return "success";
    if (insight === "Good") return "info";
    return "danger";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
              Employee Reports
            </h1>
            <p className="font-ui text-sm text-ink-muted">
              Daily and weekly performance reports for individual employees
            </p>
          </div>
          {reportData && (
            <div className="flex items-center space-x-3">
              <Button onClick={exportToCSV} variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
              <Button onClick={exportToPDF}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </Button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email} {emp.department ? `- ${emp.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "daily" | "weekly" | "custom")}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="daily">Daily (Today)</option>
                  <option value="weekly">Weekly (Last 7 Days)</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {reportType === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink-hi mb-2">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-hi mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="flex items-end">
                <Button onClick={loadReport} className="w-full" disabled={!selectedEmployee}>
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-8">
                  <div className="h-32 bg-gray-300 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reportData ? (
          <>
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <Avatar fallback={reportData.employee.name} size="lg" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-ink-muted">Name</div>
                      <div className="font-medium text-ink-hi">{reportData.employee.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-ink-muted">Email</div>
                      <div className="font-medium text-ink-hi">{reportData.employee.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-ink-muted">Department</div>
                      <div className="font-medium text-ink-hi">{reportData.employee.department || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-ink-muted">Expected Hours</div>
                      <div className="font-medium text-ink-hi">
                        {reportData.employee.expectedStartTime} - {reportData.employee.expectedEndTime}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Total Worked Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-primary">
                    {reportData.summary.totalWorkedTime}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Avg: {reportData.summary.averageDailyWorkTime}/day
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Productivity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-success">
                    {reportData.summary.productivityPercentage}%
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    <Badge variant={getInsightBadge(reportData.insights.productivity)}>
                      {reportData.insights.productivity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Idle Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-warning">
                    {reportData.summary.totalIdleTime}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    {reportData.insights.idleTimeRatio} of work time
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-success">
                    {reportData.summary.attendanceRate}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    {reportData.summary.daysPresent}/{reportData.period.totalDays} days
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Punctuality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Late Starts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-danger">
                    {reportData.summary.lateStarts}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Times clocked in late
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Early Logouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-warning">
                    {reportData.summary.earlyLogouts}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Times clocked out early
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">On-Time Starts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-success">
                    {reportData.summary.onTimeStarts}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    <Badge variant={getInsightBadge(reportData.insights.punctuality)}>
                      {reportData.insights.punctuality}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-raised rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-hi">Punctuality</span>
                      <Badge variant={getInsightBadge(reportData.insights.punctuality)}>
                        {reportData.insights.punctuality}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {reportData.summary.onTimeStarts} on-time starts, {reportData.summary.lateStarts} late starts, {reportData.summary.earlyLogouts} early logouts
                    </p>
                  </div>

                  <div className="p-4 bg-raised rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-hi">Productivity</span>
                      <Badge variant={getInsightBadge(reportData.insights.productivity)}>
                        {reportData.insights.productivity}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {reportData.summary.productivityPercentage}% productive time - {reportData.summary.productiveTime} productive, {reportData.summary.neutralTime} neutral
                    </p>
                  </div>

                  <div className="p-4 bg-raised rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-hi">Attendance</span>
                      <Badge variant={getInsightBadge(reportData.insights.attendance)}>
                        {reportData.insights.attendance}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-muted">
                      Present {reportData.summary.daysPresent} out of {reportData.period.totalDays} expected work days ({reportData.summary.attendanceRate})
                    </p>
                  </div>

                  <div className="p-4 bg-raised rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-hi">Idle Time Management</span>
                      <Badge variant="warning">
                        {reportData.insights.idleTimeRatio}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-muted">
                      Total idle time: {reportData.summary.totalIdleTime} - automatically detected periods of inactivity
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Breakdown</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Work Time</TableHead>
                    <TableHead>Break Time</TableHead>
                    <TableHead>Idle Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.dailyBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-ink-muted">
                          No attendance data for this period.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.dailyBreakdown.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium text-ink-hi">{day.date}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-ink-mid">
                            {day.clockInTime ? new Date(day.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-ink-mid">
                            {day.clockOutTime ? new Date(day.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-medium text-ink-hi">
                            {day.totalWorkTime}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-ink-mid">
                            {day.totalBreakTime}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-warning">
                            {day.totalIdleTime}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {day.isLate && (
                              <Badge variant="danger" size="sm">
                                LATE ({day.lateByMinutes} min)
                              </Badge>
                            )}
                            {day.isEarlyLogout && (
                              <Badge variant="warning" size="sm">
                                EARLY LOGOUT
                              </Badge>
                            )}
                            {!day.isLate && !day.isEarlyLogout && day.clockInTime && (
                              <Badge variant="success" size="sm">
                                ON TIME
                              </Badge>
                            )}
                            {day.status === "absent" && (
                              <Badge variant="default" size="sm">
                                ABSENT
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-semibold text-ink-hi mb-2">
                Select an Employee to Generate Report
              </h3>
              <p className="text-ink-muted">
                Choose an employee and report type from the filters above to view detailed performance metrics.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
