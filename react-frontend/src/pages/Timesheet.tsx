import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { mockTimesheetEntries } from '../lib/mockData';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';

interface SessionDetail {
  id: string;
  punchIn: string;
  punchOut: string;
  duration: number;
  startTime: string;
  endTime: string | null;
}

interface TimesheetEntry {
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  date: string;
  punchIn: string;
  punchOut: string;
  workHours: number;
  breakHours: number;
  netHours: number;
  status: 'completed' | 'active' | 'absent';
  sessionCount: number;
  sessionDetails: SessionDetail[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export default function Timesheet() {
  const { profile } = useAuthStore();
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  const departments = Array.from(new Set(timesheetData.map(entry => entry.employeeDepartment).filter(dept => dept && dept !== 'N/A'))).sort();

  useEffect(() => {
    loadTimesheetData();
  }, [startDate, endDate, profile]);

  const loadTimesheetData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Filter mock data by date range
      const filteredByDate = mockTimesheetEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && entryDate < start) return false;
        if (end && entryDate > end) return false;
        return true;
      });

      setTimesheetData(filteredByDate);
      setLoading(false);
    } catch (err) {
      setError('Failed to load timesheet data');
      setLoading(false);
    }
  };

  const filteredData = timesheetData.filter(entry => {
    const matchesSearch = entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || entry.employeeDepartment === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleExportCSV = () => {
    const headers = [
      'Employee Name',
      'Date',
      'Punch In',
      'Punch Out',
      'Break Hours',
      'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredData.map(entry => [
        `"${entry.employeeName}"`,
        entry.date,
        entry.punchIn,
        entry.punchOut,
        entry.breakHours.toFixed(2),
        entry.status
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toISOString().split('T')[0];
    a.download = `timesheet_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalWorkHours = filteredData.reduce((sum, entry) => sum + entry.workHours, 0);
  const totalBreakHours = filteredData.reduce((sum, entry) => sum + entry.breakHours, 0);
  const totalNetHours = filteredData.reduce((sum, entry) => sum + entry.netHours, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'absent':
        return <Badge variant="danger">Absent</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatBreakTime = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    } else {
      return `${hours.toFixed(2)}h`;
    }
  };

  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employee Timesheet</h1>
          <p className="text-gray-600">Track employee work hours and calculate payroll</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="info">
            {filteredData.length} Employees
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-600">Total Work Hours</div>
            <div className="text-2xl font-semibold text-gray-900">{totalWorkHours.toFixed(2)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-600">Total Break Hours</div>
            <div className="text-2xl font-semibold text-gray-900">{formatBreakTime(totalBreakHours)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export
              </label>
              <Button
                variant="primary"
                onClick={handleExportCSV}
                className="w-full"
                disabled={loading || filteredData.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>
          {(selectedDepartment !== 'all' || searchTerm || startDate || endDate) && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">
                  {filteredData.length} employees
                </Badge>
                {(startDate || endDate) && (
                  <p className="text-sm text-gray-600">
                    {startDate && endDate ? `${startDate} to ${endDate}` :
                     startDate ? `From ${startDate}` :
                     `Until ${endDate}`}
                  </p>
                )}
                {selectedDepartment !== 'all' && (
                  <span className="text-sm text-gray-600">
                    Department: {selectedDepartment}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                  setStartDate(getCurrentDate());
                  setEndDate(getCurrentDate());
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timesheet Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Punch In</TableHead>
              <TableHead>Punch Out</TableHead>
              <TableHead>Break Hours</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-6 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-red-600 text-sm">{error}</div>
                  <Button variant="outline" size="sm" onClick={loadTimesheetData} className="mt-2">
                    Try Again
                  </Button>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-gray-600">
                    {searchTerm ? 'No employees found matching your search.' : 'No timesheet data available for this period.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((entry) => {
                const rowKey = `${entry.employeeId}-${entry.date}`;
                const isExpanded = expandedRows.has(rowKey);

                return (
                  <>
                    <TableRow key={rowKey}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{entry.employeeName}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-700">{entry.date}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-900">{entry.punchIn}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-900">{entry.punchOut}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-gray-700">{formatBreakTime(entry.breakHours)}</span>
                      </TableCell>
                      <TableCell>
                        {entry.sessionCount > 0 ? (
                          <button
                            onClick={() => toggleRowExpansion(rowKey)}
                            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Badge variant="info" size="sm">
                              {entry.sessionCount} {entry.sessionCount === 1 ? 'session' : 'sessions'}
                            </Badge>
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-sm text-gray-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status)}
                      </TableCell>
                    </TableRow>

                    {isExpanded && entry.sessionDetails.length > 0 && (
                      <TableRow key={`${rowKey}-details`} className="bg-gray-50">
                        <TableCell colSpan={7} className="py-4">
                          <div className="ml-8 space-y-2">
                            <div className="text-sm font-medium text-gray-700 mb-3">Session Details:</div>
                            <div className="space-y-2">
                              {entry.sessionDetails.map((session, idx) => (
                                <div key={session.id} className="flex items-center space-x-4 text-sm p-2 bg-white rounded border border-gray-200">
                                  <Badge size="sm" variant="outline">Session {idx + 1}</Badge>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">In:</span>
                                    <span className="font-mono text-gray-900">{session.punchIn}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">Out:</span>
                                    <span className="font-mono text-gray-900">{session.punchOut}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-mono text-gray-700">{(session.duration / 3600).toFixed(2)}h</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Summary Footer */}
      {!loading && !error && filteredData.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-center">
              <div className="text-sm text-gray-600">
                Showing {filteredData.length} employee{filteredData.length !== 1 ? 's' : ''}
                {startDate && endDate ? ` from ${startDate} to ${endDate}` :
                 startDate ? ` from ${startDate}` :
                 endDate ? ` until ${endDate}` :
                 ''}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
