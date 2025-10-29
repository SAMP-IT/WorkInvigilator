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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: '14px' }}>No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="dateLabel"
            style={{ fontSize: '12px', fill: '#64748B' }}
            tick={{ fill: '#64748B' }}
          />
          <YAxis
            yAxisId="left"
            style={{ fontSize: '12px', fill: '#64748B' }}
            tick={{ fill: '#64748B' }}
            label={{ value: 'Productivity %', angle: -90, position: 'insideLeft', fill: '#1E293B' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            style={{ fontSize: '12px', fill: '#64748B' }}
            tick={{ fill: '#64748B' }}
            label={{ value: 'Hours', angle: 90, position: 'insideRight', fill: '#1E293B' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="productivityPercentage"
            name="Productivity %"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10B981' }}
            activeDot={{ r: 6, fill: '#10B981' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalHours"
            name="Total Hours"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3B82F6' }}
            activeDot={{ r: 6, fill: '#3B82F6' }}
          />
          {showActiveEmployees && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeEmployees"
              name="Active Employees"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 4, fill: '#F59E0B' }}
              activeDot={{ r: 6, fill: '#F59E0B' }}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="dateLabel"
            style={{ fontSize: '12px', fill: '#64748B' }}
            tick={{ fill: '#64748B' }}
          />
          <YAxis
            style={{ fontSize: '12px', fill: '#64748B' }}
            tick={{ fill: '#64748B' }}
            label={{ value: 'Productivity %', angle: -90, position: 'insideLeft', fill: '#1E293B' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="rect" />
          <Bar
            dataKey="productivityPercentage"
            name="Productivity %"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
