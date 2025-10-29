import { useState, useMemo } from 'react';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  department: string;
  status: 'online' | 'offline';
  productivity: number;
}

interface EmployeeSidebarProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function EmployeeSidebar({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  isOpen,
  onToggle,
}: EmployeeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'productivity'>('name');

  // Get unique departments
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(emp => emp.department))).sort();
  }, [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        return a.status === 'online' ? -1 : 1;
      } else {
        return b.productivity - a.productivity;
      }
    });

    return filtered;
  }, [employees, searchTerm, departmentFilter, statusFilter, sortBy]);

  return (
    <>
      {/* Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-4 top-20 z-40 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-l-xl px-4 py-3 shadow-2xl hover:shadow-glow-blue transition-all duration-300 flex items-center space-x-2"
          title="Show Employees"
        >
          <img src="/newIcons/employees.png" alt="Employees" className="w-5 h-5 object-contain brightness-0 invert" />
          <span className="font-semibold">Employees</span>
          <Badge variant="primary" size="sm">{employees.length}</Badge>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <img src="/newIcons/employees.png" alt="Employees" className="w-6 h-6 object-contain" />
            <h2 className="text-lg font-bold text-gray-900">Employees</h2>
            <Badge variant="info" size="sm">{filteredEmployees.length}</Badge>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="p-4 space-y-3 border-b border-gray-200 bg-gray-50">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="productivity">Productivity</option>
            </select>
          </div>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm">No employees found</p>
            </div>
          ) : (
            filteredEmployees.map(employee => (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedEmployeeId === employee.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={employee.avatar_url}
                      alt={employee.name}
                      className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                    />
                    {/* Status Indicator */}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      employee.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {employee.name}
                      </p>
                      <Badge
                        variant={employee.status === 'online' ? 'success' : 'default'}
                        size="sm"
                      >
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">{employee.email}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{employee.department}</span>
                      <span className="text-xs font-medium text-blue-600">{employee.productivity}%</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Overlay (when sidebar is open on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        ></div>
      )}
    </>
  );
}
