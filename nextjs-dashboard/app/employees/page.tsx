'use client';

import { useState } from 'react';
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

// Mock employee data
const employees = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    department: 'Engineering',
    role: 'USER',
    productivity7d: 92.5,
    avgFocusHDay: 6.8,
    avgSessionMin: 156,
    lastActive: '24/09/2024 14:23',
    status: 'online' as const
  },
  {
    id: '2',
    name: 'Mike Johnson',
    email: 'mike.j@company.com',
    department: 'Design',
    role: 'ADMIN',
    productivity7d: 88.3,
    avgFocusHDay: 5.9,
    avgSessionMin: 142,
    lastActive: '24/09/2024 14:18',
    status: 'online' as const
  },
  {
    id: '3',
    name: 'Lisa Wang',
    email: 'lisa.wang@company.com',
    department: 'Marketing',
    role: 'USER',
    productivity7d: 76.2,
    avgFocusHDay: 4.8,
    avgSessionMin: 128,
    lastActive: '24/09/2024 13:45',
    status: 'away' as const
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    department: 'Engineering',
    role: 'USER',
    productivity7d: 94.1,
    avgFocusHDay: 7.2,
    avgSessionMin: 168,
    lastActive: '24/09/2024 12:30',
    status: 'offline' as const
  }
];

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatProductivity = (value: number) => `${value.toFixed(1)}%`;
  const formatHours = (value: number) => `${value.toFixed(1)}h`;
  const formatMinutes = (value: number) => `${value}min`;

  const handleAddEmployee = async (formData: EmployeeFormData) => {
    setIsCreating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Here you would typically call your API to create the employee
      console.log('Creating employee:', formData);

      // Close modal and show success
      setShowAddModal(false);

      // You could also add the new employee to the local state here
      // or refetch the employees list

    } catch (error) {
      console.error('Error creating employee:', error);
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
              {employees.length} Total
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
              {filteredEmployees.map((employee) => (
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
              ))}
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

                    {/* Trend Charts Placeholder */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-ink-hi">7-Day Trend</h4>
                      <div className="h-24 bg-raised rounded-lg flex items-center justify-center">
                        <span className="text-ink-muted text-sm">📈 Mini Chart</span>
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