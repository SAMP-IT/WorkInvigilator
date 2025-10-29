# Work Vigilator React Frontend

A complete React frontend migration of the Work Vigilator dashboard with modern light mode design.

## Features

- **Modern React Stack**: React 19, TypeScript, Vite
- **State Management**: Zustand for auth/UI, React Query for server state
- **Routing**: React Router v7 with protected routes
- **UI Framework**: Tailwind CSS with custom light mode theme
- **Backend**: Supabase (Auth, Database, Realtime)
- **Real-time**: WebRTC video streaming, Supabase Realtime
- **Charts**: Recharts for data visualization

## Color Scheme (Light Mode)

- **Primary**: #3B82F6 (Blue)
- **Secondary**: #2D65E6 (Darker Blue)
- **Gradient**: #3B82F6 → #234C90
- **Background**: #FFFFFF (White)
- **Secondary BG**: #F8FAFC (Light Gray)
- **Text**: #1E293B (Dark Slate)

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   ├── layout/          # Layout components (Sidebar, TopBar, DashboardLayout)
│   ├── charts/          # Chart components (Recharts-based)
│   ├── attendance/      # Attendance-specific components
│   ├── forms/           # Form components
│   └── auth/            # Auth components (ProtectedRoute)
├── pages/               # Page components (one per route)
├── lib/                 # Utilities and configurations
│   ├── supabase.ts     # Supabase client
│   ├── config.ts       # Environment configuration
│   ├── utils.ts        # Helper functions
│   └── queryClient.ts  # React Query configuration
├── store/              # Zustand stores
│   ├── authStore.ts    # Authentication state
│   └── uiStore.ts      # UI state (sidebar, notifications)
├── App.tsx             # Main app with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd react-frontend
npm install
```

### Environment Setup

The `.env` file is already configured with Supabase credentials.

### Development

```bash
npm run dev
```

The app will run on http://localhost:3003

### Build

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Type Checking

```bash
npm run type-check
```

## Pages

| Route | Component | Description | Admin Only |
|-------|-----------|-------------|------------|
| `/login` | Login | Authentication page | No |
| `/dashboard` | Dashboard | Main dashboard with KPIs | No |
| `/overview` | Overview | Feature overview | No |
| `/live-monitoring` | LiveMonitoring | Real-time video streaming | Yes |
| `/employees` | Employees | Employee management | Yes |
| `/employee-report` | EmployeeReport | Individual reports | No |
| `/timesheet` | Timesheet | Time tracking | No |
| `/attendance` | Attendance | Attendance records | No |
| `/attendance-calendar` | AttendanceCalendar | Calendar view | No |
| `/productivity` | Productivity | Productivity metrics | No |
| `/productivity-reports` | ProductivityReports | Team productivity | No |
| `/productivity-breakdown` | ProductivityBreakdown | Detailed breakdown | No |
| `/reports` | Reports | Comprehensive reports | No |
| `/monthly-hours` | MonthlyHours | Monthly hour tracking | No |
| `/screenshots` | Screenshots | Screenshot viewer | No |
| `/audio` | Audio | Audio recordings | No |
| `/sessions` | Sessions | Work sessions | No |
| `/breaks` | Breaks | Break tracking | No |
| `/mute-events` | MuteEvents | Microphone events | No |
| `/settings` | Settings | User settings | No |
| `/unauthorized` | Unauthorized | Access denied page | No |

## Key Technologies

### State Management

**Zustand Stores:**
- `authStore`: User authentication, profile, login/logout
- `uiStore`: Sidebar state, notifications, date ranges

**React Query:**
- Server state caching
- Automatic refetching
- Loading/error states
- Optimistic updates

### Authentication

- Supabase Auth with email/password
- Role-based access (admin/user)
- Protected routes with auth guard
- Automatic session management

### Real-time Features

**Live Monitoring:**
- WebRTC peer-to-peer streaming
- Supabase Realtime for signaling
- SimplePeer for video connections
- Screen sharing + camera overlay
- Multi-stream grid layout

### UI Components

All components follow light mode design:
- **Button**: Primary, secondary, outline, ghost, danger variants
- **Card**: Elevated, hoverable cards with headers
- **Input**: Form inputs with error states
- **Table**: Sortable, filterable data tables
- **Modal**: Dialog modals with backdrop
- **Badge**: Status indicators with colors
- **Avatar**: User avatars with fallbacks

### Charts

- **ProductivityGraph**: Pie/Donut charts
- **ProductivityTrendChart**: Line/Bar trends
- **MonthlyHoursChart**: Monthly work hours
- **CumulativeHoursChart**: Cumulative tracking

## API Integration

All pages use Supabase client directly:

```typescript
import { supabase } from '../lib/supabase';

// Fetch data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('organization_id', orgId);
```

With React Query:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['key', deps],
  queryFn: () => fetchFunction(params),
  enabled: !!condition,
});
```

## Migration Notes

This is a complete recreation of the Next.js dashboard:

### Changed:
- ✅ Next.js → React + Vite
- ✅ Dark mode → Light mode only
- ✅ `@/` imports → Relative imports
- ✅ Next.js Router → React Router
- ✅ Context API → Zustand
- ✅ `'use client'` removed

### Preserved:
- ✅ All functionality
- ✅ Same Supabase backend
- ✅ Same API endpoints
- ✅ Same authentication flow
- ✅ Same user roles
- ✅ WebRTC streaming
- ✅ All features and pages

## Performance Optimizations

- Lazy loading for pages
- Code splitting with manual chunks
- React Query caching
- Optimized re-renders with Zustand
- Image optimization
- Bundle size optimization

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

WebRTC features require modern browsers with WebRTC support.

## Deployment

The app can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting

```bash
npm run build
# Deploy the 'dist' folder
```

## Troubleshooting

**Issue: Components not found**
- Check relative import paths
- Ensure all components are exported

**Issue: Auth not working**
- Verify `.env` file exists and has correct Supabase credentials
- Check Supabase dashboard for auth settings

**Issue: WebRTC not connecting**
- Verify TURN server credentials
- Check firewall/network restrictions
- Ensure HTTPS in production (WebRTC requires secure context)

## License

Proprietary - Work Vigilator Dashboard
