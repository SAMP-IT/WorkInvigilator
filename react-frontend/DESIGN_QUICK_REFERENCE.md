# Premium Design System - Quick Reference

## Utility Classes Cheat Sheet

### Animations
```css
animate-fade-in          /* Fade in from opacity 0 */
animate-slide-in-up      /* Slide up from 16px below */
animate-slide-in-down    /* Slide down from 16px above */
animate-slide-in-left    /* Slide from left */
animate-slide-in-right   /* Slide from right */
animate-scale-in         /* Scale from 0.95 to 1 */
animate-shimmer          /* Loading shimmer effect */
```

### Glass Morphism
```css
glass                    /* Standard glass effect */
glass-dark              /* Dark glass variant */
glass-hover             /* Enhanced on hover */
```

### Premium Shadows
```css
shadow-premium          /* Subtle multi-layer */
shadow-elevated         /* Medium elevation */
shadow-premium-lg       /* Large elevation */
shadow-glow-blue        /* Blue glow */
shadow-glow-green       /* Green glow */
shadow-glow-red         /* Red glow */
shadow-glow-yellow      /* Yellow glow */
```

### Gradient Text
```css
gradient-text-blue      /* Blue to indigo */
gradient-text-purple    /* Purple gradient */
gradient-text-green     /* Green gradient */
```

### Gradient Backgrounds
```css
gradient-bg-blue        /* Blue to indigo */
gradient-bg-indigo      /* Indigo gradient */
gradient-bg-purple      /* Purple gradient */
gradient-bg-green       /* Emerald to green */
gradient-bg-red         /* Red gradient */
gradient-bg-orange      /* Orange gradient */
```

### Hover Effects
```css
hover-lift              /* Lift with shadow */
hover-scale             /* Scale 1.02 */
```

### Status Indicators
```css
status-indicator        /* Base indicator */
status-online          /* Green pulsing */
status-offline         /* Gray indicator */
status-idle            /* Yellow indicator */
```

---

## Component Props Reference

### Button
```tsx
<Button
  variant="primary"        // primary | secondary | outline | ghost | danger | success
  size="md"               // xs | sm | md | lg | xl
  loading={false}
  icon={<Icon />}
  iconPosition="left"     // left | right
/>
```

### Card
```tsx
<Card
  hover={true}            // Lift on hover
  elevated={false}        // Enhanced shadow
  glass={false}           // Glass morphism
  gradient="blue"         // blue | purple | green | orange | none
  padding="md"            // none | sm | md | lg
/>
```

### Badge
```tsx
<Badge
  variant="primary"       // default | primary | success | warning | danger | info | outline
  size="sm"              // sm | md | lg
  glow={false}           // Add glow effect
  pulse={false}          // Pulse animation
/>
```

### Avatar
```tsx
<Avatar
  src="/image.jpg"
  alt="User"
  fallback="John Doe"
  size="md"              // sm | md | lg
  status="online"        // online | offline | away
/>
```

---

## Color Palette

### Primary Colors
```
Blue 500:    #3B82F6
Indigo 600:  #4F46E5
Slate 50:    #FAFBFC
Slate 900:   #0F172A
```

### Status Colors
```
Success:  #10B981 (Emerald 500)
Warning:  #F59E0B (Amber 500)
Error:    #EF4444 (Red 500)
Info:     #3B82F6 (Blue 500)
```

### Background Colors
```
Primary BG:    #FAFBFC (Slate 50)
Card BG:       #FFFFFF (White)
Elevated BG:   #F8FAFC (Slate 50)
Border:        #E2E8F0 (Slate 200)
```

---

## Spacing System (8px Grid)

```
space-1  = 4px   (0.25rem)
space-2  = 8px   (0.5rem)
space-3  = 12px  (0.75rem)
space-4  = 16px  (1rem)
space-6  = 24px  (1.5rem)
space-8  = 32px  (2rem)
space-12 = 48px  (3rem)
space-16 = 64px  (4rem)
```

---

## Typography Scale

### Font Sizes
```
text-xs:   12px  (0.75rem)
text-sm:   14px  (0.875rem)
text-base: 16px  (1rem)
text-lg:   18px  (1.125rem)
text-xl:   20px  (1.25rem)
text-2xl:  24px  (1.5rem)
text-3xl:  30px  (1.875rem)
text-4xl:  36px  (2.25rem)
text-5xl:  48px  (3rem)
```

### Font Weights
```
font-medium:   500
font-semibold: 600
font-bold:     700
```

---

## Border Radius

```
rounded-lg:   8px   (0.5rem)
rounded-xl:   12px  (0.75rem)
rounded-2xl:  16px  (1rem)
rounded-full: 9999px
```

---

## Common Patterns

### KPI Card
```tsx
<Card hover gradient="green">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          Metric Name
        </p>
      </div>
      <div className="text-4xl font-bold text-emerald-600 mb-2">
        1,234
      </div>
      <p className="text-sm text-slate-600 font-medium">
        Description text
      </p>
    </div>
    <Badge variant="success" glow size="sm">
      Live
    </Badge>
  </div>
</Card>
```

### Status Badge with Glow
```tsx
<Badge variant="success" glow pulse>
  Active
</Badge>
```

### Gradient Title
```tsx
<CardTitle gradient>
  Dashboard Overview
</CardTitle>
```

### Icon Container
```tsx
<div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
  <Icon className="w-5 h-5 text-blue-600" />
</div>
```

### Loading Skeleton
```tsx
<div className="h-4 bg-slate-200 rounded animate-shimmer" />
```

### Glass Card
```tsx
<Card glass elevated>
  <CardContent>
    Translucent content with blur
  </CardContent>
</Card>
```

---

## Animation Delays

For staggered animations:
```tsx
<Card style={{ animationDelay: '0.1s' }} />
<Card style={{ animationDelay: '0.2s' }} />
<Card style={{ animationDelay: '0.3s' }} />
```

---

## Responsive Utilities

### Breakpoints
```
sm:   640px  (Mobile landscape)
md:   768px  (Tablet)
lg:   1024px (Desktop)
xl:   1280px (Large desktop)
```

### Common Patterns
```tsx
// Hide on mobile, show on desktop
<div className="hidden md:flex">

// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// Responsive text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

---

## Performance Tips

1. Use `transform` for animations (GPU accelerated)
2. Add `will-change` for frequently animated elements
3. Use `backdrop-filter` for glass effects
4. Prefer CSS animations over JavaScript
5. Use `transition-all` sparingly (specify properties)

---

## Accessibility

### Focus States
All interactive elements have:
```css
focus:outline-none
focus:ring-2
focus:ring-blue-500
focus:ring-offset-2
```

### Color Contrast
- Primary text: 21:1 (Slate 900)
- Secondary text: 7:1 (Slate 600)
- All badges: WCAG AA compliant

---

## Common Mistakes to Avoid

❌ **Don't**:
```tsx
<div className="rounded-lg shadow-sm">  // Old style
<button className="bg-blue-500">       // Flat colors
<Badge>Status</Badge>                   // No variant
```

✅ **Do**:
```tsx
<div className="rounded-2xl shadow-premium">     // New style
<Button variant="primary">                       // Gradient
<Badge variant="success" glow>Status</Badge>     // With effects
```

---

## Quick Copy-Paste Snippets

### Premium Button
```tsx
<Button
  variant="primary"
  size="lg"
  icon={<CheckIcon />}
  className="shadow-glow-blue"
>
  Confirm Action
</Button>
```

### Stat Card
```tsx
<Card hover gradient="blue">
  <div className="text-4xl font-bold gradient-text-blue mb-2">
    {value}
  </div>
  <p className="text-sm text-slate-600 font-medium">
    {label}
  </p>
</Card>
```

### Live Indicator
```tsx
<div className="flex items-center space-x-2">
  <div className="relative">
    <div className="w-2 h-2 bg-green-500 rounded-full" />
    <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping" />
  </div>
  <span className="text-xs font-semibold text-green-600">
    Live
  </span>
</div>
```

### Glass Container
```tsx
<div className="glass rounded-2xl p-6 shadow-premium-lg">
  Content with blur effect
</div>
```

---

**Last Updated**: 2025-10-28
**Version**: 2.0.0
