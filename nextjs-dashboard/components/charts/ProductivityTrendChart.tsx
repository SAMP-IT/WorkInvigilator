'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendData {
  date: string;
  dateLabel: string;
  totalHours: number;
  productivityPercentage: number;
  activeEmployees: number;
}

interface ProductivityTrendChartProps {
  data: TrendData[];
  type?: 'line' | 'bar';
  showActiveEmployees?: boolean;
}

export function ProductivityTrendChart({ data, type = 'line', showActiveEmployees = true }: ProductivityTrendChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-line rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-ink-hi mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('%') ? `${entry.value}%` : `${entry.value}${entry.name.includes('Hours') ? 'h' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-ink-muted">
          <p className="text-sm">No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
          <XAxis
            dataKey="dateLabel"
            className="text-xs text-ink-muted"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-ink-muted"
            tick={{ fill: 'currentColor' }}
            label={{ value: 'Productivity %', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-ink-muted"
            tick={{ fill: 'currentColor' }}
            label={{ value: 'Hours', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="productivityPercentage"
            name="Productivity %"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalHours"
            name="Total Hours"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {showActiveEmployees && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeEmployees"
              name="Active Employees"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
          <XAxis
            dataKey="dateLabel"
            className="text-xs text-ink-muted"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs text-ink-muted"
            tick={{ fill: 'currentColor' }}
            label={{ value: 'Productivity %', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="rect" />
          <Bar
            dataKey="productivityPercentage"
            name="Productivity %"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
