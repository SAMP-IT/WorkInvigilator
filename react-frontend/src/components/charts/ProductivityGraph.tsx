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
  productive: '#10B981', // Green
  neutral: '#F59E0B', // Yellow/Orange
  unproductive: '#EF4444' // Red
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
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '4px' }}>
            {data.name}
          </p>
          <p style={{ fontSize: '12px', color: '#64748B' }}>
            Time: {data.value.toFixed(2)}h
          </p>
          <p style={{ fontSize: '12px', color: '#64748B' }}>
            Percentage: {data.percentage.toFixed(1)}%
          </p>
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
        style={{ fontSize: '12px', fontWeight: 600 }}
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        marginTop: '16px'
      }}>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: entry.color
              }}
            />
            <span style={{ fontSize: '14px', color: '#64748B' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: '14px' }}>No productivity data available</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Start tracking to see your productivity breakdown</p>
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
