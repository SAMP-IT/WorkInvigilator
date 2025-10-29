# Work Invigilator - Complete Next.js Dashboard UI Documentation
## Comprehensive Recreation Guide for React.js

**Generated:** October 28, 2025
**Version:** 2.0.0
**Purpose:** Complete documentation for recreating the entire UI in React.js

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design System & Theming](#2-design-system--theming)
3. [Core UI Components](#3-core-ui-components)
4. [Layout Components](#4-layout-components)
5. [Page-by-Page Documentation](#5-page-by-page-documentation)
6. [Charts & Data Visualization](#6-charts--data-visualization)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Forms & Validation](#8-forms--validation)
9. [WebRTC Live Monitoring](#9-webrtc-live-monitoring)
10. [API Integration Patterns](#10-api-integration-patterns)
11. [Responsive Design](#11-responsive-design)
12. [Animations & Interactions](#12-animations--interactions)
13. [Component Hierarchy](#13-component-hierarchy)

---

## 1. Project Overview

### 1.1 Technology Stack

```json
{
  "framework": "Next.js 15.5.3",
  "react": "19.1.0",
  "styling": "Tailwind CSS 4.0",
  "ui_library": "Custom components",
  "charts": "Recharts 3.2.1",
  "auth": "Supabase Auth",
  "realtime": "Supabase Realtime",
  "webrtc": "simple-peer 9.11.1",
  "state": "React Context API"
}
```

### 1.2 Application Structure

```
nextjs-dashboard/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Overview/Dashboard (Home)
│   ├── login/page.tsx            # Login screen
│   ├── dashboard/page.tsx        # Dashboard hub
│   ├── overview/page.tsx         # System overview
│   ├── live-monitoring/page.tsx  # WebRTC live monitoring
│   ├── employees/page.tsx        # Employee management
│   ├── employee-report/page.tsx  # Employee detailed reports
│   ├── attendance/page.tsx       # Attendance tracking
│   ├── attendance-calendar/page.tsx # Calendar view
│   ├── sessions/page.tsx         # Active sessions
│   ├── timesheet/page.tsx        # Timesheet management
│   ├── monthly-hours/page.tsx    # Monthly hours summary
│   ├── productivity/page.tsx     # Productivity metrics
│   ├── productivity-breakdown/page.tsx
│   ├── productivity-reports/page.tsx
│   ├── screenshots/page.tsx      # Screenshot viewer
│   ├── audio/page.tsx            # Audio recordings
│   ├── breaks/page.tsx           # Break management
│   ├── mute-events/page.tsx      # Mute event logs
│   ├── reports/page.tsx          # General reports
│   ├── settings/page.tsx         # Admin settings
│   ├── unauthorized/page.tsx     # Access denied
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   ├── Avatar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── KpiTile.tsx
│   │   ├── KpiIcon.tsx
│   │   ├── NavIcon.tsx
│   │   ├── ProductivityBreakdown.tsx
│   │   └── ProductivityLeaderboard.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   │
│   ├── charts/                   # Chart components
│   │   ├── ProductivityTrendChart.tsx
│   │   ├── ProductivityGraph.tsx
│   │   ├── MonthlyHoursChart.tsx
│   │   └── CumulativeHoursChart.tsx
│   │
│   ├── auth/                     # Auth components
│   │   └── AuthGuard.tsx
│   │
│   └── forms/                    # Form components
│       └── AddEmployeeForm.tsx
│
└── lib/                          # Utilities and helpers
    ├── auth-context.tsx          # Authentication context
    ├── supabase.ts               # Supabase client
    ├── utils.ts                  # Utility functions
    └── ...
```

---

## 2. Design System & Theming

### 2.1 Executive Slate Design System

The application uses a custom design system called **"Executive Slate"** with a dark-first approach.

#### 2.1.1 Color Palette

```css
/* Dark Mode (Primary) */
--bg: #0B0F14;              /* Main background */
--surface: #11161C;          /* Card/surface background */
--surface-raised: #141B22;   /* Elevated surfaces */
--line: #1F2730;             /* Borders and dividers */

/* Text Hierarchy */
--text-hi: #E7EDF3;          /* High emphasis text */
--text-mid: #AAB4BF;         /* Medium emphasis text */
--text-muted: #7A8794;       /* Muted/secondary text */

/* Brand & Status Colors */
--primary: #3B82F6;          /* Primary blue */
--info: #6366F1;             /* Info indigo */
--success: #10B981;          /* Success green */
--warn: #F59E0B;             /* Warning amber */
--danger: #EF4444;           /* Danger red */

/* Light Mode Variants (for reference) */
--bg-light: #F7F8FA;
--surface-light: #FFFFFF;
--line-light: #E6E8EB;
--text-hi-light: #0B0F14;
--text-mid-light: #374151;
--text-muted-light: #6B7280;
```

#### 2.1.2 Typography

**Fonts:**
- **UI Font:** [Public Sans](https://fonts.google.com/specimen/Public+Sans) - System UI font for general text
- **Mono/Numeric Font:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) - For KPIs, numbers, code

**Font Configuration:**
```css
/* Font Families */
--font-ui: "Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

/* Font Sizes (Tailwind Config) */
xs: 0.75rem (12px) - line-height: 1.1rem, letter-spacing: 0.01em
sm: 0.875rem (14px) - line-height: 1.3rem
base: 1rem (16px) - line-height: 1.45rem
lg: 1.125rem (18px) - line-height: 1.55rem, letter-spacing: -0.005em
xl: 1.25rem (20px) - line-height: 1.6rem, letter-spacing: -0.01em
2xl: 1.5rem (24px) - line-height: 1.8rem, letter-spacing: -0.012em
3xl: 1.875rem (30px) - line-height: 2.1rem, letter-spacing: -0.015em
4xl: 2rem (32px) - line-height: 2.5rem
5xl: 2.5rem (40px) - line-height: 1
6xl: 3.5rem (56px) - line-height: 1
```

**Typography Rules:**
```css
/* Base body styles */
body {
  font-family: var(--font-ui);
  font-weight: 500;      /* Slightly heavier for dark backgrounds */
  font-size: 14px;
  line-height: 1.45;
}

/* Headings */
h1, h2, h3 {
  letter-spacing: -0.012em;
  font-weight: 600;
}

h1 {
  font-weight: 650;      /* Hero weight */
}

/* Numeric typography (KPIs, metrics) */
.kpi, .num, .axis, .cell-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums slashed-zero lining-nums;
  letter-spacing: 0.01em;
}

/* Small caps for labels */
.smallcaps {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  font-size: 0.75rem;
}
```

#### 2.1.3 Spacing System

```javascript
// Tailwind spacing (4px base unit)
{
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px'
}
```

#### 2.1.4 Border Radius

```javascript
{
  'md': '12px',   // Cards, buttons
  'lg': '16px'    // Modals, large containers
}
```

#### 2.1.5 Shadows

```css
/* Card shadows */
--shadow-card: 0 1px 1px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.18);
--shadow-hover: 0 2px 6px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.22);
--shadow-focus: 0 0 0 2px #60A5FA;
```

#### 2.1.6 Animations

**Keyframe Definitions:**
```css
@keyframes countUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(-1px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ripple {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(1.1);
    opacity: 0.8;
  }
}
```

**Animation Classes:**
```css
.animate-count-up { animation: countUp 0.8s ease-out; }
.animate-ripple { animation: ripple 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.2s ease-out; }
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
```

#### 2.1.7 Custom Scrollbars

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--surface);
}

::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

---

## 3. Core UI Components

### 3.1 Button Component

**File:** `components/ui/Button.tsx`

**Props Interface:**
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}
```

**Variants:**

1. **Primary** (default)
   - Background: `bg-primary` (#3B82F6)
   - Text: `text-white`
   - Hover: `hover:bg-blue-600`
   - Active: `active:bg-blue-700`

2. **Secondary**
   - Background: `bg-surface` (#11161C)
   - Text: `text-ink-hi` (#E7EDF3)
   - Border: `border border-line` (#1F2730)
   - Hover: `hover:bg-raised` (#141B22)

3. **Outline**
   - Background: transparent
   - Border: `border border-line`
   - Text: `text-ink-hi`
   - Hover: `hover:bg-surface`

4. **Ghost**
   - Background: transparent
   - Text: `text-ink-hi`
   - Hover: `hover:bg-surface`

5. **Danger**
   - Background: `bg-danger` (#EF4444)
   - Text: `text-white`
   - Hover: `hover:bg-red-600`
   - Active: `active:bg-red-700`

**Sizes:**
```css
sm: px-3 py-1.5 text-sm       /* 12px 6px, 14px font */
md: px-4 py-2 text-sm         /* 16px 8px, 14px font */
lg: px-6 py-3 text-base       /* 24px 12px, 16px font */
```

**Base Classes:**
```
inline-flex items-center justify-center rounded-lg font-medium
transition-all duration-200 focus-ring
disabled:opacity-50 disabled:cursor-not-allowed
```

**Loading State:**
- Shows spinning SVG icon
- Adds `pointer-events-none` class
- Icon: 24x24 spinning circle with partial stroke

**Usage Examples:**
```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="danger" size="sm" loading={isDeleting}>
  Delete
</Button>

<Button variant="ghost" onClick={handleCancel}>
  Cancel
</Button>
```

---

### 3.2 Card Component

**File:** `components/ui/Card.tsx`

**Components:** `Card`, `CardHeader`, `CardTitle`, `CardContent`

#### 3.2.1 Card (Main Container)

**Props:**
```typescript
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;        // Enable hover effect
  elevated?: boolean;     // Use raised background
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

**Base Styles:**
```
rounded-lg border border-line shadow-card
```

**Background:**
- Default: `bg-surface` (#11161C)
- Elevated: `bg-raised` (#141B22)

**Padding Options:**
```css
none: ''
sm: p-4     /* 16px */
md: p-6     /* 24px - default */
lg: p-8     /* 32px */
```

**Hover Effect (when hover=true):**
```css
.card-hover:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
  cursor: pointer;
}
```

#### 3.2.2 CardHeader

**Props:**
```typescript
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
mb-4
```

#### 3.2.3 CardTitle

**Props:**
```typescript
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
font-ui text-lg font-semibold text-ink-hi
```

#### 3.2.4 CardContent

**Props:**
```typescript
interface CardContentProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
font-ui text-sm text-ink-mid
```

**Usage Example:**
```jsx
<Card hover elevated padding="md">
  <CardHeader>
    <CardTitle>Employee Performance</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content goes here...</p>
  </CardContent>
</Card>
```

---

### 3.3 Badge Component

**File:** `components/ui/Badge.tsx`

**Props:**
```typescript
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}
```

**Variants:**

1. **Default**
   - Background: `bg-surface` (#11161C)
   - Text: `text-ink-mid` (#AAB4BF)
   - Border: `border border-line` (#1F2730)

2. **Primary**
   - Background: `bg-primary/10` (rgba(59, 130, 246, 0.1))
   - Text: `text-primary` (#3B82F6)
   - Border: `border border-primary/20`

3. **Success**
   - Background: `bg-success/10` (rgba(16, 185, 129, 0.1))
   - Text: `text-success` (#10B981)
   - Border: `border border-success/20`

4. **Warning**
   - Background: `bg-warn/10` (rgba(245, 158, 11, 0.1))
   - Text: `text-warn` (#F59E0B)
   - Border: `border border-warn/20`

5. **Danger**
   - Background: `bg-danger/10` (rgba(239, 68, 68, 0.1))
   - Text: `text-danger` (#EF4444)
   - Border: `border border-danger/20`

6. **Info**
   - Background: `bg-info/10` (rgba(99, 102, 241, 0.1))
   - Text: `text-info` (#6366F1)
   - Border: `border border-info/20`

7. **Outline**
   - Background: transparent
   - Text: `text-ink-mid`
   - Border: `border border-line`

**Sizes:**
```css
sm: px-2 py-0.5 text-xs     /* 8px 2px, 12px font */
md: px-3 py-1 text-sm       /* 12px 4px, 14px font */
```

**Base Classes:**
```
inline-flex items-center rounded-full font-medium
```

**Clickable Badge:**
- Renders as `<button>` when `onClick` provided
- Adds `cursor-pointer hover:opacity-80 transition-opacity`

**Usage Examples:**
```jsx
<Badge variant="success" size="sm">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Offline</Badge>
<Badge variant="outline" onClick={handleClick}>View Details</Badge>
```

---

### 3.4 Modal Component

**File:** `components/ui/Modal.tsx`

**Components:** `Modal`, `ModalFooter`

#### 3.4.1 Modal (Main Component)

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}
```

**Size Options:**
```css
sm: max-w-md       /* 448px */
md: max-w-lg       /* 512px - default */
lg: max-w-2xl      /* 672px */
xl: max-w-4xl      /* 896px */
```

**Structure:**
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

  {/* Modal Container */}
  <div className="relative w-full mx-4 bg-surface border border-line rounded-lg shadow-hover animate-fade-in">
    {/* Header (if title or showCloseButton) */}
    <div className="flex items-center justify-between p-6 border-b border-line">
      <h2 className="text-lg font-semibold text-ink-hi">{title}</h2>
      <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
    </div>

    {/* Content */}
    <div className="p-6">
      {children}
    </div>
  </div>
</div>
```

**Features:**
- **Escape Key:** Closes modal on ESC key press
- **Body Scroll Lock:** Prevents background scrolling when open
- **Click Outside:** Clicking backdrop closes modal
- **Focus Trap:** (Should be implemented for accessibility)

#### 3.4.2 ModalFooter

**Props:**
```typescript
interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
flex items-center justify-end space-x-3 pt-4 border-t border-line
```

**Usage Example:**
```jsx
<Modal isOpen={showModal} onClose={closeModal} title="Confirm Delete" size="md">
  <p>Are you sure you want to delete this employee?</p>

  <ModalFooter>
    <Button variant="outline" onClick={closeModal}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

---

### 3.5 Input Component

**File:** `components/ui/Input.tsx`

**Props:**
```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
```

**Base Styles:**
```
flex h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink-hi
placeholder:text-ink-muted
focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg
disabled:cursor-not-allowed disabled:opacity-50
```

**Border States:**
- Default: `border-line` (#1F2730)
- Focus: `focus:border-primary` (#3B82F6)
- Error: `border-danger` (#EF4444), `focus:ring-danger`

**Special Input Types:**

**Date Picker:**
```css
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);  /* Makes calendar icon visible on dark bg */
}
```

**Usage Examples:**
```jsx
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<Input
  type="password"
  placeholder="Password"
  error={hasError}
/>

<Input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
/>
```

---

### 3.6 Table Components

**File:** `components/ui/Table.tsx`

**Components:** `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

#### 3.6.1 Table (Root Container)

**Props:**
```typescript
interface TableProps {
  children: ReactNode;
  className?: string;
}
```

**Structure:**
```jsx
<div className="relative overflow-hidden rounded-lg border border-line">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      {children}
    </table>
  </div>
</div>
```

#### 3.6.2 TableHeader

**Props:**
```typescript
interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
bg-surface border-b border-line sticky top-0 z-10
```

#### 3.6.3 TableBody

**Props:**
```typescript
interface TableBodyProps {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
bg-surface
```

#### 3.6.4 TableRow

**Props:**
```typescript
interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}
```

**Default Styles:**
```
border-b border-line transition-colors hover:bg-raised
```

**States:**
- Clickable: `cursor-pointer` (when onClick provided)
- Selected: `bg-primary/5 border-primary/20`

#### 3.6.5 TableHead

**Props:**
```typescript
interface TableHeadProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}
```

**Default Styles:**
```
px-4 py-3 text-left font-medium text-ink-mid text-xs uppercase tracking-wider
```

**Sortable Column:**
```jsx
<div className="flex items-center space-x-1">
  <span className="font-ui text-xs smallcaps">{children}</span>
  {sortable && (
    <span className="font-mono text-ink-muted">
      {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '▲▼'}
    </span>
  )}
</div>
```

- When sortable: `cursor-pointer hover:text-ink-hi select-none`

#### 3.6.6 TableCell

**Props:**
```typescript
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
}
```

**Default Styles:**
```
px-4 py-3 font-ui text-sm text-ink-hi
```

**Usage Example:**
```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead sortable sorted="asc" onSort={handleSort}>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Department</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {employees.map(emp => (
      <TableRow key={emp.id} onClick={() => viewEmployee(emp.id)}>
        <TableCell>{emp.name}</TableCell>
        <TableCell>{emp.email}</TableCell>
        <TableCell>{emp.department}</TableCell>
        <TableCell>
          <Badge variant={emp.status === 'online' ? 'success' : 'default'}>
            {emp.status}
          </Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 3.7 Avatar Component

**File:** `components/ui/Avatar.tsx`

**Props:**
```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;      // Name for initials
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  status?: 'online' | 'offline' | 'away';
}
```

**Sizes:**
```css
sm: w-8 h-8 text-xs      /* 32px, 12px font */
md: w-10 h-10 text-sm    /* 40px, 14px font - default */
lg: w-12 h-12 text-base  /* 48px, 16px font */
```

**Base Styles:**
```
rounded-full flex items-center justify-center font-medium overflow-hidden
bg-primary/20 text-primary border border-primary/30
```

**Status Indicator:**
```
absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface
```

**Status Colors:**
- Online: `bg-success` (#10B981)
- Offline: `bg-gray-400`
- Away: `bg-warn` (#F59E0B)

**Initials Logic:**
```javascript
const getInitials = (name?: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
```

**Usage Examples:**
```jsx
<Avatar
  src="/path/to/image.jpg"
  alt="John Doe"
  size="md"
  status="online"
/>

<Avatar
  fallback="John Doe"
  size="lg"
  status="away"
/>
```

---

### 3.8 Loading Spinner Components

**File:** `components/ui/LoadingSpinner.tsx`

#### 3.8.1 LoadingSpinner (Full Screen)

**Structure:**
```jsx
<div className="flex items-center justify-center min-h-screen bg-background">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <p className="mt-4 text-ink-muted">Loading...</p>
  </div>
</div>
```

**Dimensions:**
- Spinner: 48x48px (h-12 w-12)
- Border: 2px bottom border
- Color: Primary blue (#3B82F6)

#### 3.8.2 PageLoadingSpinner (Inline)

**Structure:**
```jsx
<div className="flex items-center justify-center p-12">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <p className="mt-3 text-sm text-ink-muted">Loading...</p>
  </div>
</div>
```

**Dimensions:**
- Spinner: 32x32px (h-8 w-8)
- Padding: 48px (p-12)

#### 3.8.3 TableLoadingSkeleton

**Structure:**
```jsx
<div className="space-y-4 animate-pulse">
  <div className="h-10 bg-surface-hover rounded"></div>
  {[...Array(5)].map((_, i) => (
    <div key={i} className="h-16 bg-surface-hover rounded"></div>
  ))}
</div>
```

**Usage:**
- Shows 1 header row (40px height)
- Shows 5 content rows (64px height each)
- Uses pulse animation

---

### 3.9 KpiTile Component

**File:** `components/ui/KpiTile.tsx`

**Props:**
```typescript
interface KpiTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  delta?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
  onClick?: () => void;
  loading?: boolean;
}
```

**Structure:**
```jsx
<div className="kpi-tile group cursor-pointer">
  {/* Header Row */}
  <div className="flex items-start justify-between mb-3">
    <div className="font-ui text-xs smallcaps text-ink-muted">
      {label}
    </div>
    <div className="text-ink-muted">
      {icon}
    </div>
  </div>

  {/* Value and Delta */}
  <div className="flex items-end justify-between">
    <div className="flex flex-col">
      {/* Main Value */}
      <div className="kpi font-mono text-xl font-semibold text-ink-hi animate-count-up">
        {formatValue(value)}
      </div>

      {/* Delta (if provided) */}
      {delta && (
        <div className="flex items-center text-xs mt-1">
          <span className="mr-1">{getDeltaIcon(delta.direction)}</span>
          <span>{Math.abs(delta.value)}%</span>
        </div>
      )}
    </div>
  </div>
</div>
```

**KPI Tile Styles (from globals.css):**
```css
.kpi-tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease-out;
}

.kpi-tile:hover {
  background: var(--surface-raised);
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}
```

**Delta Colors:**
- Up: `text-green-400`
- Down: `text-red-400`
- Flat: `text-gray-400`

**Delta Icons:**
- Up: `▲`
- Down: `▼`
- Flat: `—`

**Value Formatting:**
```javascript
const formatValue = (val: string | number) => {
  if (typeof val === 'number') {
    return val.toLocaleString();  // Adds thousand separators
  }
  return val;
};
```

**Usage Example:**
```jsx
<KpiTile
  icon={<KpiIcon src="/sessions.png" alt="Active Sessions" />}
  label="Active Sessions"
  value={42}
  delta={{ value: 12, direction: 'up' }}
  onClick={() => router.push('/sessions')}
/>
```

---

### 3.10 KpiIcon & NavIcon Components

#### 3.10.1 KpiIcon

**File:** `components/ui/KpiIcon.tsx`

**Props:**
```typescript
interface KpiIconProps {
  src: string;
  alt: string;
  className?: string;
}
```

**Structure:**
```jsx
<div className="relative w-6 h-6">
  <Image
    src={src}
    alt={alt}
    fill
    className="object-contain opacity-70"
    sizes="24px"
  />
</div>
```

**Dimensions:** 24x24px
**Opacity:** 0.7 (70%)

#### 3.10.2 NavIcon

**File:** `components/ui/NavIcon.tsx`

**Props:**
```typescript
interface NavIconProps {
  src: string;
  alt: string;
  isActive?: boolean;
  className?: string;
}
```

**Structure:**
```jsx
<div className="relative w-5 h-5 mr-3">
  <Image
    src={src}
    alt={alt}
    fill
    className={cn(
      'object-contain transition-all duration-200',
      isActive
        ? 'opacity-100 brightness-110'
        : 'opacity-70 group-hover:opacity-100 group-hover:brightness-110'
    )}
    sizes="20px"
  />
</div>
```

**Dimensions:** 20x20px
**Right Margin:** 12px

**States:**
- Active: `opacity-100 brightness-110`
- Inactive: `opacity-70`
- Hover: `opacity-100 brightness-110`

---

### 3.11 ProductivityBreakdown Component

**File:** `components/ui/ProductivityBreakdown.tsx`

**Props:**
```typescript
interface ProductivityBreakdownProps {
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
  productivityScore?: number;
}
```

**Structure:**

1. **Overall Score Card** (if productivityScore provided)
```jsx
<Card elevated>
  <CardContent className="py-6">
    <div className="text-center">
      <p className="text-sm text-ink-muted mb-2">Overall Productivity Score</p>
      <div className={`text-4xl font-bold ${getScoreColor(productivityScore)}`}>
        {productivityScore.toFixed(1)}
        <span className="text-2xl">/100</span>
      </div>
      <p className={`text-sm font-medium mt-2 ${getScoreColor(productivityScore)}`}>
        {getScoreLabel(productivityScore)}
      </p>
    </div>
  </CardContent>
</Card>
```

**Score Labels:**
- ≥85: "Excellent" (green)
- ≥75: "Good" (green)
- ≥60: "Average" (yellow)
- ≥40: "Below Average" (yellow)
- <40: "Needs Improvement" (red)

2. **Category Breakdown Cards**

Each category card shows:
```jsx
<Card hover>
  <CardContent className="py-4">
    {/* Header with icon and percentage */}
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-3">
        {/* Icon Circle */}
        <div className="w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink-hi">{label}</h4>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-2xl font-bold ${textColor}`}>
          {percentage.toFixed(1)}%
        </p>
        <p className="text-xs text-ink-muted">{hours.toFixed(2)}h</p>
      </div>
    </div>

    {/* Progress Bar */}
    <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  </CardContent>
</Card>
```

**Categories:**

1. **Productive Time**
   - Icon: `P`
   - Color: `bg-success` (green)
   - Description: "IDEs, Office Suite, Documentation"

2. **Neutral Time**
   - Icon: `N`
   - Color: `bg-warn` (amber)
   - Description: "Meetings, Email, Communication"

3. **Unproductive Time**
   - Icon: `U`
   - Color: `bg-danger` (red)
   - Description: "Social Media, Entertainment, Shopping"

3. **Info Note**
```jsx
<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
  <div className="flex items-start space-x-2">
    <div className="text-xs text-blue-800 dark:text-blue-200">
      <p className="font-medium mb-1">About Productivity Tracking</p>
      <p>
        Currently estimated from session activity. Install desktop app tracking
        for accurate app and website usage data.
      </p>
    </div>
  </div>
</div>
```

---

### 3.12 ProductivityLeaderboard Component

**File:** `components/ui/ProductivityLeaderboard.tsx`

**Props:**
```typescript
interface Employee {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  productivityPercentage: number;
  totalHours: number;
  percentageAboveAverage?: number;
  percentageBelowAverage?: number;
}

interface ProductivityLeaderboardProps {
  topPerformers: Employee[];
  bottomPerformers: Employee[];
  teamAverage: number;
  onEmployeeClick?: (employeeId: string) => void;
}
```

**Structure:** 2-column grid (1 column on mobile, 2 on lg screens)

#### 3.12.1 Top Performers Card

**Header:**
```jsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>Top Performers</CardTitle>
    <Badge variant="success">High Productivity</Badge>
  </div>
</CardHeader>
```

**Employee Card:**
```jsx
<div className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getProductivityBg(productivity)}">
  <div className="flex items-center justify-between mb-2">
    {/* Left: Medal and Info */}
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg font-bold shadow-sm">
        {getMedalIcon(rank)}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-ink-hi">{employeeName}</h4>
        <p className="text-xs text-ink-muted">{department}</p>
      </div>
    </div>

    {/* Right: Percentage */}
    <div className="text-right">
      <div className={`text-2xl font-bold ${getProductivityColor(productivity)}`}>
        {productivity}%
      </div>
      <div className="text-xs text-ink-muted">{totalHours}h total</div>
    </div>
  </div>

  {/* Progress Bar */}
  <div className="w-full h-2 bg-surface rounded-full overflow-hidden mb-2">
    <div
      className="h-full bg-success transition-all duration-500"
      style={{ width: `${productivity}%` }}
    ></div>
  </div>

  {/* Above Average Indicator */}
  <div className="flex items-center justify-between text-xs">
    <span className="text-ink-muted">Team Average: {teamAverage}%</span>
    <span className="text-success font-medium">
      +{percentageAboveAverage}% above avg
    </span>
  </div>
</div>
```

**Medal Icons:**
- Rank 1: `1st`
- Rank 2: `2nd`
- Rank 3: `3rd`
- Others: `#{rank}`

#### 3.12.2 Bottom Performers Card (Needs Support)

**Header:**
```jsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>Needs Support</CardTitle>
    <Badge variant="warning">Low Productivity</Badge>
  </div>
</CardHeader>
```

**Employee Card:** Similar structure to Top Performers, but:
- Progress bar color: `bg-warn` (≥50%) or `bg-danger` (<50%)
- Shows "below average" indicator in red
- Rank number shown as `#{rank}` (no medals)

**Support Tip:**
```jsx
<div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
  <p className="text-xs text-blue-800 dark:text-blue-200">
    <strong>Tip:</strong> Consider one-on-one meetings to understand challenges
    and provide support or training where needed.
  </p>
</div>
```

**Color Functions:**
```javascript
const getProductivityColor = (percentage: number) => {
  if (percentage >= 75) return 'text-success';
  if (percentage >= 50) return 'text-warn';
  return 'text-danger';
};

const getProductivityBg = (percentage: number) => {
  if (percentage >= 75) return 'bg-success/10';
  if (percentage >= 50) return 'bg-warn/10';
  return 'bg-danger/10';
};
```

---

## 4. Layout Components

### 4.1 DashboardLayout

**File:** `components/layout/DashboardLayout.tsx`

**Props:**
```typescript
interface DashboardLayoutProps {
  children: ReactNode;
}
```

**Structure:**
```jsx
<AuthGuard>
  <div className="min-h-screen bg-bg">
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  </div>
</AuthGuard>
```

**Key Features:**
- Wraps all dashboard pages
- Enforces authentication via `AuthGuard`
- Fixed sidebar on left
- Scrollable main content area
- Padding: 24px (p-6) around page content

---

### 4.2 Sidebar Component

**File:** `components/layout/Sidebar.tsx`

**Dimensions:**
- Width: `w-64` (256px)
- Full height: `h-full`
- Background: `bg-surface` (#11161C)
- Border right: `border-r border-line` (#1F2730)

**Structure:**

#### 4.2.1 Logo Section

```jsx
<div className="flex h-16 items-center px-6 border-b border-line">
  <div className="flex items-center space-x-3">
    <div className="relative w-8 h-8">
      <Image src="/target.png" alt="Work Invigilator" fill />
    </div>
    <div>
      <h1 className="font-ui text-lg font-semibold text-ink-hi">
        Work Invigilator
      </h1>
      <p className="font-ui text-xs smallcaps text-ink-muted">
        Admin Dashboard
      </p>
    </div>
  </div>
</div>
```

**Dimensions:**
- Height: 64px (h-16)
- Logo: 32x32px
- Horizontal padding: 24px (px-6)

#### 4.2.2 Navigation Section

```jsx
<nav className="flex-1 px-4 py-6 overflow-y-auto">
  <ul className="space-y-2">
    {/* Navigation items */}
  </ul>
</nav>
```

**Navigation Items Array:**
```javascript
const navigationItems = [
  { name: "Overview", href: "/", icon: "/overview.png" },
  { name: "Live Monitoring", href: "/live-monitoring", icon: "/target.png" },
  { name: "Employees", href: "/employees", icon: "/employees.png" },
  { name: "Attendance", href: "/attendance", icon: "/sessions.png" },
  { name: "Sessions", href: "/sessions", icon: "/office.png" },
  { name: "Timesheet", href: "/timesheet", icon: "/calendar.png" },
  { name: "Monthly Hours", href: "/monthly-hours", icon: "/productivity.png" },
  {
    name: "Productivity",
    href: "/productivity",
    icon: "/focus.png",
    subItems: [
      { name: "Analytics", href: "/productivity" },
      { name: "Reports & Rankings", href: "/productivity-reports" },
      { name: "Detailed Breakdown", href: "/productivity-breakdown" }
    ]
  },
  { name: "Screenshots", href: "/screenshots", icon: "/screenshots.png" },
  { name: "Audio", href: "/audio", icon: "/audio.png" },
  { name: "Breaks", href: "/breaks", icon: "/focus.png" },
  { name: "Mute Events", href: "/mute-events", icon: "/audio.png" },
  { name: "Reports", href: "/reports", icon: "/report.png" },
  { name: "Settings", href: "/settings", icon: "/settings.png" }
];
```

**Regular Nav Item:**
```jsx
<Link
  href={item.href}
  className={cn(
    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
    "hover:bg-raised",
    isActive
      ? "bg-primary/10 text-primary border border-primary/20"
      : "text-ink-mid hover:text-ink-hi"
  )}
>
  <NavIcon src={item.icon} alt={item.name} isActive={isActive} />
  <span className="font-ui text-sm">{item.name}</span>
</Link>
```

**Nav Item with SubItems (Expandable):**
```jsx
<button
  onClick={() => toggleExpand(item.name)}
  className={cn(
    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
    "hover:bg-raised",
    isSubItemActive
      ? "bg-primary/10 text-primary border border-primary/20"
      : "text-ink-mid hover:text-ink-hi"
  )}
>
  <div className="flex items-center">
    <NavIcon src={item.icon} alt={item.name} isActive={isSubItemActive} />
    <span className="font-ui text-sm">{item.name}</span>
  </div>
  {/* Chevron Icon */}
  <svg className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")}>
    <path d="M9 5l7 7-7 7" />
  </svg>
</button>

{/* SubItems */}
{isExpanded && (
  <ul className="mt-1 ml-8 space-y-1">
    {item.subItems.map(subItem => (
      <li key={subItem.name}>
        <Link
          href={subItem.href}
          className={cn(
            "block px-3 py-2 rounded-lg text-sm transition-colors",
            "hover:bg-raised",
            isSubActive
              ? "bg-primary/5 text-primary font-medium"
              : "text-ink-mid hover:text-ink-hi"
          )}
        >
          {subItem.name}
        </Link>
      </li>
    ))}
  </ul>
)}
```

**States:**
- Inactive: `text-ink-mid`, opacity-70 icon
- Hover: `hover:bg-raised hover:text-ink-hi`, opacity-100 icon
- Active: `bg-primary/10 text-primary border border-primary/20`, opacity-100 icon

**SubItem Indent:** `ml-8` (32px left margin)

#### 4.2.3 Bottom Status Section

```jsx
<div className="p-4 border-t border-line">
  <div className="flex items-center space-x-2 text-xs text-ink-muted">
    <div className="w-2 h-2 bg-success rounded-full"></div>
    <span>All systems operational</span>
  </div>
</div>
```

---

### 4.3 TopBar Component

**File:** `components/layout/TopBar.tsx`

**Dimensions:**
- Height: `h-16` (64px)
- Background: `bg-surface` (#11161C)
- Border bottom: `border-b border-line` (#1F2730)
- Horizontal padding: `px-6` (24px)

**Structure:**
```jsx
<div className="flex h-16 items-center justify-between px-6 bg-surface border-b border-line">
  {/* Left section (empty currently) */}
  <div className="flex items-center space-x-4"></div>

  {/* Right section - User menu */}
  <div className="flex items-center space-x-4">
    {/* User dropdown */}
  </div>
</div>
```

#### 4.3.1 User Menu Dropdown

**Trigger Button:**
```jsx
<div
  className="flex items-center space-x-2 cursor-pointer hover:bg-raised/50 rounded-lg p-2 transition-colors"
  onClick={() => setShowUserMenu(!showUserMenu)}
>
  {/* Avatar */}
  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
    <span className="text-primary text-sm font-medium">
      {getUserInitials(user?.name || user?.email)}
    </span>
  </div>

  {/* User Info */}
  <div className="text-sm">
    <div className="text-ink-hi font-medium">
      {user?.name || user?.email?.split('@')[0]}
    </div>
    <div className="text-ink-muted text-xs capitalize">
      {user?.role || 'user'}
    </div>
  </div>

  {/* Dropdown Arrow */}
  <svg className={`w-4 h-4 text-ink-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>
    <path d="M19 9l-7 7-7-7" />
  </svg>
</div>
```

**Dropdown Menu:**
```jsx
<div className="absolute right-0 mt-2 w-64 bg-surface border border-line rounded-lg shadow-lg z-50">
  {/* User Info Header */}
  <div className="p-4 border-b border-line">
    <div className="text-sm font-medium text-ink-hi">{user?.name}</div>
    <div className="text-xs text-ink-muted">{user?.email}</div>
    <div className="text-xs text-ink-muted mt-1">
      <Badge variant={user?.role === 'admin' ? 'warning' : 'info'} size="sm">
        {user?.role}
      </Badge>
    </div>
  </div>

  {/* Menu Items */}
  <div className="p-2">
    {/* Settings */}
    <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-ink-mid hover:text-ink-hi hover:bg-raised rounded-lg transition-colors">
      <svg className="w-4 h-4">{/* Settings icon */}</svg>
      <span>Settings</span>
    </button>

    <div className="border-t border-line my-2"></div>

    {/* Sign Out */}
    <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
      <svg className="w-4 h-4">{/* Logout icon */}</svg>
      <span>Sign out</span>
    </button>
  </div>
</div>
```

**Features:**
- **Click Outside:** Closes dropdown when clicking outside
- **User Initials:** Generated from name (first letter of each word, max 2 letters)
- **Role Badge:** Admin gets warning (amber) badge, users get info (indigo) badge

---

## 5. Page-by-Page Documentation

### 5.1 Login Page

**File:** `app/login/page.tsx`

**Route:** `/login`

**Access:** Public (redirects if already authenticated)

#### 5.1.1 Page Structure

**Container:**
```jsx
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
  <div className="max-w-md w-full space-y-8">
    {/* Login card */}
  </div>
</div>
```

**Background:** Gradient from dark slate tones
- From: `from-slate-900` (#0f172a)
- Via: `via-slate-800` (#1e293b)
- To: `to-slate-900` (#0f172a)

#### 5.1.2 Login Card

```jsx
<div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700">
  {/* Logo and Title */}
  <div className="text-center">
    <div className="inline-flex items-center space-x-3 mb-6">
      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xl">W</span>
      </div>
      <div className="text-left">
        <h1 className="text-2xl font-bold text-white">Work Invigilator</h1>
        <p className="text-slate-400 text-sm">Admin Dashboard</p>
      </div>
    </div>
    <p className="text-sm text-slate-400 mb-8">
      Sign in to access the monitoring dashboard
    </p>
  </div>

  {/* Login Form */}
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Email field */}
    {/* Password field */}
    {/* Error message */}
    {/* Submit button */}
  </form>

  {/* Footer */}
  <div className="mt-6 text-center">
    <p className="text-xs text-slate-500">
      Work Invigilator Dashboard v2.0.0
    </p>
  </div>
</div>
```

**Card Styling:**
- Background: `bg-slate-800/80` (80% opacity)
- Backdrop blur: `backdrop-blur-sm`
- Border radius: `rounded-2xl` (16px)
- Padding: `p-8` (32px)
- Border: `border border-slate-700`

#### 5.1.3 Form Fields

**Email Input:**
```jsx
<div>
  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    autoComplete="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
    placeholder="Enter your email"
  />
</div>
```

**Password Input:**
```jsx
<div>
  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
    Password
  </label>
  <input
    id="password"
    type="password"
    autoComplete="current-password"
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
    placeholder="Enter your password"
  />
</div>
```

**Input Styling:**
- Background: `bg-slate-700/50` (50% opacity slate)
- Border: `border-slate-600`
- Border radius: `rounded-lg` (12px)
- Text color: `text-white`
- Placeholder: `placeholder-slate-400`
- Focus ring: `focus:ring-2 focus:ring-primary`

#### 5.1.4 Error Message

```jsx
{error && (
  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
    <p className="text-sm text-red-400">{error}</p>
  </div>
)}
```

#### 5.1.5 Submit Button

```jsx
<button
  type="submit"
  disabled={loading}
  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {loading ? (
    <div className="flex items-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      Signing in...
    </div>
  ) : (
    'Sign In'
  )}
</button>
```

**Button States:**
- Default: `bg-primary`
- Hover: `hover:bg-primary/80`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`
- Loading: Shows spinner and "Signing in..." text

#### 5.1.6 Authentication Logic

**Sign In Flow:**
1. Validate email and password
2. Call `signIn(email, password)` from auth context
3. Check user role from profiles table
4. If admin: Redirect to `/` (dashboard)
5. If not admin: Sign out and show error message

**Admin-Only Access:**
```
"Access Denied: This dashboard is for administrators only.
Please use the Work Invigilator Desktop application."
```

**Redirect After Login:**
- Authenticated admins are redirected from login page to `/`

---

### 5.2 Overview Page (Home/Root)

**File:** `app/page.tsx`

**Route:** `/`

**Access:** Protected (requires authentication)

**Layout:** Uses `DashboardLayout`

#### 5.2.1 Page Header

```jsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
      Overview
    </h1>
    <p className="font-ui text-sm text-ink-muted">
      Monitor ongoing activity and team performance
    </p>
  </div>
  <div className="flex items-center space-x-2">
    <Badge variant="success">Live Data</Badge>
  </div>
</div>
```

#### 5.2.2 KPI Grid

**Layout:** Responsive grid
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4
```

**KPI Tiles:**
1. **Active Sessions**
   - Icon: `/sessions.png`
   - Value: Number of active sessions
   - Click: Navigate to `/sessions`

2. **Avg Focus Time**
   - Icon: `/focus.png`
   - Value: Average focus hours (e.g., "5.2h")
   - Click: Navigate to `/reports`

3. **Avg Session**
   - Icon: `/sessions.png`
   - Value: Average session duration in minutes (e.g., "120min")
   - Click: Navigate to `/reports`

4. **Screenshots Today**
   - Icon: `/screenshots.png`
   - Value: Total screenshots captured today
   - Click: Navigate to `/screenshots`

#### 5.2.3 Charts Grid

**Layout:** Responsive grid
```
grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6
```

**1. Productivity Breakdown Card**
```jsx
<Card hover>
  <CardHeader>
    <CardTitle>Productivity Breakdown</CardTitle>
  </CardHeader>
  <CardContent>
    {loadingProductivity ? (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-ink-muted">Loading...</div>
      </div>
    ) : productivityData ? (
      <ProductivityGraph
        data={productivityData.distribution}
        showLegend={true}
        size="sm"
      />
    ) : (
      <div className="flex items-center justify-center h-64 text-ink-muted">
        <p className="text-sm">No data available</p>
      </div>
    )}
  </CardContent>
</Card>
```

**2. Live Sessions Card**
```jsx
<Card hover>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Live Sessions ({filteredCount})</CardTitle>
      <select
        value={departmentFilter}
        onChange={(e) => setDepartmentFilter(e.target.value)}
        className="bg-surface border border-line rounded px-2 py-1 text-xs text-ink-hi focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">All Departments</option>
        {allDepartments.map(dept => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activeSessions.map(session => (
        <div key={session.id} className="flex items-center justify-between p-3 bg-raised rounded-lg">
          <div className="flex items-center space-x-3 flex-1">
            {/* Green pulsing dot */}
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-ink-hi">{session.employeeName}</p>
              <p className="text-xs text-ink-muted">{session.department} • Session: {session.duration}</p>
            </div>
          </div>
          <Badge
            size="sm"
            variant="primary"
            className="cursor-pointer"
            onClick={() => router.push(`/sessions?employee=${session.employeeId}`)}
          >
            View
          </Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Session Item Features:**
- Green pulsing dot indicator (animate-pulse)
- Employee name and department
- Session duration
- Click on badge to view full session details

**3. Recent Screenshots Card**
```jsx
<Card hover>
  <CardHeader>
    <CardTitle>Recent Screenshots</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-2">
      {screenshots.slice(0, 4).map(screenshot => (
        <div
          key={screenshot.id}
          className="aspect-video bg-raised rounded border border-line flex items-center justify-center overflow-hidden"
        >
          {screenshot.url ? (
            <img
              src={screenshot.url}
              alt={`Screenshot by ${screenshot.employeeName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-ink-muted">
              <p className="text-xs">{screenshot.employeeName}</p>
            </div>
          )}
        </div>
      ))}
    </div>
    <div className="mt-3 text-center">
      <Badge
        variant="outline"
        size="sm"
        className="cursor-pointer hover:bg-primary hover:text-white"
        onClick={() => router.push("/screenshots")}
      >
        View All ({screenshots.length})
      </Badge>
    </div>
  </CardContent>
</Card>
```

**Screenshot Grid:**
- 2 columns
- Aspect ratio: 16:9 (aspect-video)
- Shows 4 most recent screenshots
- Click "View All" to see full screenshot gallery

#### 5.2.4 Employee Detail Modal

Shown when clicking on an employee:

```jsx
<Modal isOpen={isModalOpen} onClose={closeModal}>
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-ink-hi">Employee Details</h2>
      <button onClick={closeModal} className="text-ink-muted hover:text-ink-hi">
        Close
      </button>
    </div>

    {/* Employee Info */}
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-ink-hi mb-2">
          {selectedEmployee.name}
        </h3>
        <p className="text-sm text-ink-muted">{selectedEmployee.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-raised p-4 rounded-lg">
          <h4 className="text-sm font-medium text-ink-mid mb-2">Session Time</h4>
          <p className="text-lg font-semibold text-ink-hi">2h 45m</p>
        </div>
        <div className="bg-raised p-4 rounded-lg">
          <h4 className="text-sm font-medium text-ink-mid mb-2">Status</h4>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm text-ink-hi">Active</span>
          </div>
        </div>
      </div>

      {/* Live Actions */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-ink-mid mb-3">Live Actions</h4>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-success text-white rounded-lg hover:bg-success/80 transition-colors font-medium">
            Listen to Live Audio
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Go to Audio and Select the Employee to listen to past audios
            </p>
          </div>

          <div className="flex space-x-3">
            <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors">
              Past Audios
            </button>
            <button className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 transition-colors">
              Screenshots
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-raised p-4 rounded-lg">
        <h4 className="text-sm font-medium text-ink-mid mb-2">Recent Activity</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Last Screenshot</span>
            <span className="text-ink-hi">2 minutes ago</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Last Audio Recording</span>
            <span className="text-ink-hi">5 minutes ago</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Session Started</span>
            <span className="text-ink-hi">2h 45m ago</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</Modal>
```

#### 5.2.5 Data Fetching

**API Endpoints:**
- `/api/dashboard?period={period}&organizationId={orgId}&userId={userId}`
- `/api/productivity-graph?organizationId={orgId}&period={period}`

**Loading States:**
- Full page loader during initial fetch
- Skeleton loaders for individual sections
- Pulse animation for loading KPI tiles

**Error Handling:**
- Fallback to individual API calls if dashboard endpoint fails
- Timeout handling (10 second timeout)
- Shows empty state if no data available

---

### 5.3 Employees Page

**File:** `app/employees/page.tsx`

**Route:** `/employees`

**Access:** Protected (requires authentication)

**Layout:** Uses `DashboardLayout`

#### 5.3.1 Page Header

```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
      Employee Management
    </h1>
    <p className="font-ui text-sm text-ink-muted">
      Manage your team and view employee performance
    </p>
  </div>
  <div className="flex items-center space-x-3">
    <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
      {/* Filter icon */}
      Filters
    </Button>
    <Button variant="primary" onClick={() => setShowAddModal(true)}>
      {/* Plus icon */}
      Add Employee
    </Button>
  </div>
</div>
```

#### 5.3.2 Filters Section

**Date Range Filter:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div>
    <label className="block text-sm font-medium text-ink-hi mb-2">From Date</label>
    <Input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-ink-hi mb-2">To Date</label>
    <Input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-ink-hi mb-2">Department</label>
    <select className="flex h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-hi">
      <option value="all">All Departments</option>
      {uniqueDepartments.map(dept => (
        <option key={dept} value={dept}>{dept}</option>
      ))}
    </select>
  </div>
  <div>
    <label className="block text-sm font-medium text-ink-hi mb-2">Status</label>
    <select className="flex h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-hi">
      <option value="all">All Statuses</option>
      <option value="online">Online</option>
      <option value="offline">Offline</option>
    </select>
  </div>
</div>
```

#### 5.3.3 Search Bar

```jsx
<div className="mb-6">
  <Input
    type="text"
    placeholder="Search employees by name, email, or department..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full"
  />
</div>
```

#### 5.3.4 Employee Table

**Table Structure:**
```jsx
<Card>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Employee</TableHead>
        <TableHead>Department</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Total Break (h)</TableHead>
        <TableHead>Total Work (h)</TableHead>
        <TableHead>Hourly Rate</TableHead>
        <TableHead>Last Active</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredEmployees.map(employee => (
        <TableRow key={employee.id} onClick={() => setSelectedEmployee(employee.id)}>
          <TableCell>
            <div className="flex items-center space-x-3">
              <Avatar
                fallback={employee.name}
                size="sm"
                status={employee.status}
              />
              <div>
                <div className="font-medium text-ink-hi">{employee.name}</div>
                <div className="text-xs text-ink-muted">{employee.email}</div>
              </div>
            </div>
          </TableCell>
          <TableCell>{employee.department}</TableCell>
          <TableCell>
            <Badge variant={employee.role === 'ADMIN' ? 'warning' : 'default'} size="sm">
              {employee.role}
            </Badge>
          </TableCell>
          <TableCell className="font-mono">{formatHours(employee.totalBreakHours)}</TableCell>
          <TableCell className="font-mono">{formatHours(employee.totalWorkHours)}</TableCell>
          <TableCell className="font-mono">
            ${(employee.hourlyRate || 0).toFixed(2)}
            <button className="ml-2 text-primary hover:text-primary/80">
              Edit
            </button>
          </TableCell>
          <TableCell className="text-ink-muted text-xs">{employee.lastActive}</TableCell>
          <TableCell>
            <Badge variant={employee.status === 'online' ? 'success' : 'default'} size="sm">
              {employee.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Button variant="outline" size="sm">View Details</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Card>
```

**Row Features:**
- Avatar with status indicator
- Name and email in one cell
- Monospace font for numeric values
- Badge for role and status
- Clickable rows to view details

#### 5.3.5 Export Functionality

**Export Button:**
```jsx
<Button variant="outline" onClick={handleExportCSV}>
  {/* Download icon */}
  Export CSV
</Button>
```

**CSV Format:**
```
Name,Email,Department,Role,Total Break (h),Total Work (h),Hourly Rate ($),Last Active,Status
"John Doe","john@company.com","Engineering","USER",1.5,40.2,25.00,"2025-10-28 10:30","online"
```

#### 5.3.6 Add Employee Modal

Uses `AddEmployeeForm` component (documented in section 8.1)

**Modal:**
```jsx
<Modal
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  title="Add New Employee"
  size="lg"
>
  <AddEmployeeForm
    onSubmit={handleCreateEmployee}
    onCancel={() => setShowAddModal(false)}
    loading={isCreating}
  />
</Modal>
```

#### 5.3.7 Edit Hourly Rate Modal

```jsx
<Modal
  isOpen={showHourlyRateModal}
  onClose={() => setShowHourlyRateModal(false)}
  title="Edit Hourly Rate"
  size="sm"
>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-ink-hi mb-2">
        Employee: {editingEmployee?.name}
      </label>
      <label className="block text-sm font-medium text-ink-mid mb-2">
        Hourly Rate ($)
      </label>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={newHourlyRate}
        onChange={(e) => setNewHourlyRate(e.target.value)}
        placeholder="Enter hourly rate"
      />
    </div>

    <ModalFooter>
      <Button variant="outline" onClick={() => setShowHourlyRateModal(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSaveHourlyRate} loading={isSavingRate}>
        Save Rate
      </Button>
    </ModalFooter>
  </div>
</Modal>
```

#### 5.3.8 Employee Details Panel

Shows when clicking on a row - displays recent screenshots and quick actions.

---

### 5.4 Live Monitoring Page

**File:** `app/live-monitoring/page.tsx`

**Route:** `/live-monitoring`

**Access:** Protected (requires authentication)

**Purpose:** Real-time WebRTC screen sharing monitoring

**Technology:** SimplePeer, Supabase Realtime, WebRTC

#### 5.4.1 Page Layout

**No sidebar/topbar** - fullscreen monitoring interface

```jsx
<div className="min-h-screen bg-bg p-4">
  {/* Header with controls */}
  {/* Sidebar with available streamers */}
  {/* Main grid view */}
  {/* Fullscreen modal */}
</div>
```

#### 5.4.2 Header Section

```jsx
<div className="flex items-center justify-between mb-6">
  {/* Left: Title and Stats */}
  <div>
    <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi mb-2">
      Live Monitoring
    </h1>
    <div className="flex items-center space-x-4 text-sm text-ink-muted">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span>Active Streams: {activeStreams.size}</span>
      </div>
      <div>Online Employees: {streamers.length}</div>
      <div>Grid Size: {GRID_SIZES[gridSize].max}</div>
    </div>
  </div>

  {/* Right: Controls */}
  <div className="flex items-center space-x-3">
    {/* Grid Size Selector */}
    <select
      value={gridSize}
      onChange={(e) => setGridSize(e.target.value)}
      className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi"
    >
      <option value="1">1x1 Grid</option>
      <option value="4">2x2 Grid</option>
      <option value="9">3x3 Grid</option>
      <option value="16">4x4 Grid</option>
      <option value="25">5x5 Grid</option>
      <option value="36">6x6 Grid</option>
      <option value="49">7x7 Grid</option>
      <option value="64">8x8 Grid</option>
    </select>

    {/* Connection Status */}
    <Badge variant={isConnected ? 'success' : 'danger'}>
      {isConnected ? 'Connected' : 'Disconnected'}
    </Badge>

    {/* Back Button */}
    <Button variant="outline" onClick={() => router.push('/')}>
      Back to Dashboard
    </Button>
  </div>
</div>
```

#### 5.4.3 Layout Structure

**Two-column layout:**
```jsx
<div className="flex gap-6">
  {/* Sidebar - Available Streamers */}
  <div className="w-64 flex-shrink-0">
    {/* Streamer list */}
  </div>

  {/* Main Grid View */}
  <div className="flex-1">
    {/* Video grid */}
  </div>
</div>
```

#### 5.4.4 Available Streamers Sidebar

```jsx
<Card>
  <CardHeader>
    <CardTitle>Available Employees ({streamers.length})</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
      {streamers.map(streamer => (
        <div
          key={streamer.userId}
          className={cn(
            "p-3 rounded-lg border cursor-pointer transition-colors",
            activeStreams.has(streamer.userId)
              ? "bg-primary/10 border-primary/30"
              : "bg-surface border-line hover:bg-raised"
          )}
          onClick={() => toggleStream(streamer)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-ink-hi">
                  {streamer.userEmail.split('@')[0]}
                </div>
                <div className="text-xs text-ink-muted">
                  {activeStreams.has(streamer.userId) ? 'Streaming' : 'Available'}
                </div>
              </div>
            </div>
            <Badge
              size="sm"
              variant={activeStreams.has(streamer.userId) ? 'primary' : 'outline'}
            >
              {activeStreams.has(streamer.userId) ? 'Stop' : 'Start'}
            </Badge>
          </div>
        </div>
      ))}

      {streamers.length === 0 && (
        <div className="text-center py-8 text-ink-muted">
          <p className="text-sm">No employees streaming</p>
          <p className="text-xs mt-2">Employees need to be online and sharing their screen</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

#### 5.4.5 Video Grid

**Grid Configuration:**
```javascript
const GRID_SIZES = {
  '1': { cols: 1, rows: 1, max: 1 },
  '4': { cols: 2, rows: 2, max: 4 },
  '9': { cols: 3, rows: 3, max: 9 },
  '16': { cols: 4, rows: 4, max: 16 },
  '25': { cols: 5, rows: 5, max: 25 },
  '36': { cols: 6, rows: 6, max: 36 },
  '49': { cols: 7, rows: 7, max: 49 },
  '64': { cols: 8, rows: 8, max: 64 }
};
```

**Grid Layout:**
```jsx
<div
  className="grid gap-4"
  style={{
    gridTemplateColumns: `repeat(${GRID_SIZES[gridSize].cols}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_SIZES[gridSize].rows}, 1fr)`
  }}
>
  {Array.from(activeStreams).map(userId => {
    const streamer = streamers.find(s => s.userId === userId);
    return (
      <VideoStreamCard
        key={userId}
        streamer={streamer}
        videoRef={(el) => {
          if (el) videoRefsMap.current.set(userId, el);
        }}
        cameraRef={(el) => {
          if (el) cameraRefsMap.current.set(userId, el);
        }}
        isMuted={mutedStreams.has(userId)}
        cameraEnabled={cameraEnabled.has(userId)}
        isPaused={pausedStreams.has(userId)}
        onToggleMute={() => toggleMute(userId)}
        onToggleCamera={() => toggleCamera(userId)}
        onFullscreen={() => setFullscreenUserId(userId)}
        onPause={() => togglePause(userId)}
      />
    );
  })}
</div>
```

#### 5.4.6 Video Stream Card

```jsx
<div className="relative bg-surface border border-line rounded-lg overflow-hidden aspect-video">
  {/* Screen Share Video */}
  <video
    ref={videoRef}
    autoPlay
    playsInline
    className="w-full h-full object-contain bg-black"
  />

  {/* Camera Overlay (Picture-in-Picture) */}
  {cameraEnabled && (
    <div className="absolute bottom-4 right-4 w-32 h-24 bg-black border-2 border-white rounded-lg overflow-hidden shadow-lg">
      <video
        ref={cameraRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  )}

  {/* Employee Name Overlay */}
  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-warn' : 'bg-success'} animate-pulse`}></div>
      <span className="text-white text-sm font-medium">
        {streamer.userEmail.split('@')[0]}
      </span>
    </div>
  </div>

  {/* Control Buttons Overlay */}
  <div className="absolute bottom-4 left-4 flex items-center space-x-2">
    {/* Mute/Unmute Audio */}
    <button
      onClick={onToggleMute}
      className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>

    {/* Toggle Camera */}
    <button
      onClick={onToggleCamera}
      className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      title={cameraEnabled ? 'Hide Camera' : 'Show Camera'}
    >
      {cameraEnabled ? '📹' : '📷'}
    </button>

    {/* Pause/Resume */}
    <button
      onClick={onPause}
      className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      title={isPaused ? 'Resume' : 'Pause'}
    >
      {isPaused ? '▶️' : '⏸️'}
    </button>

    {/* Fullscreen */}
    <button
      onClick={onFullscreen}
      className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/90 transition-colors"
      title="Fullscreen"
    >
      ⛶
    </button>
  </div>

  {/* Connection Status */}
  {!videoRef?.srcObject && (
    <div className="absolute inset-0 flex items-center justify-center bg-surface/90">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-ink-muted text-sm">Connecting...</p>
      </div>
    </div>
  )}
</div>
```

**Control Button Styles:**
- Size: 40x40px (w-10 h-10)
- Background: Black 70% opacity with backdrop blur
- Hover: Black 90% opacity
- Icon: Emoji or Unicode symbols
- Position: Bottom-left corner with 16px spacing

**Camera Overlay (PiP):**
- Size: 128x96px (w-32 h-24)
- Position: Bottom-right corner, 16px from edges
- Border: 2px white
- Background: Black
- Object fit: Cover

#### 5.4.7 Fullscreen Modal

```jsx
{fullscreenUserId && (
  <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
    {/* Close Button */}
    <button
      onClick={() => setFullscreenUserId(null)}
      className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
    >
      ✕
    </button>

    {/* Fullscreen Video */}
    <VideoStreamCard
      streamer={streamers.find(s => s.userId === fullscreenUserId)}
      videoRef={videoRefsMap.current.get(fullscreenUserId)}
      cameraRef={cameraRefsMap.current.get(fullscreenUserId)}
      isMuted={mutedStreams.has(fullscreenUserId)}
      cameraEnabled={cameraEnabled.has(fullscreenUserId)}
      isPaused={pausedStreams.has(fullscreenUserId)}
      onToggleMute={() => toggleMute(fullscreenUserId)}
      onToggleCamera={() => toggleCamera(fullscreenUserId)}
      onFullscreen={() => setFullscreenUserId(null)}
      onPause={() => togglePause(fullscreenUserId)}
      isFullscreen={true}
    />
  </div>
)}
```

#### 5.4.8 WebRTC Implementation

**TURN Servers Configuration:**
```javascript
const iceServers = [
  // Twilio TURN server
  {
    urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
    username: process.env.NEXT_PUBLIC_TWILIO_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TWILIO_TURN_CREDENTIAL
  },
  // OpenRelay TURN server
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];
```

**Peer Connection Creation:**
```javascript
const peer = new SimplePeer({
  initiator: true,  // Dashboard is always initiator
  trickle: true,
  config: {
    iceServers: iceServers
  }
});

// Handle offer signal
peer.on('signal', (signal) => {
  // Send offer to streamer via Supabase Realtime
  signaling.sendWebRTCOffer(presenceKey, signal);
});

// Handle stream
peer.on('stream', (stream) => {
  // Determine if screen or camera stream
  const tracks = stream.getTracks();
  const hasVideo = tracks.some(t => t.kind === 'video');

  if (hasVideo && stream.id.includes('screen')) {
    // Screen share stream
    screenStreamsMap.current.set(userId, stream);
    const video = videoRefsMap.current.get(userId);
    if (video) video.srcObject = stream;
  } else if (hasVideo) {
    // Camera stream
    cameraStreamsMap.current.set(userId, stream);
    const cameraVideo = cameraRefsMap.current.get(userId);
    if (cameraVideo) cameraVideo.srcObject = stream;
  }
});

// Handle connection events
peer.on('connect', () => {
  console.log('Peer connected:', userId);
  clearTimeout(connectionTimeouts.current.get(userId));
  retryAttempts.current.set(userId, 0);
});

peer.on('error', (err) => {
  console.error('Peer error:', err);
  // Retry logic with exponential backoff
});

peer.on('close', () => {
  console.log('Peer connection closed:', userId);
  cleanupPeerConnection(userId);
});
```

**Signaling via Supabase Realtime:**
```javascript
// Send offer
signaling.sendWebRTCOffer(presenceKey, offer);

// Receive answer
signaling.on('webrtc:answer', (data) => {
  const peer = peersRef.current.get(data.fromPresenceKey);
  if (peer) {
    peer.signal(data.answer);
  }
});

// Receive ICE candidates
signaling.on('webrtc:ice-candidate', (data) => {
  const peer = peersRef.current.get(data.fromPresenceKey);
  if (peer) {
    peer.signal(data.candidate);
  }
});
```

**Auto-Start Logic:**
- When new streamer becomes available, auto-start if within grid capacity
- Stagger connection attempts by 100ms to avoid overwhelming
- Retry failed connections with exponential backoff (max 3 attempts)
- Connection timeout: 15 seconds

**Cleanup:**
- Destroy peer connections on component unmount
- Clear video element srcObject
- Remove from maps
- Cancel pending timeouts

---

This documentation continues with remaining pages, charts, forms, and technical implementation details. Would you like me to continue with the next sections?

