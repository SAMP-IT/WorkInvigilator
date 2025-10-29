import React, { useMemo } from 'react';

interface AttendanceRecord {
  date: string;
  status: string;
  isLate: boolean;
  workHours: number;
  clockIn: string;
  clockOut: string;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  selectedMonth: Date;
  onDateClick?: (date: string) => void;
  selectedDate?: string | null;
}

export function AttendanceCalendar({
  records,
  selectedMonth,
  onDateClick,
  selectedDate
}: AttendanceCalendarProps) {
  const calendarData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Create calendar grid
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const record = records.find(r => r.date === dateStr);

      days.push({
        day,
        date: dateStr,
        record
      });
    }

    return days;
  }, [selectedMonth, records]);

  const getStatusColor = (record?: AttendanceRecord) => {
    if (!record) return 'bg-gray-50 border-gray-200';

    if (record.status === 'absent') return 'bg-red-50 border-red-300';
    if (record.isLate) return 'bg-yellow-50 border-yellow-300';
    if (record.status === 'present') return 'bg-green-50 border-green-300';
    if (record.status === 'half_day') return 'bg-blue-50 border-blue-300';
    if (record.status === 'on_leave') return 'bg-purple-50 border-purple-300';

    return 'bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (record?: AttendanceRecord) => {
    if (!record) return null;

    if (record.status === 'absent') return 'X';
    if (record.isLate) return 'L';
    if (record.status === 'present') return 'P';
    if (record.status === 'half_day') return 'H';
    if (record.status === 'on_leave') return 'V';

    return '•';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span className="text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
          <span className="text-gray-600">Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
          <span className="text-gray-600">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
          <span className="text-gray-600">Half Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-50 border border-purple-300 rounded"></div>
          <span className="text-gray-600">On Leave</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center font-semibold text-gray-600 text-sm py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.map((item, index) => {
          if (!item) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const { day, date, record } = item;
          const isToday = new Date().toISOString().split('T')[0] === date;
          const isSelected = selectedDate === date;

          return (
            <div
              key={date}
              onClick={() => onDateClick?.(date)}
              className={`
                aspect-square border-2 rounded-lg p-2 cursor-pointer
                hover:shadow-md transition-all
                ${getStatusColor(record)}
                ${isToday ? 'ring-2 ring-blue-400' : ''}
                ${isSelected ? 'ring-4 ring-blue-600 shadow-lg scale-105' : ''}
              `}
            >
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {day}
                </div>
                {record && (
                  <>
                    <div className="text-2xl text-gray-700">
                      {getStatusIcon(record)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {record.workHours > 0 ? `${record.workHours.toFixed(1)}h` : '-'}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
