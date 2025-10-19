'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailyHoursData {
  date: string;
  workHours: number;
  breakHours: number;
  netHours: number;
}

interface MonthlyHoursChartProps {
  data: DailyHoursData[];
  type?: 'line' | 'bar';
}

export function MonthlyHoursChart({ data, type = 'bar' }: MonthlyHoursChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-line rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-ink-hi mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}h
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  };

  const commonElements = (
    <>
      <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
      <XAxis
        dataKey="date"
        className="text-xs text-ink-muted"
        tick={{ fill: 'currentColor' }}
      />
      <YAxis
        className="text-xs text-ink-muted"
        tick={{ fill: 'currentColor' }}
        label={{ value: 'Hours', angle: -90, position: 'insideLeft', className: 'text-ink-muted' }}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend
        wrapperStyle={{ paddingTop: '10px' }}
        iconType="circle"
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === 'line' ? (
        <LineChart {...chartProps}>
          {commonElements}
          <Line
            type="monotone"
            dataKey="workHours"
            name="Work Hours"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="breakHours"
            name="Break Hours"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="netHours"
            name="Net Hours"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      ) : (
        <BarChart {...chartProps}>
          {commonElements}
          <Bar dataKey="workHours" name="Work Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="breakHours" name="Break Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="netHours" name="Net Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
