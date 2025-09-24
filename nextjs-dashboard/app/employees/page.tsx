'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';
import { AddEmployeeForm, type EmployeeFormData } from '@/components/forms/AddEmployeeForm';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  productivity7d: number;
  avgFocusHDay: number;
  avgSessionMin: number;
  lastActive: string;
  status: 'online' | 'offline' | 'away';
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employees');

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatProductivity = (value: number) => `${value.toFixed(1)}%`;
  const formatHours = (value: number) => `${value.toFixed(1)}h`;
  const formatMinutes = (value: number) => `${value}min`;

  const handleAddEmployee = async (formData: EmployeeFormData) => {
    setIsCreating(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const data = await response.json();
      console.log('Employee created:', data);

      // Close modal and refresh employee list
      setShowAddModal(false);
      await loadEmployees();

    } catch (error) {
      console.error('Error creating employee:', error);
      setError(error instanceof Error ? error.message : 'Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">Employees</h1>
            <p className="font-ui text-sm text-ink-muted">Manage team members and monitor productivity</p>
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
              <Button variant="outline">
                Filters
              </Button>
              <Button variant="outline">
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead sortable>Productivity %</TableHead>
                <TableHead sortable>Avg Focus</TableHead>
                <TableHead sortable>Avg Session</TableHead>
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
                    <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-danger text-sm">{error}</div>
                    <Button variant="outline" size="sm" onClick={loadEmployees} className="mt-2">
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-ink-muted">
                      {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
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
                        <div className="font-ui font-medium text-ink-hi">{employee.name}</div>
                        <div className="font-ui text-sm text-ink-muted">{employee.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-ink-mid">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    {employee.role === 'ADMIN' ? (
                      <Badge variant="warning" size="sm">ADMIN</Badge>
                    ) : (
                      <Badge variant="default" size="sm">USER</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="cell-num font-mono">
                        {formatProductivity(employee.productivity7d)}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          employee.productivity7d >= 90
                            ? 'bg-success'
                            : employee.productivity7d >= 75
                            ? 'bg-warn'
                            : 'bg-danger'
                        }`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="cell-num font-mono text-ink-mid">
                      {formatHours(employee.avgFocusHDay)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="cell-num font-mono text-ink-mid">
                      {formatMinutes(employee.avgSessionMin)}
                    </span>
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
                      <Button variant="ghost" size="sm">
                        •••
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
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const employee = employees.find(e => e.id === selectedEmployee);
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
                      <h3 className="text-lg font-semibold text-ink-hi">{employee.name}</h3>
                      <p className="text-ink-muted">{employee.email}</p>
                      <Badge variant={employee.role === 'ADMIN' ? 'warning' : 'default'} className="mt-2">
                        {employee.role}
                      </Badge>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Productivity</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {formatProductivity(employee.productivity7d)}
                        </div>
                      </div>
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Focus Time</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {formatHours(employee.avgFocusHDay)}
                        </div>
                      </div>
                    </div>

                    {/* Screenshots Gallery */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-ink-hi">Recent Screenshots</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="aspect-video bg-raised rounded border border-line flex items-center justify-center">
                            <span className="text-ink-muted text-xs">📸</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">
                        View Timeline
                      </Button>
                      <Button className="flex-1">
                        Export Data
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
      </div>
    </DashboardLayout>
  );
}