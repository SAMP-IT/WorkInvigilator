# Executive Slate Design System

## Overview
A comprehensive design system for the Work Invigilator dashboard, prioritizing dark mode with elegant contrast and professional typography.

## 1. Design Tokens

### Colors (Dark Mode Primary)

```css
/* Core Colors */
--bg: #0B0F14           /* Primary background */
--surface: #11161C      /* Surface elements */
--surface-raised: #141B22 /* Elevated surfaces */
--line: #1F2730         /* Borders (1px) */

/* Text Hierarchy */
--text-hi: #E7EDF3      /* High contrast text */
--text-mid: #AAB4BF     /* Medium contrast text */
--text-muted: #7A8794   /* Muted/subtle text */

/* Brand & Status */
--primary: #3B82F6      /* Primary brand color */
--info: #6366F1         /* Information */
--success: #10B981      /* Success states */
--warn: #F59E0B         /* Warning states */
--danger: #EF4444       /* Error/danger states */
```

### Light Mode Variants
```css
/* Light Mode (mirrors dark) */
--bg-light: #F7F8FA
--surface-light: #FFFFFF
--line-light: #E6E8EB
/* Text colors reversed for light mode */
```

### Typography (Executive Slate Font System)

**Font Families:**
- **UI & Headings**: Public Sans (Variable) - Professional, readable on dark UIs
- **Numbers/IDs**: JetBrains Mono - Crisp tabular digits with slashed zero

**Google Fonts Integration:**
```html
<!-- UI font -->
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
<!-- Numeric/mono -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300..800&display=swap" rel="stylesheet">
```

**CSS Variables:**
```css
:root {
  --font-ui: "Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}
```

**Font Sizes (Tuned for Dark Dashboard):**
- xs: 0.75rem (1.1rem line-height, 0.01em letter-spacing)
- sm: 0.875rem (1.3rem line-height)
- base: 1rem (1.45rem line-height)
- lg: 1.125rem (1.55rem line-height, -0.005em letter-spacing)
- xl: 1.25rem (1.6rem line-height, -0.01em letter-spacing)
- 2xl: 1.5rem (1.8rem line-height, -0.012em letter-spacing)
- 3xl: 1.875rem (2.1rem line-height, -0.015em letter-spacing)

**Typography Hierarchy:**
- **App Title/Page H1**: `font-ui text-2xl tracking-tightish font-semibold`
- **Section Headers**: `font-ui text-lg font-semibold`
- **Body Copy/Table Cells**: `font-ui text-sm`
- **KPIs/Numbers/Durations**: `font-mono` with `.kpi`, `.num`, `.cell-num` classes
- **Sidebar Labels & Chips**: `font-ui text-xs smallcaps`

**Micro-Typography:**
```css
/* Headings refinement */
h1, h2, h3 {
  letter-spacing: -0.012em;
  font-weight: 600;
}
h1 { font-weight: 650; } /* Hero weight */

/* Numeric precision */
.kpi, .num, .axis, .cell-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums slashed-zero lining-nums;
  letter-spacing: 0.01em;
}

/* Small caps labels */
.smallcaps {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  font-size: 0.75rem;
}
```

**Weight Guidelines:**
- **Headings**: 600 weight (H1 can go 650-700 for hero)
- **Body**: 500 weight (Public Sans reads better slightly heavier on dark)
- **Mono**: Keep for all numbers to look engineered
- **Avoid**: All-caps everywhere (reserve for tiny chips/badges only)

### Spacing & Layout

**Border Radius:**
- Small: 8px
- Medium: 12px
- Large: 16px

**Space Scale:**
- 4, 8, 12, 16, 20, 24, 32 (px)

**Shadows:**
```css
/* Card Shadow */
box-shadow: 0 1px 1px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.18);

/* Hover Shadow */
box-shadow: 0 2px 6px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.22);
```

**Focus States:**
```css
outline: 2px solid #60A5FA;
outline-offset: 2px;
```

## 2. Information Architecture

### Global Layout Structure

**Top Bar Components:**
- Product logo + environment badge
- Global search
- Live status pill
- Date range picker (DD/MM/YYYY format)
- User menu

**Left Navigation Rail:**
- Overview (default)
- Employees
- Sessions
- Screenshots
- Reports
- Settings

### Date Presets
- Today
- Last 7 / 14 / 30 / 90 days
- This month
- Custom range (DD/MM/YYYY)

### Page Specifications

#### Overview Page (Default)
**KPI Strip (6 metrics):**
1. Active Sessions (live count)
2. Active Employees (logged in last 10 min)
3. Productivity % (today) = Focus time / Work time
4. Avg Focus Time (h/day, 30d rolling)
5. Avg Session Length (min)
6. Screenshots Today

**Charts & Data Blocks:**
- Focus vs Idle time (30d stacked area chart)
- Team Heatmap (employees × hours, 7×24 grid)
- Live Sessions ticker with join/view links
- Top Variances (biggest ↑/↓ productivity vs last week)
- Recent Screenshots strip with quick preview

#### Employees Page
**Table Columns:**
- Avatar
- Name/Email
- Department
- Role (ADMIN badge)
- Productivity % (7d)
- Avg Focus h/day
- Avg Session (min)
- Last Active (DD/MM/YYYY HH:mm)

**Row Interaction:**
Click → Drawer with trend mini-charts (7/30d), timeline (today), screenshots gallery, CSV export (employee-scoped)

#### Sessions Page
**Filters:** Employee, date range, duration (min), has screenshots
**List View:** Start–End times, Duration, Focus %, App tags, Actions (view timeline)

#### Screenshots Page
**Grid Layout:** 160×90 pixel thumbnails, infinite scroll
**Search:** Employee, app, time-based filtering
**Drawer:** Full view, zoom, metadata, download options

#### Reports Page
**Presets:**
- Weekly Team Summary
- Daily Snapshot
- Top Variance Analysis
- Under-utilization Report
- Overtime Tracking

**Output:** CSV export (org-wide or employee-scoped)

#### Settings Page
- Organization info
- Time zone configuration
- Date format (DD/MM/YYYY locked)
- Data retention settings (UI only)
- API keys (future-proof)
- Audit log

## 3. Motion & Animation

### Interaction Principles
- **Respectful:** Honor `prefers-reduced-motion`
- **Expressive:** Subtle elevation and movement
- **Purposeful:** Animations enhance understanding

### Specific Animations
```css
/* Card Hover */
.card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
  transition: all 0.2s ease-out;
}

/* KPI Count-up */
.kpi-value {
  animation: countUp 0.8s ease-out;
}

/* Heatmap Cell Ripple */
.heatmap-cell:hover {
  animation: ripple 0.3s ease-out;
}

/* Timeline Scrubbing */
.timeline {
  scroll-behavior: smooth;
  /* Inertial scrolling for timeline navigation */
}
```

## 4. Component Specifications

### KPI Tile Component
```typescript
type KpiTileProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  delta?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
  onClick?: () => void;
  loading?: boolean;
};
```

### Table Patterns
- Sticky header
- Resizable columns
- Saved views
- Server-side filters/sort
- Bulk actions bar (appears on selection)
- Export CSV functionality

### Timeline Component
**Segments:**
- Focus (primary color)
- Idle (#7A8794)
- Break (#374151)
- Meeting (#6366F1)

### Chart Library Integration
- **Primary:** Recharts for line/area/bar charts
- **Heatmap:** ECharts (embedded for heatmap card only)

## 5. Data Definitions

### Core Entities
```typescript
type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'USER' | 'ADMIN';
  lastActive: Date;
  metrics: {
    productivity7d: number;
    avgFocusHDay: number;
    avgSessionMin: number;
  };
};

type Session = {
  id: string;
  employeeId: string;
  start: Date;
  end: Date;
  durationMin: number;
  focusPercent: number;
  apps: string[];
};

type Screenshot = {
  id: string;
  employeeId: string;
  sessionId: string;
  takenAt: Date;
  url: string;
  size: number;
};
```

### Aggregates
Served by time range: today/7d/30d/90d

## 6. Copy Style Guide

### Voice & Tone
- **Sentence case** for all text
- **Direct and concise:** "Monitor ongoing activity and join live view"
- **Professional yet approachable**

### Formatting Standards
- **Units everywhere:** %, hrs, min
- **Dates:** DD/MM/YYYY format (locked)
- **Time:** HH:mm (24-hour format)
- **Numbers:** Localized formatting with appropriate precision

### Content Patterns
- Action buttons: Verb + Object ("Export CSV", "View Timeline")
- Status indicators: Clear state communication
- Error messages: Solution-oriented

## 7. Implementation Checklist

### Phase 1: Foundation
- [ ] Tailwind theme configuration (Executive Slate)
- [ ] Typography setup (Geist Sans, IBM Plex Mono)
- [ ] Color token implementation
- [ ] Motion/animation utilities

### Phase 2: Core Components
- [ ] KPI Tile component
- [ ] Card component with hover states
- [ ] Filters Bar component
- [ ] Employee Table component
- [ ] Heatmap component
- [ ] Timeline component

### Phase 3: Layout & Pages
- [ ] Global layout with top bar
- [ ] Left navigation rail
- [ ] Overview page (hi-fi dark mode)
- [ ] Employees page with drawer
- [ ] CSV export hooks (useCsvExport)

### Phase 4: Polish
- [ ] Motion specifications implementation
- [ ] Responsive design validation
- [ ] Accessibility compliance
- [ ] Performance optimization

## 8. Technical Notes

### Tailwind Configuration
Extend default theme with Executive Slate tokens, custom shadows, and typography scales.

### Component Architecture
- Atomic design principles
- TypeScript for all components
- Consistent prop patterns
- Accessible by default

### Performance Considerations
- Lazy loading for large datasets
- Virtualization for long lists
- Optimized chart rendering
- Efficient CSV generation

---

*This design system serves as the single source of truth for the Work Invigilator dashboard interface. All components and pages should conform to these specifications.*