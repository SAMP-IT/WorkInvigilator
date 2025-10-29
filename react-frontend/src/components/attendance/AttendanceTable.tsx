import React from 'react';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  clockIn: string;
  clockOut: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
  totalHours: number;
  status: string;
  isLate: boolean;
  lateByMinutes: number;
  autoClocked: boolean;
  notes?: string;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export function AttendanceTable({ records, loading, onRefresh }: AttendanceTableProps) {
  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === 'absent') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          Absent
        </span>
      );
    }
    if (isLate) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
          Late
        </span>
      );
    }
    if (status === 'present') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
          Present
        </span>
      );
    }
    if (status === 'half_day') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          Half Day
        </span>
      );
    }
    if (status === 'on_leave') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
          On Leave
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="text-center text-gray-600">Loading attendance records...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="text-center text-gray-600">
          <p className="mb-4">No attendance records found for the selected period.</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Attendance Records ({records.length})
        </h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Clock In
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Clock Out
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Work Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Break/Idle
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Late By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{record.employeeName}</div>
                    <div className="text-sm text-gray-500">{record.employeeEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {new Date(record.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{record.clockIn}</span>
                    {record.autoClocked && (
                      <span className="text-xs text-blue-600 font-medium" title="Auto clocked">
                        AUTO
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900">{record.clockOut}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-blue-600">
                    {record.workHours.toFixed(2)}h
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600">
                    <div>Break: {record.breakHours.toFixed(2)}h</div>
                    <div>Idle: {record.idleHours.toFixed(2)}h</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(record.status, record.isLate)}
                </td>
                <td className="px-4 py-3">
                  {record.isLate ? (
                    <span className="text-yellow-700 font-medium">
                      {record.lateByMinutes} min
                    </span>
                  ) : (
                    <span className="text-green-600">On time</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
