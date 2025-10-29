import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { AddEmployeeForm, type EmployeeFormData } from '../components/forms/AddEmployeeForm';
import { ViewEmployeeModal } from '../components/modals/ViewEmployeeModal';
import { useAuthStore } from '../store/authStore';
import { mockProfiles, mockSessions, mockTeams, mockScreenshots } from '../lib/mockData';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  productivity7d: number;
  totalBreakHours: number;
  totalWorkHours: number;
  lastActive: string;
  status: 'online' | 'offline';
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

// Helper function to transform mock data to Employee interface
const transformMockDataToEmployees = (): Employee[] => {
  // Filter out admin users (only employees)
  const employeeProfiles = mockProfiles.filter(p => p.role === 'employee');

  return employeeProfiles.map(profile => {
    // Find the most recent session for this employee
    const employeeSessions = mockSessions.filter(s => s.employee_id === profile.id);
    const activeSession = employeeSessions.find(s => s.status === 'active');
    const latestSession = employeeSessions.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    // Calculate total work and break hours from all sessions
    const totalWorkHours = employeeSessions.reduce((sum, session) => {
      const hours = session.active_time / 3600; // Convert seconds to hours
      return sum + hours;
    }, 0);

    const totalBreakHours = employeeSessions.reduce((sum, session) => {
      const hours = session.idle_time / 3600; // Convert seconds to hours
      return sum + hours;
    }, 0);

    // Calculate average productivity
    const avgProductivity = employeeSessions.length > 0
      ? employeeSessions.reduce((sum, s) => sum + (s.productivity_score || 0), 0) / employeeSessions.length
      : 0;

    // Find team/department
    const team = mockTeams[Math.floor(Math.random() * mockTeams.length)];

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      department: team.name,
      role: profile.role,
      productivity7d: avgProductivity,
      totalBreakHours,
      totalWorkHours,
      lastActive: latestSession
        ? new Date(latestSession.created_at).toLocaleString()
        : 'Never',
      status: activeSession ? 'online' : 'offline',
      createdAt: profile.created_at,
      shiftStartTime: '09:00',
      shiftEndTime: '17:00',
      hourlyRate: 25.00 + Math.floor(Math.random() * 50), // Random hourly rate between $25-$75
    };
  });
};

export default function Employees() {
  const { profile } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeScreenshots, setEmployeeScreenshots] = useState<Screenshot[]>([]);
  const [showHourlyRateModal, setShowHourlyRateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState<string>('');
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Date range filter (default to current month)
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.department))
  );
  const uniqueRoles = Array.from(new Set(employees.map((emp) => emp.role)));

  useEffect(() => {
    loadEmployees();
  }, [dateFrom, dateTo]);

  const loadEmployees = () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate loading delay
      setTimeout(() => {
        const mockEmployees = transformMockDataToEmployees();
        setEmployees(mockEmployees);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load employees. Please try again.');
      setLoading(false);
    }
  };

  const loadEmployeeScreenshots = (employeeId: string) => {
    try {
      // Filter screenshots for the selected employee
      const employeeScreens = mockScreenshots
        .filter(s => s.employee_id === employeeId)
        .slice(0, 4)
        .map(s => ({
          id: s.id,
          url: s.screenshot_url,
          created_at: s.captured_at,
        }));
      setEmployeeScreenshots(employeeScreens);
    } catch (err) {
      console.error('Failed to load employee screenshots');
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

  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Department',
      'Role',
      'Total Break (h)',
      'Total Work (h)',
      'Hourly Rate ($)',
      'Last Active',
      'Status',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredEmployees.map((emp) =>
        [
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.department}"`,
          `"${emp.role}"`,
          emp.totalBreakHours.toFixed(1),
          emp.totalWorkHours.toFixed(1),
          (emp.hourlyRate || 0).toFixed(2),
          `"${emp.lastActive}"`,
          emp.status,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEditHourlyRate = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewHourlyRate(employee.hourlyRate?.toString() || '0');
    setShowHourlyRateModal(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setViewingEmployee(employee);
    loadEmployeeScreenshots(employee.id);
    setShowViewModal(true);
  };

  const handleSaveHourlyRate = () => {
    if (!editingEmployee) return;

    try {
      setIsSavingRate(true);
      setError(null);

      // Simulate API delay
      setTimeout(() => {
        // Update employee hourly rate in memory
        setEmployees(employees.map(emp =>
          emp.id === editingEmployee.id
            ? { ...emp, hourlyRate: parseFloat(newHourlyRate) || 0 }
            : emp
        ));

        setSuccessMessage(`Hourly rate updated to $${newHourlyRate}/hr for ${editingEmployee.name}`);
        setTimeout(() => setSuccessMessage(null), 5000);

        setShowHourlyRateModal(false);
        setEditingEmployee(null);
        setIsSavingRate(false);
      }, 500);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update hourly rate'
      );
      setIsSavingRate(false);
    }
  };

  const handleAddEmployee = (formData: EmployeeFormData) => {
    setIsCreating(true);

    try {
      // Simulate API delay
      setTimeout(() => {
        // Create new employee object
        const newEmployee: Employee = {
          id: `emp-${Date.now()}`,
          name: formData.name,
          email: formData.email,
          department: formData.department || 'Engineering',
          role: formData.role || 'employee',
          productivity7d: 0,
          totalBreakHours: 0,
          totalWorkHours: 0,
          lastActive: 'Never',
          status: 'offline',
          createdAt: new Date().toISOString(),
          shiftStartTime: formData.shiftStartTime || '09:00',
          shiftEndTime: formData.shiftEndTime || '17:00',
          hourlyRate: 25.00,
        };

        // Add to employees list
        setEmployees([...employees, newEmployee]);

        setSuccessMessage(`Employee ${formData.name} created successfully!`);
        setTimeout(() => setSuccessMessage(null), 5000);

        setShowAddModal(false);
        setIsCreating(false);
      }, 500);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to create employee'
      );
      setIsCreating(false);
    }
  };

  return (
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
          <h1 className="text-2xl font-semibold text-gray-900">
            Employees
          </h1>
          <p className="text-sm text-gray-600">
            Manage team members and monitor productivity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="info">
            {loading ? '...' : employees.length} Total
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
              Filters {showFilters ? '▲' : '▼'}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="info">
                Showing {filteredEmployees.length} of {employees.length} employees
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDepartmentFilter('all');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Total Break (h)</TableHead>
              <TableHead>Total Work (h)</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
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
                    <div className="h-8 bg-gray-300 rounded w-20 animate-pulse"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-red-600 text-sm">{error}</div>
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
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-gray-600">
                    {searchTerm
                      ? 'No employees found matching your search.'
                      : 'No employees found.'}
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
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">
                          {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-700">
                      {employee.department}
                    </span>
                  </TableCell>
                  <TableCell>
                    {employee.role?.toLowerCase() === 'admin' ? (
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
                    <span className="font-mono text-gray-700">
                      {formatHours(employee.totalBreakHours)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-gray-700">
                      {formatHours(employee.totalWorkHours)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditHourlyRate(employee);
                      }}
                      className="font-mono text-green-600 hover:text-green-700 font-medium cursor-pointer"
                    >
                      ${employee.hourlyRate?.toFixed(2) || '0.00'}/hr
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-gray-600">
                      {employee.lastActive}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEmployee(employee);
                        }}
                      >
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
                        Edit Rate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {editingEmployee.name}
              </h3>
              <p className="text-sm text-gray-600">{editingEmployee.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-mono">
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">
                  /hour
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This rate will be used for salary calculations in monthly hours tracking
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Monthly Estimate</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">160 hours (regular):</span>
                  <span className="font-mono text-gray-900">
                    ${(parseFloat(newHourlyRate) * 160).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">20 hours (overtime @ 1.5x):</span>
                  <span className="font-mono text-gray-900">
                    ${(parseFloat(newHourlyRate) * 20 * 1.5).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-medium text-gray-900">Total (180 hrs):</span>
                  <span className="font-mono font-semibold text-green-600">
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
                {isSavingRate ? 'Saving...' : 'Save Rate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Employee Modal */}
      <ViewEmployeeModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        employee={viewingEmployee}
        screenshots={employeeScreenshots}
      />
    </div>
  );
}
