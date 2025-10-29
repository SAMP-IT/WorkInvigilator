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
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '12px', color: entry.color, marginBottom: '4px' }}>
              {entry.name}: {entry.value.toFixed(2)}h
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: '14px' }}>No cumulative data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#234C90" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="date"
          style={{ fontSize: '12px', fill: '#64748B' }}
          tick={{ fill: '#64748B' }}
        />
        <YAxis
          style={{ fontSize: '12px', fill: '#64748B' }}
          tick={{ fill: '#64748B' }}
          label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#1E293B' }}
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
          stroke="#3B82F6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCumulative)"
        />
        <Area
          type="monotone"
          dataKey="daily"
          name="Daily Hours"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorDaily)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
