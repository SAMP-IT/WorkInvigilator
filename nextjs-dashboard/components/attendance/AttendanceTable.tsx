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
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-error/20 text-error">Absent</span>;
    }
    if (isLate) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/20 text-warning">Late</span>;
    }
    if (status === 'present') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success">Present</span>;
    }
    if (status === 'half_day') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-500">Half Day</span>;
    }
    if (status === 'on_leave') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-500">On Leave</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-raised text-ink-mid">{status}</span>;
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-line p-8">
        <div className="text-center text-ink-mid">Loading attendance records...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-surface rounded-lg border border-line p-8">
        <div className="text-center text-ink-mid">
          <p className="mb-4">No attendance records found for the selected period.</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-line overflow-hidden">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-hi">
          Attendance Records ({records.length})
        </h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-raised hover:bg-raised/80 text-ink-hi rounded-lg"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-raised">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Clock In
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Clock Out
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Work Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Break/Idle
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-mid uppercase tracking-wider">
                Late By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-raised/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-ink-hi">{record.employeeName}</div>
                    <div className="text-sm text-ink-mid">{record.employeeEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-hi">
                  {new Date(record.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-hi">{record.clockIn}</span>
                    {record.autoClocked && (
                      <span className="text-xs text-primary" title="Auto clocked">AUTO</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-hi">{record.clockOut}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-primary">
                    {record.workHours.toFixed(2)}h
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-ink-mid">
                    <div>Break: {record.breakHours.toFixed(2)}h</div>
                    <div>Idle: {record.idleHours.toFixed(2)}h</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(record.status, record.isLate)}
                </td>
                <td className="px-4 py-3">
                  {record.isLate ? (
                    <span className="text-warning font-medium">
                      {record.lateByMinutes} min
                    </span>
                  ) : (
                    <span className="text-success">On time</span>
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
