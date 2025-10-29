# Work Invigilator – React Light Mode Revamp

**Doc type:** Product + UI/UX Design Specification
**Version:** 1.0 (Draft)
**Date:** Oct 29, 2025
**Owner:** Design/FE Team

---

## 0) Goal & Principles

- **Goal:** Rebuild the Next.js dark dashboard into a **React (Vite) SPA** with a modern **light‑mode SaaS aesthetic**.
- **Brand:** Primary colors **#3B82F6 (Blue 500)** and **#234C90 (Deep Blue)**; white UI with soft grays.
- **Fonts:** **Coolvetica** (display/brand) and **Nexa** (UI/body).
- **Tenets:** Clarity > Density, Accessible contrast, Progressive disclosure, Keyboard-first, 60 FPS animations.

---

## 1) Tech & Project Setup

### 1.1 Stack

- **Build:** Vite + React 18/19 (CSR SPA).
- **Routing:** React Router v7.
- **State:** Redux Toolkit + RTK Query (server cache) **or** TanStack Query + Zustand (UI state).
- **Forms:** React Hook Form + Zod.
- **Tables:** TanStack Table (sorting, filtering, pagination, virtualization).
- **Charts:** Recharts (bar/line/area/pie).
- **Styling:** Tailwind CSS + CSS Variables (Design Tokens).
- **Icons:** Lucide + Custom SVG set (filled/outlined pair).
- **Auth/Realtime:** Supabase (Auth, Realtime), compatible with existing schema.
- **WebRTC:** simple‑peer; signaling via Supabase Realtime channels.

### 1.2 Project Structure (Vite + React)

```
work-invigilator-react/
├─ src/
│  ├─ app/                    # route elements
│  │  ├─ routes.tsx
│  │  └─ providers.tsx       # Query, Redux, Theme, ErrorBoundary
│  ├─ pages/                  # feature pages (Route components)
│  │  ├─ overview/
│  │  ├─ live-monitoring/
│  │  ├─ employees/
│  │  ├─ attendance/
│  │  ├─ timesheet/
│  │  ├─ productivity/
│  │  ├─ screenshots/
│  │  ├─ audio/
│  │  ├─ breaks/
│  │  ├─ mute-events/
│  │  ├─ reports/
│  │  ├─ settings/
│  │  └─ auth/ (login, unauthorized)
│  ├─ components/
│  │  ├─ ui/                  # primitives (Button, Card, Input, etc.)
│  │  ├─ layout/              # AppShell, Sidebar, Topbar
│  │  ├─ data/                # Data views (Tables, Leaderboards)
│  │  ├─ charts/              # Reusable chart comps
│  │  ├─ webrtc/              # VideoStreamCard, Grid, Controls
│  │  └─ forms/               # RHF field wrappers
│  ├─ hooks/
│  ├─ store/                  # Redux/Zustand slices
│  ├─ services/               # API clients (Supabase, REST)
│  ├─ lib/                    # utils, constants, token helpers
│  ├─ styles/                 # tailwind.css, tokens.css
│  └─ assets/                 # logos, icons, illos
├─ public/
├─ index.html
└─ tailwind.config.ts
```

---

## 2) Brand & Design Tokens (Light Mode)

### 2.1 Color Tokens (CSS variables)

```css
:root {
  /* Base */
  --bg: #ffffff; /* canvas */
  --surface: #fafafb; /* cards */
  --surface-raised: #f4f6f8; /* elevated */
  --line: #e6e8ec; /* borders */

  /* Text */
  --ink-hi: #0e1624; /* primary text */
  --ink-mid: #344053; /* secondary */
  --ink-muted: #6b7380; /* tertiary */

  /* Brand */
  --primary: #3b82f6; /* action */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --brand-deep: #234c90; /* emphasis, links on white */

  /* Status */
  --info: #6366f1;
  --success: #10b981;
  --warn: #f59e0b;
  --danger: #ef4444;

  /* Data Viz (sequential blues & neutrals) */
  --viz-1: #234c90;
  --viz-2: #3b82f6;
  --viz-3: #60a5fa;
  --viz-4: #93c5fd;
  --viz-5: #bfdbfe;
  --viz-0: #cbd5e1; /* neutral */
}
```

**Rules**

- Primary actions: `--primary`; prominent links: `--brand-deep`.
- Borders use `--line`; avoid overly dark lines on white.
- Destructive uses `--danger` with confirmation states.

### 2.2 Radii & Shadows

```css
:root {
  --r-md: 12px; /* buttons, inputs */
  --r-lg: 16px; /* cards, modals */

  --shadow-card: 0 1px 2px rgba(16, 24, 40, 0.06), 0 10px 20px rgba(16, 24, 40, 0.08);
  --shadow-hover: 0 2px 8px rgba(16, 24, 40, 0.1), 0 16px 32px rgba(16, 24, 40, 0.12);
  --ring-focus: 0 0 0 3px rgba(59, 130, 246, 0.35);
}
```

### 2.3 Typography

- **Coolvetica** → Display (H1–H2, logotype, hero numerals).
- **Nexa** (Regular/Medium/SemiBold) → Body UI, tables, labels.
- **Fallbacks:** Inter, system‑ui.

**Scale (rem)**

- xs 0.75, sm 0.875, base 1, md 1.0625 (17px), lg 1.125, xl 1.25, 2xl 1.5, 3xl 1.875, 4xl 2.25.
- **Headings:** Tight tracking for Coolvetica (−0.01 to −0.02em).
- **Numeric:** `font-variant-numeric: tabular-nums;` on KPIs/tables.

### 2.4 Spacing & Grid

- **Base unit:** 4px.
- **Page gutters:** 24px (sm), 32px (md), 40px (lg+).
- **Card padding:** 16/20/24.
- **KPI grid:** responsive 2/4/6 columns.

### 2.5 Focus & States

- Focus ring uses **brand blue** (`--ring-focus`).
- Hover uses subtle elevation + background tint (`--surface-raised`).
- Disabled: 45–55% opacity, no shadow.

### 2.6 Data‑Viz Style

- Lines: `--brand-deep`; Fills: `--primary` with 16–24% opacity.
- Axes and gridlines in cool gray (#E5E7EB).
- Positive deltas: green; negative: red; neutral: slate.

---

## 3) Tailwind & Theming

### 3.1 Tailwind Config Highlights

- **Theme fonts:** `font-display: Coolvetica`, `font-sans: Nexa`.
- **Colors:** Map Tailwind semantic to CSS vars (via plugin or `:root`).
- **Container:** `center: true`, `padding: 1rem/2rem`.
- **Safelist:** badge variants, table utilities, grid templates used by charts.

### 3.2 Global Styles

- Apply `background: var(--bg)`; `color: var(--ink-hi)`.
- Custom scrollbars (thin, neutral).
- Utility classes: `.focus-ring`, `.card`, `.kpi-tile`.

---

## 4) App Shell & Navigation

### 4.1 Layout

- **AppShell:** Top navigation bar + optional left sidebar (collapsible).
- **Topbar:** Brand, global search, org switcher, user menu.
- **Sidebar:** Sections with icons; collapsible groups (Productivity).
- **Breadcrumbs:** on inner pages.

### 4.2 Topbar (Light Mode)

- Height 64px; white background; bottom border `--line`.
- Global search (Cmd/Ctrl+K) → Quick Nav (employees, reports, settings).
- Org switcher (if multi‑tenant later).
- User menu (name, role badge, Settings, Sign out).

### 4.3 Sidebar

- Width 264px; background `--surface`; border‑right `--line`.
- Active item: brand tint background (blue‑50) + left accent bar.
- Hover: subtle background (`--surface-raised`).
- Collapsed state: 72px mini with tooltips.

### 4.4 Page Header Pattern

- Title (Coolvetica, 28–32px), subtitle (Nexa, ink‑mid).
- Right actions: Filters, Export, New … grouped.

---

## 5) UI Primitives (Light Variants)

### 5.1 Button

- Variants: **primary** (blue), **secondary** (white w/ border), **soft** (blue‑50), **outline**, **ghost**, **danger**.
- Sizes: sm/md/lg.
- Loading: spinner at 16/20/24.

### 5.2 Card

- White card, border `--line`, radius `--r-lg`, shadow `--shadow-card`.
- Header area optional; footers for actions.

### 5.3 Input & Select

- White background; border `--line`; focus ring brand blue.
- Error: `--danger` border + help text.
- Helper icon slot on right.

### 5.4 Badge/Chip

- **Neutral** (gray‑100 bg, ink‑mid text), **Primary** (blue‑50), **Success/Warning/Danger/Info** tints.
- Rounded‑full; size sm/md.

### 5.5 Table System (TanStack Table)

- Sticky header; zebra rows (optional subtle `#FAFBFC`).
- Column controls: sort, show/hide, density, export.
- Row states: hover, selected, actionable.
- Empty state: illustration + CTA.

### 5.6 Modal/Drawer

- Modal for confirmations, forms ≤ 2 steps.
- Drawer (right) for quick edit (hourly rate, filters).
- ESC/Backdrop close; focus‑trap.

### 5.7 Toasts & Inline Alerts

- Success (green), Warning (amber), Error (red), Info (blue).
- Non‑blocking; max 3 stacked.

---

## 6) Page‑by‑Page Redesign

### 6.1 Login

- Hero card centered, brand logomark (Coolvetica W).
- Email/Password; “Admin only” note.
- Error inline alert; remember me optional.
- After login → Overview.

### 6.2 Overview (Home)

- **KPI Row (4–6 tiles):** Active Sessions, Avg Focus Time, Avg Session, Screenshots Today, Productivity Index, Attendance Rate.
- **Productivity Breakdown:** doughnut + legend; hint card.
- **Live Sessions list:** compact tiles with photo/department and quick “View”.
- **Recent Screenshots:** 2×2 grid thumbnails with “View All”.

### 6.3 Employees

- Header with “Add Employee”, Filters, Export CSV.
- **Filters panel (drawer):** date range, department, status.
- **Data table:** Name/Email, Department, Role (badge), Total Break h, Total Work h, Hourly Rate (inline edit), Last Active, Status, Actions.
- **Row click → Side panel** with profile, recent screenshots, actions.

### 6.4 Attendance & Calendar

- **Attendance table:** day-by-day marks, totals, % present.
- **Calendar view:** Month grid; color dots: Present (green), Leave (amber), Absent (red).
- Export to CSV/PDF.

### 6.5 Timesheet & Monthly Hours

- Timesheet editor (week selector, per‑day hours, notes).
- Monthly Hours chart (stacked bars: productive/neutral/unproductive).
- Cumulative Hours line chart.

### 6.6 Productivity (Analytics / Breakdown / Reports & Rankings)

- **Analytics:** Trends by team/employee, filter by period/department.
- **Breakdown:** Category cards (Productive/Neutral/Unproductive) with progress bars and hour totals.
- **Reports & Rankings:** Leaderboard cards (top/bottom performers), team average, CSV export.

### 6.7 Screenshots

- Masonry or uniform grid; filters: employee, date, app tags.
- Lightbox viewer; metadata sidebar; download.

### 6.8 Audio

- List by employee/date, duration, transcript status (if available).
- Player with waveform (optional), transcript pane; privacy note.

### 6.9 Live Monitoring (WebRTC)

- **Header:** Active Streams count, Grid size select (1,4,9,16,25…), Connect status, Back button.
- **Sidebar:** Available employees (status pill, Start/Stop control).
- **Grid:** Aspect‑video tiles; controls overlay (Mute, Camera, Pause, Fullscreen).
- **Fullscreen:** dedicated modal with close button.
- **Light mode visuals:** white chrome, subtle borders; overlay buttons white with brand icon accents.

### 6.10 Breaks & Mute Events

- Tables with filters (date range, employee).
- Inline actions: resolve, comment.

### 6.11 Reports (General)

- Prebuilt templates: Weekly Summary, Monthly Productivity, Attendance Overview.
- Export PDF/CSV.
- Scheduled email (future).

### 6.12 Settings

- Organization profile, Roles & Permissions, WebRTC/TURN keys, Branding (logo).
- Admin‑only warnings for destructive changes.

---

## 7) Charts & Data‑Viz Components

- **ProductivityTrendChart:** Multi‑series line (team vs target).
- **MonthlyHoursChart:** Stacked bars (productive/neutral/unproductive).
- **CumulativeHoursChart:** Area cumulative, gradient fill (brand blue → transparent).
- **Distribution Pie/Doughnut:** Category breakdown.
- **Interaction:** tooltips (rounded), legend click to toggle series, responsive.

---

## 8) Forms & Validation

- **Field components:** Text, Email, Number, Currency, Date, Select, Combobox, Toggle, Slider, File.
- **Layout:** 12‑column responsive; label top; help text below.
- **Validation:** Zod schemas; show inline errors; disable submit until valid.
- **Add Employee Form:** Name, Email, Department, Role, Hourly Rate; server errors in toast + inline.

---

## 9) Auth & Access Control

- Keep Supabase Auth; session in RTK Query/TanStack; refresh token handling.
- **AuthGuard** wrapper per route; redirect unauthorized to `/unauthorized`.
- Role from profile (`ADMIN`/`USER`); feature gates on UI.

---

## 10) Realtime & WebRTC

- **Signaling:** Supabase Realtime channel per organization; throttled reconnect.
- **ICE servers:** env‑driven; provide OpenRelay fallback.
- **Connection states:** connecting / connected / error; tile overlays.
- **Resource cleanup:** on route leave/unmount.

---

## 11) Responsiveness & Layout Rules

- Mobile: stacked cards, drawer filters, collapsible sidebar (off‑canvas).
- Tablet: 2‑col; Desktop: 12‑col grid.
- Tables virtualize on >1000 rows; actions move to row kebab menu.

---

## 12) Motion & Micro‑Interactions

- 150–220ms ease‑out on hover/press; 300–400ms for modals.
- Count‑up animation for KPIs; shimmer skeletons for loading.
- Reduced‑motion: respect `prefers-reduced-motion`.

---

## 13) Accessibility & i18n

- Minimum contrast AA for text/buttons; verify blues on white.
- Focus order logical; all controls keyboard accessible with visible focus.
- ARIA roles on dialogs, toasts, tables; alt text on images/screenshot thumbnails.
- i18n ready (later **Tamil**): string catalogs with ICU message format.

---

## 14) Content & UX Writing

- **Tone:** Professional, concise, supportive.
- Buttons: verb‑first (“Add employee”, “View session”).
- Empty states: short message + primary action; include help link.

---

## 15) Assets & Brand

- **Logo:** Wordmark in Coolvetica; monochrome & blue variants.
- **Favicon/App icons:** SVG + PNG set.
- **Illustrations:** clean line + soft blue fills; consistent stroke weight.

---

## 16) Engineering Notes

- Error boundaries per page; global error banner.
- API layer: `/services` with typed clients; central error interceptor (401 → logout).
- Caching policies per endpoint; pagination patterns standardized.
- Feature flags scaffolding (env or server driven).
- ENV management: `.env.example` with `VITE_` variables (auth keys, TURN, supabase URLs).

---

## 17) Testing & QA

- **Unit:** UI primitives, reducers, hooks.
- **Integration:** forms, tables (sorting/filter), charts render.
- **E2E:** auth flow, overview KPIs, employee CRUD, live monitoring basic connect/disconnect.
- **A11y audits:** axe + keyboard traversal checklists.
- **Performance:** Lighthouse ≥ 90; CPU throttle test for video grid.

---

## 18) Delivery Checklist

- [ ] Tokens implemented; Tailwind config merged.
- [ ] AppShell (Topbar + Sidebar variants + breadcrumb).
- [ ] UI primitives complete (Buttons, Inputs, Cards, Badges, Modal, Table).
- [ ] Overview page parity with new KPIs.
- [ ] Employees: filters, table, side panel, CSV export.
- [ ] Productivity suite pages.
- [ ] Screenshots/Audios galleries.
- [ ] Live Monitoring grid and controls stable.
- [ ] Settings (roles, branding, TURN keys).
- [ ] A11y pass; i18n scaffolding; theming smoke tests.

---

## 19) Component Inventory (Map from Old → New)

- **KpiTile** → Light card with top label, large number, delta chip (green/red).
- **ProductivityBreakdown** → Doughnut + 3 category cards with progress bars.
- **ProductivityLeaderboard** → Two cards: Top Performers (green tints) / Needs Support (amber/red tints).
- **Table suite** → TanStack Table with toolbar (Search, Columns, Density, Export).
- **VideoStreamCard** → White frame, subtle border, light overlay buttons, PiP camera.

---

## 20) Open Questions (to confirm)

1. **Auth provider** stays Supabase? Any plan to migrate to Azure AD later (SSO/RBAC)?
2. **Multi‑tenant orgs:** single org for now or org switcher required?
3. **Brand usage:** Where to prefer **#234C90** vs **#3B82F6** (e.g., links vs primary buttons)?
4. **Charts:** Any mandated metrics beyond current (e.g., idle vs active micro‑breaks)?
5. **Screenshots storage:** CDN path and retention policy for download actions?
6. **Audio transcripts:** Needed in v2 (requires STT) or keep player only?
7. **Data volume:** Expected max rows (employees, sessions) to tune virtualization defaults.
8. **Email/PDF reports:** Which templates to prioritize for MVP?
9. **Localization:** Tamil timeline—require switcher in v1 or later?
10. **Iconography:** Approve Lucide set with custom brand icons?

---

## 21) Next Steps

1. Approve tokens, typography, and AppShell mockups.
2. Build UI primitives and AppShell in isolation (Storybook optional).
3. Migrate Overview → Employees → Live Monitoring sequentially.
4. QA + a11y + performance passes; finalize assets.
