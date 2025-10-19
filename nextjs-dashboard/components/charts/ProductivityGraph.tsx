'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProductivityData {
  productive: {
    hours: number;
    percentage: number;
  };
  neutral: {
    hours: number;
    percentage: number;
  };
  unproductive: {
    hours: number;
    percentage: number;
  };
}

interface ProductivityGraphProps {
  data: ProductivityData;
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const COLORS = {
  productive: '#10b981', // Green
  neutral: '#f59e0b', // Orange
  unproductive: '#ef4444' // Red
};

const LABELS = {
  productive: 'Productive',
  neutral: 'Neutral',
  unproductive: 'Unproductive'
};

export function ProductivityGraph({ data, showLegend = true, size = 'md' }: ProductivityGraphProps) {
  // Convert data to chart format
  const chartData = [
    {
      name: LABELS.productive,
      value: data.productive.hours,
      percentage: data.productive.percentage,
      color: COLORS.productive
    },
    {
      name: LABELS.neutral,
      value: data.neutral.hours,
      percentage: data.neutral.percentage,
      color: COLORS.neutral
    },
    {
      name: LABELS.unproductive,
      value: data.unproductive.hours,
      percentage: data.unproductive.percentage,
      color: COLORS.unproductive
    }
  ].filter(item => item.value > 0); // Only show non-zero values

  const sizeConfig = {
    sm: { height: 200, innerRadius: 40, outerRadius: 70 },
    md: { height: 300, innerRadius: 60, outerRadius: 100 },
    lg: { height: 400, innerRadius: 80, outerRadius: 130 }
  };

  const config = sizeConfig[size];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-line rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-ink-hi mb-1">{data.name}</p>
          <p className="text-xs text-ink-mid">Time: {data.value.toFixed(2)}h</p>
          <p className="text-xs text-ink-mid">Percentage: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center items-center space-x-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-ink-mid">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-ink-muted">
          <p className="text-sm">No productivity data available</p>
          <p className="text-xs mt-1">Start tracking to see your productivity breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={config.height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={CustomLabel}
          innerRadius={config.innerRadius}
          outerRadius={config.outerRadius}
          fill="#8884d8"
          dataKey="value"
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend content={<CustomLegend />} />}
      </PieChart>
    </ResponsiveContainer>
  );
}
