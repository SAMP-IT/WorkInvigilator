"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  AddEmployeeForm,
  type EmployeeFormData,
} from "@/components/forms/AddEmployeeForm";
import { useAuth } from "@/lib/auth-context";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  productivity7d: number;
  avgBreakHDay: number;
  avgSessionMin: number;
  lastActive: string;
  status: "online" | "offline";
  createdAt: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hourlyRate?: number;
}

interface Screenshot {
  id: string;
  url: string;
  created_at: string;
}

function EmployeesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeScreenshots, setEmployeeScreenshots] = useState<Screenshot[]>([]);
  const [showHourlyRateModal, setShowHourlyRateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState<string>("");
  const [isSavingRate, setIsSavingRate] = useState(false);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || emp.department === departmentFilter;
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.department))
  );
  const uniqueRoles = Array.from(new Set(employees.map((emp) => emp.role)));

  useEffect(() => {
    // Wait for auth to finish loading before fetching employees
    if (!authLoading && profile?.organization_id) {
      loadEmployees();
    } else if (!authLoading && !profile?.organization_id) {
      setError("No organization found");
      setLoading(false);
    }
  }, [authLoading, profile?.organization_id]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        setError("No organization found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/employees?organizationId=${profile.organization_id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError("Failed to load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeScreenshots = async (employeeId: string) => {
    try {
      if (!profile?.organization_id) return;

      const response = await fetch(
        `/api/screenshots?employeeId=${employeeId}&organizationId=${profile.organization_id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch screenshots");
      }

      const data = await response.json();
      const screenshots = (data.screenshots || []).slice(0, 4).map((s: any) => ({
        id: s.id,
        url: s.url,
        created_at: s.timestamp
      }));
      setEmployeeScreenshots(screenshots);
    } catch (err) {
      console.error("Failed to load employee screenshots");
      setEmployeeScreenshots([]);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeScreenshots(selectedEmployee);
    }
  }, [selectedEmployee]);

  const formatProductivity = (value: number) => `${(value || 0).toFixed(1)}%`;
  const formatHours = (value: number) => `${(value || 0).toFixed(1)}h`;
  const formatMinutes = (value: number) => `${value || 0}min`;

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      "Name",
      "Email",
      "Department",
      "Role",
      "Avg Break (h)",
      "Avg Session (min)",
      "Hourly Rate ($)",
      "Last Active",
      "Status",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredEmployees.map((emp) =>
        [
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.department}"`,
          `"${emp.role}"`,
          emp.avgBreakHDay.toFixed(1),
          emp.avgSessionMin,
          (emp.hourlyRate || 0).toFixed(2),
          `"${emp.lastActive}"`,
          emp.status,
        ].join(",")
      ),
    ];

    // Create blob and download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEditHourlyRate = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewHourlyRate(employee.hourlyRate?.toString() || "0");
    setShowHourlyRateModal(true);
  };

  const handleSaveHourlyRate = async () => {
    if (!editingEmployee || !profile?.organization_id) return;

    try {
      setIsSavingRate(true);
      setError(null);

      const response = await fetch("/api/employees/update-hourly-rate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: editingEmployee.id,
          hourlyRate: parseFloat(newHourlyRate) || 0,
          organizationId: profile.organization_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update hourly rate");
      }

      setSuccessMessage(`Hourly rate updated to $${newHourlyRate}/hr for ${editingEmployee.name}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Update local employee data
      setEmployees(employees.map(emp =>
        emp.id === editingEmployee.id
          ? { ...emp, hourlyRate: parseFloat(newHourlyRate) || 0 }
          : emp
      ));

      setShowHourlyRateModal(false);
      setEditingEmployee(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update hourly rate"
      );
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleAddEmployee = async (formData: EmployeeFormData) => {
    setIsCreating(true);

    try {
      if (!profile?.organization_id) {
        throw new Error("No organization found");
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          organizationId: profile.organization_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create employee");
      }

      const data = await response.json();

      // Show success message
      setSuccessMessage(`Employee ${formData.name} created successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds

      // Close modal and refresh employee list
      setShowAddModal(false);
      await loadEmployees();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create employee"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
              Employees
            </h1>
            <p className="font-ui text-sm text-ink-muted">
              Manage team members and monitor productivity
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">
              {loading ? "..." : employees.length} Total
            </Badge>
            <Button onClick={() => setShowAddModal(true)}>
              + Add Employee
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search employees by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters {showFilters ? "▲" : "▼"}
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-hi mb-2">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-hi mb-2">
                    Role
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-hi mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge variant="info">
                  Showing {filteredEmployees.length} of {employees.length}{" "}
                  employees
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDepartmentFilter("all");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employees Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead sortable>Avg Break</TableHead>
                <TableHead sortable>Avg Session</TableHead>
                <TableHead sortable>Hourly Rate</TableHead>
                <TableHead sortable>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-gray-300 rounded w-32 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-40 animate-pulse"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-gray-300 rounded w-16 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 bg-gray-300 rounded w-20 animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-danger text-sm">{error}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadEmployees}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-ink-muted">
                      {searchTerm
                        ? "No employees found matching your search."
                        : "No employees found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee.id)}
                    selected={selectedEmployee === employee.id}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar
                          fallback={employee.name}
                          status={employee.status}
                          size="sm"
                        />
                        <div>
                          <div className="font-ui font-medium text-ink-hi">
                            {employee.name}
                          </div>
                          <div className="font-ui text-sm text-ink-muted">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-ink-mid">
                        {employee.department}
                      </span>
                    </TableCell>
                    <TableCell>
                      {employee.role?.toLowerCase() === "admin" ? (
                        <Badge variant="warning" size="sm">
                          ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          USER
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="cell-num font-mono text-ink-mid">
                        {formatHours(employee.avgBreakHDay)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="cell-num font-mono text-ink-mid">
                        {formatMinutes(employee.avgSessionMin)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditHourlyRate(employee);
                        }}
                        className="cell-num font-mono text-success hover:text-success/80 font-medium cursor-pointer"
                      >
                        ${employee.hourlyRate?.toFixed(2) || "0.00"}/hr
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="cell-num font-mono text-sm text-ink-muted">
                        {employee.lastActive}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditHourlyRate(employee);
                          }}
                        >
                          $ Edit Rate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Employee Details Drawer */}
        {selectedEmployee && (
          <Card className="fixed right-6 top-20 bottom-6 w-96 z-50 overflow-y-auto animate-slide-up">
            <CardHeader className="border-b border-line">
              <div className="flex items-center justify-between">
                <CardTitle>Employee Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const employee = employees.find(
                  (e) => e.id === selectedEmployee
                );
                if (!employee) return null;

                return (
                  <div className="space-y-6">
                    {/* Employee Info */}
                    <div className="text-center py-4">
                      <Avatar
                        fallback={employee.name}
                        status={employee.status}
                        size="lg"
                        className="mx-auto mb-3"
                      />
                      <h3 className="text-lg font-semibold text-ink-hi">
                        {employee.name}
                      </h3>
                      <p className="text-ink-muted">{employee.email}</p>
                      <Badge
                        variant={
                          employee.role?.toLowerCase() === "admin" ? "warning" : "default"
                        }
                        className="mt-2"
                      >
                        {employee.role?.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Break Time</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {formatHours(employee.avgBreakHDay)}
                        </div>
                      </div>
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Avg Session</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {formatMinutes(employee.avgSessionMin)}
                        </div>
                      </div>
                    </div>

                    {/* Screenshots Gallery */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-ink-hi">
                        Recent Screenshots
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {employeeScreenshots.length > 0 ? (
                          employeeScreenshots.map((screenshot) => (
                            <div
                              key={screenshot.id}
                              className="aspect-video bg-raised rounded border border-line overflow-hidden cursor-pointer hover:border-primary transition-colors"
                              onClick={() => router.push('/screenshots')}
                            >
                              <img
                                src={screenshot.url}
                                alt="Screenshot"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                                  target.parentElement!.innerHTML = '<span class="text-ink-muted text-xs">No Image</span>';
                                }}
                              />
                            </div>
                          ))
                        ) : (
                          Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-video bg-raised rounded border border-line flex items-center justify-center"
                            >
                              <span className="text-ink-muted text-xs">No Screenshot</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push('/sessions')}
                      >
                        View Timeline
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => router.push('/screenshots')}
                      >
                        View Screenshots
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Add Employee Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => !isCreating && setShowAddModal(false)}
          title="Add New Employee"
          size="lg"
        >
          <AddEmployeeForm
            onSubmit={handleAddEmployee}
            onCancel={() => setShowAddModal(false)}
            loading={isCreating}
          />
        </Modal>

        {/* Edit Hourly Rate Modal */}
        <Modal
          isOpen={showHourlyRateModal}
          onClose={() => !isSavingRate && setShowHourlyRateModal(false)}
          title="Edit Hourly Rate"
        >
          {editingEmployee && (
            <div className="space-y-6 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-ink-hi mb-1">
                  {editingEmployee.name}
                </h3>
                <p className="text-sm text-ink-muted">{editingEmployee.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Hourly Rate (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-mono">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newHourlyRate}
                    onChange={(e) => setNewHourlyRate(e.target.value)}
                    className="pl-7 font-mono text-lg"
                    placeholder="0.00"
                    disabled={isSavingRate}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">
                    /hour
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-2">
                  This rate will be used for salary calculations in monthly hours tracking
                </p>
              </div>

              <div className="bg-raised p-4 rounded-lg">
                <h4 className="text-sm font-medium text-ink-hi mb-2">Monthly Estimate</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">160 hours (regular):</span>
                    <span className="font-mono text-ink-hi">
                      ${(parseFloat(newHourlyRate) * 160).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">20 hours (overtime @ 1.5x):</span>
                    <span className="font-mono text-ink-hi">
                      ${(parseFloat(newHourlyRate) * 20 * 1.5).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-line">
                    <span className="font-medium text-ink-hi">Total (180 hrs):</span>
                    <span className="font-mono font-semibold text-success">
                      ${(parseFloat(newHourlyRate) * 160 + parseFloat(newHourlyRate) * 20 * 1.5).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowHourlyRateModal(false)}
                  disabled={isSavingRate}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveHourlyRate}
                  disabled={isSavingRate}
                  className="flex-1"
                >
                  {isSavingRate ? "Saving..." : "Save Rate"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <EmployeesPageContent />
    </Suspense>
  );
}
