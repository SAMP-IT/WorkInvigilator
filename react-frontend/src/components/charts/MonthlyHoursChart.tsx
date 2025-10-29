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

  const chartProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  };

  const commonElements = (
    <>
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
    </>
  );

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: '14px' }}>No hours data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === 'line' ? (
        <LineChart {...chartProps}>
          {commonElements}
          <Line
            type="monotone"
            dataKey="workHours"
            name="Work Hours"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3B82F6' }}
            activeDot={{ r: 6, fill: '#3B82F6' }}
          />
          <Line
            type="monotone"
            dataKey="breakHours"
            name="Break Hours"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 4, fill: '#F59E0B' }}
            activeDot={{ r: 6, fill: '#F59E0B' }}
          />
          <Line
            type="monotone"
            dataKey="netHours"
            name="Net Hours"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10B981' }}
            activeDot={{ r: 6, fill: '#10B981' }}
          />
        </LineChart>
      ) : (
        <BarChart {...chartProps}>
          {commonElements}
          <Bar dataKey="workHours" name="Work Hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="breakHours" name="Break Hours" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          <Bar dataKey="netHours" name="Net Hours" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
