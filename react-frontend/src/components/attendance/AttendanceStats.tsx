import React from 'react';

interface AttendanceStatsProps {
  stats: {
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    averageWorkHours: number;
    averageArrivalTime: string;
    onTimePercentage: number;
  };
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  const statCards = [
    {
      label: 'Total Present',
      value: stats.totalPresent,
      icon: 'P',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      iconBg: 'bg-green-200'
    },
    {
      label: 'Late Arrivals',
      value: stats.totalLate,
      icon: 'L',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      iconBg: 'bg-yellow-200'
    },
    {
      label: 'Absent',
      value: stats.totalAbsent,
      icon: 'A',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      iconBg: 'bg-red-200'
    },
    {
      label: 'Avg Work Hours',
      value: `${stats.averageWorkHours}h`,
      icon: 'H',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      iconBg: 'bg-blue-200'
    },
    {
      label: 'Avg Arrival Time',
      value: stats.averageArrivalTime,
      icon: 'T',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      iconBg: 'bg-gray-200'
    },
    {
      label: 'On-Time Rate',
      value: `${stats.onTimePercentage}%`,
      icon: '%',
      color: stats.onTimePercentage >= 90
        ? 'text-green-700'
        : stats.onTimePercentage >= 75
        ? 'text-yellow-700'
        : 'text-red-700',
      bgColor: stats.onTimePercentage >= 90
        ? 'bg-green-100'
        : stats.onTimePercentage >= 75
        ? 'bg-yellow-100'
        : 'bg-red-100',
      iconBg: stats.onTimePercentage >= 90
        ? 'bg-green-200'
        : stats.onTimePercentage >= 75
        ? 'bg-yellow-200'
        : 'bg-red-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-lg font-semibold ${stat.iconBg} ${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
              {stat.icon}
            </span>
          </div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-600">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
