'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CumulativeData {
  date: string;
  cumulative: number;
  daily: number;
}

interface CumulativeHoursChartProps {
  data: CumulativeData[];
}

export function CumulativeHoursChart({ data }: CumulativeHoursChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Cumulative Hours"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCumulative)"
        />
        <Area
          type="monotone"
          dataKey="daily"
          name="Daily Hours"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorDaily)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
