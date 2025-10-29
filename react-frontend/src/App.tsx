import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages - lazy load for better performance
import { lazy, Suspense } from 'react';
import { PageLoadingSpinner } from './components/ui/LoadingSpinner';

const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const OverviewPage = lazy(() => import('./pages/Overview'));
const LiveMonitoringPage = lazy(() => import('./pages/LiveMonitoring'));
const EmployeesPage = lazy(() => import('./pages/Employees'));
const TimesheetPage = lazy(() => import('./pages/Timesheet'));
const AttendancePage = lazy(() => import('./pages/Attendance'));
const AttendanceCalendarPage = lazy(() => import('./pages/AttendanceCalendar'));
const ProductivityPage = lazy(() => import('./pages/Productivity'));
const ProductivityReportsPage = lazy(() => import('./pages/ProductivityReports'));
const ProductivityBreakdownPage = lazy(() => import('./pages/ProductivityBreakdown'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const EmployeeReportPage = lazy(() => import('./pages/EmployeeReport'));
const MonthlyHoursPage = lazy(() => import('./pages/MonthlyHours'));
const ScreenshotsPage = lazy(() => import('./pages/Screenshots'));
const AudioPage = lazy(() => import('./pages/Audio'));
const SessionsPage = lazy(() => import('./pages/Sessions'));
const BreaksPage = lazy(() => import('./pages/Breaks'));
const MuteEventsPage = lazy(() => import('./pages/MuteEvents'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const UnauthorizedPage = lazy(() => import('./pages/Unauthorized'));

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []); // Empty dependency array - only run once on mount

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Navigate to="/dashboard" replace />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <OverviewPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-monitoring"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <LiveMonitoringPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <EmployeesPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/timesheet"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TimesheetPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AttendancePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance-calendar"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AttendanceCalendarPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/productivity"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductivityPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/productivity-reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductivityReportsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/productivity-breakdown"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductivityBreakdownPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ReportsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee-report"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EmployeeReportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/monthly-hours"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MonthlyHoursPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/screenshots"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ScreenshotsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/audio"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AudioPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SessionsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/breaks"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BreaksPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/mute-events"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MuteEventsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 - Redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
