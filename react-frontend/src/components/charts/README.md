# Chart Components

This directory contains chart components migrated from the Next.js dashboard, optimized for light mode styling and React.

## Components

### 1. ProductivityTrendChart
Displays productivity trends over time with dual Y-axes for percentages and hours.

**Props:**
- `data: TrendData[]` - Array of trend data points
- `type?: 'line' | 'bar'` - Chart type (default: 'line')
- `showActiveEmployees?: boolean` - Show active employees line (default: true)

**Data Structure:**
```typescript
interface TrendData {
  date: string;
  dateLabel: string;
  totalHours: number;
  productivityPercentage: number;
  activeEmployees: number;
}
```

**Usage:**
```tsx
import { ProductivityTrendChart } from '../../components/charts';

<ProductivityTrendChart
  data={trendData}
  type="line"
  showActiveEmployees={true}
/>
```

### 2. ProductivityGraph
A pie/donut chart showing productivity breakdown into productive, neutral, and unproductive categories.

**Props:**
- `data: ProductivityData` - Productivity breakdown data
- `showLegend?: boolean` - Display legend (default: true)
- `size?: 'sm' | 'md' | 'lg'` - Chart size (default: 'md')

**Data Structure:**
```typescript
interface ProductivityData {
  productive: { hours: number; percentage: number; };
  neutral: { hours: number; percentage: number; };
  unproductive: { hours: number; percentage: number; };
}
```

**Usage:**
```tsx
import { ProductivityGraph } from '../../components/charts';

<ProductivityGraph
  data={productivityData}
  showLegend={true}
  size="md"
/>
```

### 3. MonthlyHoursChart
Displays daily work hours, break hours, and net hours for a month.

**Props:**
- `data: DailyHoursData[]` - Array of daily hours data
- `type?: 'line' | 'bar'` - Chart type (default: 'bar')

**Data Structure:**
```typescript
interface DailyHoursData {
  date: string;
  workHours: number;
  breakHours: number;
  netHours: number;
}
```

**Usage:**
```tsx
import { MonthlyHoursChart } from '../../components/charts';

<MonthlyHoursChart
  data={hoursData}
  type="bar"
/>
```

### 4. CumulativeHoursChart
Area chart showing cumulative hours over time with daily hours overlay.

**Props:**
- `data: CumulativeData[]` - Array of cumulative data points

**Data Structure:**
```typescript
interface CumulativeData {
  date: string;
  cumulative: number;
  daily: number;
}
```

**Usage:**
```tsx
import { CumulativeHoursChart } from '../../components/charts';

<CumulativeHoursChart data={cumulativeData} />
```

## Design Specifications

### Color Palette (Light Mode)
- **Primary Blue:** #3B82F6
- **Secondary Blue:** #2D65E6
- **Gradient:** #3B82F6 to #234C90
- **Success/Productive:** #10B981 (green)
- **Warning/Neutral:** #F59E0B (yellow/orange)
- **Danger/Unproductive:** #EF4444 (red)
- **Grid Lines:** #E5E7EB (light gray)
- **Text Primary:** #1E293B (dark slate)
- **Text Secondary:** #64748B (gray)

### Common Features
- White backgrounds (#FFFFFF)
- Light gray grid lines (#E5E7EB)
- Rounded tooltips with shadows
- Responsive container (100% width)
- Standard height: 350px
- Smooth animations
- Empty state handling

## Dependencies
- `recharts@3.3.0` - Chart library (already installed)

## Migration Notes
- Removed 'use client' directives (Next.js specific)
- Replaced className-based styling with inline styles for light mode
- Removed Tailwind CSS class dependencies
- All color values are hardcoded for consistency
- Maintained full TypeScript type safety
- All components are functional components using React hooks pattern

## Best Practices
1. Wrap charts in containers with defined heights
2. Ensure data arrays are not empty before rendering
3. Handle loading and error states in parent components
4. Use appropriate chart types for data visualization needs
5. Consider performance for large datasets (use data sampling if needed)

## Example Integration
```tsx
import React, { useState, useEffect } from 'react';
import {
  ProductivityTrendChart,
  ProductivityGraph,
  MonthlyHoursChart,
  CumulativeHoursChart
} from '../../components/charts';

function Dashboard() {
  const [trendData, setTrendData] = useState([]);
  const [productivityData, setProductivityData] = useState(null);

  // Fetch data...

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h2>Productivity Trends</h2>
        <ProductivityTrendChart data={trendData} type="line" />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px' }}>
        <h2>Productivity Breakdown</h2>
        {productivityData && <ProductivityGraph data={productivityData} />}
      </div>
    </div>
  );
}
```
