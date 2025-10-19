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
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Late Arrivals',
      value: stats.totalLate,
      icon: 'L',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      label: 'Absent',
      value: stats.totalAbsent,
      icon: 'A',
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    {
      label: 'Avg Work Hours',
      value: `${stats.averageWorkHours}h`,
      icon: 'H',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Avg Arrival Time',
      value: stats.averageArrivalTime,
      icon: 'T',
      color: 'text-ink-hi',
      bgColor: 'bg-raised'
    },
    {
      label: 'On-Time Rate',
      value: `${stats.onTimePercentage}%`,
      icon: '%',
      color: stats.onTimePercentage >= 90 ? 'text-success' : stats.onTimePercentage >= 75 ? 'text-warning' : 'text-error',
      bgColor: stats.onTimePercentage >= 90 ? 'bg-success/10' : stats.onTimePercentage >= 75 ? 'bg-warning/10' : 'bg-error/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-surface rounded-lg border border-line p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl ${stat.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
              {stat.icon}
            </span>
          </div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
            {stat.value}
          </div>
          <div className="text-sm text-ink-mid">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
