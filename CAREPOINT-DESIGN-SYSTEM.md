# CarePoint 365 Design System

A comprehensive design guide for building CarePoint 365 applications with a consistent, modern, and accessible user interface.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Colour Palette](#colour-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Icons](#icons)
6. [Components](#components)
7. [Page Layouts](#page-layouts)
8. [Status & State Indicators](#status--state-indicators)
9. [Animations & Transitions](#animations--transitions)
10. [Accessibility](#accessibility)
11. [Responsive Design](#responsive-design)
12. [Code Examples](#code-examples)

---

## Design Philosophy

### Core Principles

1. **Clean & Professional** - Healthcare applications require a trustworthy, professional appearance
2. **Emerald Identity** - Primary brand colour is emerald green, conveying health, growth, and reliability
3. **Clarity Over Decoration** - Every element serves a purpose; avoid unnecessary ornamentation
4. **Consistent Density** - Comfortable information density that balances data visibility with readability
5. **Accessible First** - WCAG 2.1 AA compliant colour contrast and interaction patterns

### Visual Language

- **Modern & Minimal** - Clean lines, generous whitespace, subtle shadows
- **Dark Sidebar, Light Content** - High contrast navigation with bright, readable content areas
- **Gradient Headers** - Emerald gradient headers create visual hierarchy and brand recognition
- **Card-Based Layouts** - Information organised in distinct, scannable cards

---

## Colour Palette

### Primary Colours (Emerald)

The primary colour family is emerald green, used for branding, primary actions, and active states.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary-50` | `#ecfdf5` | `236, 253, 245` | Subtle backgrounds, hover states |
| `primary-100` | `#d1fae5` | `209, 250, 229` | Light backgrounds, badges |
| `primary-200` | `#a7f3d0` | `167, 243, 208` | Borders, dividers |
| `primary-300` | `#6ee7b7` | `110, 231, 183` | Icons on dark backgrounds |
| `primary-400` | `#34d399` | `52, 211, 153` | Hover states |
| `primary-500` | `#10b981` | `16, 185, 129` | **Primary brand colour** |
| `primary-600` | `#059669` | `5, 150, 105` | Primary buttons, active states |
| `primary-700` | `#047857` | `4, 120, 87` | Pressed states, header gradient end |
| `primary-800` | `#065f46` | `6, 95, 70` | Dark accents |
| `primary-900` | `#064e3b` | `6, 78, 59` | Darkest accents |

### Secondary Colours (Amber)

Used for secondary actions, warnings, and attention-grabbing elements.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `secondary-100` | `#fef3c7` | `254, 243, 199` | Light backgrounds |
| `secondary-200` | `#fde68a` | `253, 230, 138` | Badges, highlights |
| `secondary-500` | `#f59e0b` | `245, 158, 11` | **Secondary brand colour** |
| `secondary-600` | `#d97706` | `217, 119, 6` | Hover states |
| `secondary-700` | `#b45309` | `180, 83, 9` | Pressed states |

### Neutral Colours (Slate)

Used for text, backgrounds, borders, and UI chrome.

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#f8fafc` | Page backgrounds |
| `slate-100` | `#f1f5f9` | Card backgrounds, elevation-1 |
| `slate-200` | `#e2e8f0` | Borders, dividers, elevation-2 |
| `slate-300` | `#cbd5e1` | Disabled states, subtle borders |
| `slate-400` | `#94a3b8` | Placeholder text, icons |
| `slate-500` | `#64748b` | Secondary text |
| `slate-600` | `#475569` | Body text |
| `slate-700` | `#334155` | **Primary text colour** |
| `slate-800` | `#1e293b` | Headings, sidebar background |
| `slate-900` | `#0f172a` | Darkest text |

### Semantic Colours

| Purpose | Colour | Hex | Usage |
|---------|--------|-----|-------|
| Success | Emerald | `#10b981` | Success messages, confirmations |
| Warning | Amber | `#f59e0b` | Warnings, attention needed |
| Error | Red | `#ef4444` | Errors, destructive actions |
| Info | Blue | `#3b82f6` | Informational messages |

### Shift Type Colours

| Shift Type | Background | Usage |
|------------|------------|-------|
| Day Shift | `#fef3c7` (amber-100) | Standard day shifts |
| Night Shift | `#dbeafe` (blue-100) | Night shifts |
| Sleep-In | `#ede9fe` (violet-100) | Sleep-in shifts |
| Overtime | `#fee2e2` (red-100) | Overtime shifts |
| Absence/Leave | `#fecaca` (red-200) | Staff on leave |

### Statistics Card Colours

| Stat Type | Bold | Light |
|-----------|------|-------|
| Day Stats | `#B6CFB6` | `#D4E2D4` |
| Night Stats | `#A8D1D1` | `#C6E4E4` |
| Community Stats | `#FDE7B1` | `#FDF1D3` |

---

## Typography

### Font Family

**Inter** is the primary font family, chosen for its excellent readability at all sizes and professional appearance.

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Include via HTML:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Display | 32px (2rem) | 700 (Bold) | 1.2 | Hero sections, large titles |
| H1 | 24px (1.5rem) | 700 (Bold) | 1.3 | Page titles |
| H2 | 20px (1.25rem) | 600 (Semibold) | 1.4 | Section headers |
| H3 | 18px (1.125rem) | 600 (Semibold) | 1.4 | Card titles |
| H4 | 16px (1rem) | 600 (Semibold) | 1.5 | Sub-section titles |
| Body | 14px (0.875rem) | 400 (Regular) | 1.5 | Default body text |
| Body Small | 13px (0.8125rem) | 400 (Regular) | 1.5 | Secondary text |
| Caption | 12px (0.75rem) | 400 (Regular) | 1.4 | Labels, captions |
| Tiny | 10px (0.625rem) | 500 (Medium) | 1.2 | Badges, tags |

### Text Colours

| Purpose | Colour | Token |
|---------|--------|-------|
| Primary text | `#334155` | `slate-700` |
| Secondary text | `#64748b` | `slate-500` |
| Headings | `#1e293b` | `slate-800` |
| On dark/gradient | `#ffffff` | `white` |
| On dark (muted) | `#d1fae5` | `emerald-100` |
| Links | `#10b981` | `primary-500` |
| Error text | `#ef4444` | `red-500` |

---

## Spacing & Layout

### Spacing Scale

Based on a 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `0.5` | 2px | Micro spacing, icon gaps |
| `1` | 4px | Tight spacing |
| `1.5` | 6px | Small gaps |
| `2` | 8px | Default small spacing |
| `3` | 12px | Medium spacing |
| `4` | 16px | Default padding |
| `5` | 20px | Large spacing |
| `6` | 24px | Section spacing |
| `8` | 32px | Large section gaps |
| `10` | 40px | Extra large spacing |
| `12` | 48px | Page margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Small elements, badges |
| `md` | 8px | Buttons, inputs |
| `lg` | 10px | Cards, modals |
| `xl` | 12px | Large cards |
| `2xl` | 16px | Prominent cards |
| `full` | 9999px | Pills, avatars |

### Layout Grid

- **Sidebar Width:** 224px (14rem) expanded, 64px (4rem) collapsed
- **Header Height:** 56px (3.5rem) simple, 64px (4rem) gradient
- **Content Max Width:** 1440px for wide layouts
- **Card Gap:** 16px (1rem) default, 24px (1.5rem) between sections

---

## Icons

### Icon Library

**Lucide React** is the standard icon library. It provides consistent, clean icons that match our design aesthetic.

```bash
npm install lucide-react
```

### Common Icons

| Purpose | Icon | Component |
|---------|------|-----------|
| Dashboard | Home | `<Home />` |
| Calendar/Schedule | Calendar | `<Calendar />` |
| Daily View | CalendarCheck | `<CalendarCheck />` |
| Weekly View | CalendarDays | `<CalendarDays />` |
| Staff/Users | Users | `<Users />` |
| Settings | Settings | `<Settings />` |
| Back | ArrowLeft | `<ArrowLeft />` |
| Menu | Menu | `<Menu />` |
| Close | X | `<X />` |
| Refresh | RefreshCw | `<RefreshCw />` |
| Notifications | Bell | `<Bell />` |
| Add/Create | Plus | `<Plus />` |
| Edit | Pencil | `<Pencil />` |
| Delete | Trash2 | `<Trash2 />` |
| Save | Save | `<Save />` |
| Search | Search | `<Search />` |
| Filter | Filter | `<Filter />` |
| Download | Download | `<Download />` |
| Upload | Upload | `<Upload />` |
| Copy | Copy | `<Copy />` |
| Check/Success | Check | `<Check />` |
| Warning | AlertTriangle | `<AlertTriangle />` |
| Error | AlertCircle | `<AlertCircle />` |
| Info | Info | `<Info />` |
| Clock/Time | Clock | `<Clock />` |
| Location | MapPin | `<MapPin />` |
| Building | Building2 | `<Building2 />` |
| User | User | `<User />` |
| Chevron Right | ChevronRight | `<ChevronRight />` |
| Chevron Down | ChevronDown | `<ChevronDown />` |
| Loader | Loader2 | `<Loader2 />` (animate-spin) |
| Send/Publish | Send | `<Send />` |
| Star/Leader | Star | `<Star />` |

### Icon Sizing

| Size | Pixels | Usage |
|------|--------|-------|
| `sm` | 16px (h-4 w-4) | Inline with text, badges |
| `md` | 20px (h-5 w-5) | Buttons, navigation |
| `lg` | 24px (h-6 w-6) | Headers, prominent actions |
| `xl` | 32px (h-8 w-8) | Empty states, feature icons |

---

## Components

### Buttons

#### Primary Button
```jsx
<button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  <Plus className="h-4 w-4" />
  Add Shift
</button>
```

#### Secondary Button (Amber)
```jsx
<button className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
  <Copy className="h-4 w-4" />
  Copy Week
</button>
```

#### Outline Button
```jsx
<button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
  <Filter className="h-4 w-4" />
  Filters
</button>
```

#### Ghost Button
```jsx
<button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
  <RefreshCw className="h-4 w-4" />
  Refresh
</button>
```

#### Icon Button
```jsx
<button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
  <X className="h-5 w-5" />
</button>
```

#### Destructive Button
```jsx
<button className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
  <Trash2 className="h-4 w-4" />
  Delete
</button>
```

### Cards

#### Standard Card
```jsx
<div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
  <h3 className="text-lg font-semibold text-slate-800">Card Title</h3>
  <p className="text-sm text-slate-600 mt-1">Card content goes here.</p>
</div>
```

#### Stat Card
```jsx
<div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
      <Users className="h-5 w-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-emerald-900">24</p>
      <p className="text-xs text-emerald-700">Staff on Shift</p>
    </div>
  </div>
</div>
```

#### Clickable Card
```jsx
<div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all">
  {/* Card content */}
</div>
```

### Inputs

#### Text Input
```jsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Label
  </label>
  <input
    type="text"
    placeholder="Placeholder text..."
    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors"
  />
</div>
```

#### Select/Dropdown
```jsx
<select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors">
  <option value="">Select option...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

#### Checkbox
```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
  />
  <span className="text-sm text-slate-700">Checkbox label</span>
</label>
```

### Badges & Pills

#### Status Badge
```jsx
// Success
<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
  Published
</span>

// Warning
<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
  Pending
</span>

// Error
<span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
  Absent
</span>

// Info
<span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
  Scheduled
</span>
```

#### Role Badge
```jsx
// Shift Leader
<span className="inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
  <Star className="h-3 w-3" fill="currentColor" />
  LEAD
</span>

// Act Up
<span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
  ACT-UP
</span>
```

### Modals & Flyouts

#### Modal Structure
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  
  {/* Modal */}
  <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-xl">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <h2 className="text-lg font-semibold text-slate-800">Modal Title</h2>
      <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
        <X className="h-5 w-5" />
      </button>
    </div>
    
    {/* Body */}
    <div className="px-6 py-4">
      {/* Content */}
    </div>
    
    {/* Footer */}
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
      <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Cancel
      </button>
      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        Confirm
      </button>
    </div>
  </div>
</div>
```

#### Flyout/Slide-Over Panel
```jsx
<div className="fixed inset-0 z-50">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  
  {/* Panel - slides from right */}
  <div className="absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-xl transition-transform">
    {/* Header */}
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h2 className="text-lg font-semibold text-slate-800">Panel Title</h2>
      <button onClick={onClose}>
        <X className="h-5 w-5 text-slate-400" />
      </button>
    </div>
    
    {/* Scrollable content */}
    <div className="h-full overflow-y-auto px-6 py-4">
      {/* Content */}
    </div>
  </div>
</div>
```

### Tables

```jsx
<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
  <table className="w-full">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50">
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          Name
        </th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status
        </th>
        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-sm text-slate-700">John Smith</td>
        <td className="px-4 py-3">
          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Active
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button className="text-slate-400 hover:text-slate-600">
            <Pencil className="h-4 w-4" />
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Empty States

```jsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
    <Calendar className="h-8 w-8 text-slate-400" />
  </div>
  <h3 className="text-lg font-semibold text-slate-800">No shifts found</h3>
  <p className="mt-1 text-sm text-slate-500 max-w-sm">
    There are no shifts scheduled for this period. Create a new shift to get started.
  </p>
  <button className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
    <Plus className="h-4 w-4" />
    Add Shift
  </button>
</div>
```

### Loading States

```jsx
// Spinner
<Loader2 className="h-5 w-5 animate-spin text-emerald-600" />

// Button with loading
<button disabled className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed">
  <Loader2 className="h-4 w-4 animate-spin" />
  Saving...
</button>

// Skeleton loading
<div className="animate-pulse space-y-3">
  <div className="h-4 w-3/4 rounded bg-slate-200" />
  <div className="h-4 w-1/2 rounded bg-slate-200" />
</div>
```

---

## Page Layouts

### Standard Page Layout

```jsx
<div className="flex h-screen">
  {/* Sidebar */}
  <SideNav />
  
  {/* Main content */}
  <div className="flex flex-1 flex-col overflow-hidden">
    {/* Gradient Header */}
    <header className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Page Title</h1>
          <p className="text-sm text-emerald-100">Subtitle or breadcrumb</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Header actions */}
        </div>
      </div>
    </header>
    
    {/* Page content */}
    <main className="flex-1 overflow-auto bg-slate-50 p-6">
      {/* Content here */}
    </main>
  </div>
</div>
```

### Sidebar Structure

- **Width:** 224px expanded, 64px collapsed
- **Background:** `slate-800`
- **Text:** White with `slate-400` for secondary
- **Active item:** `emerald-600` background
- **Hover:** `slate-700` background
- **Branding:** "CarePoint" in white, "365" in `emerald-400`

### Header Variants

#### Gradient Header (Primary)
```css
background: linear-gradient(to right, #059669, #047857); /* emerald-600 to emerald-700 */
color: white;
padding: 12px 16px;
```

#### Simple Header (Secondary)
```css
background: white;
border-bottom: 1px solid #e2e8f0; /* slate-200 */
height: 56px;
```

---

## Status & State Indicators

### Shift Status

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Published | `emerald-100` | `emerald-700` | - |
| Unpublished | `amber-100` | `amber-700` | `dashed amber-300` |
| Unassigned | `red-100` | `red-700` | - |

### Coverage Status

| Coverage | Background | Text | Usage |
|----------|------------|------|-------|
| 100% | `emerald-100` | `emerald-800` | Full coverage |
| 75-99% | `amber-100` | `amber-800` | Near target |
| <75% | `red-100` | `red-800` | Under-staffed |
| 0 shifts | `slate-100` | `slate-500` | No data |

### Attendance Status

| Status | Colour | Indicator |
|--------|--------|-----------|
| Present | Emerald | Green dot |
| Scheduled | Blue | Blue dot |
| Late | Amber | Orange dot |
| Absent | Red | Red dot |
| On Leave | Red background | Red badge |

---

## Animations & Transitions

### Standard Transitions

```css
/* Default transition for interactive elements */
transition: all 150ms ease-in-out;

/* Tailwind classes */
.transition-colors { transition-property: color, background-color, border-color; }
.transition-all { transition-property: all; }
.duration-150 { transition-duration: 150ms; }
.duration-300 { transition-duration: 300ms; }
```

### Loading Animation

```css
/* Spinner rotation */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; }
```

### Hover Effects

- **Buttons:** Darken background by one shade
- **Cards:** Add subtle shadow, optionally border colour change
- **Table rows:** Light background tint (`slate-50`)
- **Icons:** Colour change or slight scale

### Slide-in Panels

```css
/* Panel slides from right */
transform: translateX(100%);
transition: transform 300ms ease-in-out;

/* When open */
transform: translateX(0);
```

---

## Accessibility

### Colour Contrast

- All text meets WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Interactive elements have visible focus states
- Don't rely solely on colour to convey information

### Focus States

```css
*:focus-visible {
  outline: 2px solid #10b981; /* emerald-500 */
  outline-offset: 2px;
}
```

### ARIA Labels

- All interactive elements have accessible names
- Icons-only buttons use `aria-label`
- Modals use `aria-modal="true"` and proper focus management
- Loading states announced with `aria-busy`

### Keyboard Navigation

- All functionality accessible via keyboard
- Logical tab order
- Escape closes modals/flyouts
- Arrow keys for date navigation

---

## Responsive Design

### Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops/Desktops |
| `xl` | 1280px | Large screens |
| `2xl` | 1536px | Extra large screens |

### Mobile Considerations

- Sidebar becomes overlay on mobile (`< lg`)
- Tables scroll horizontally or convert to cards
- Touch targets minimum 44x44px
- Modals become full-screen
- Reduce information density

### Responsive Patterns

```jsx
// Hide on mobile, show on desktop
<div className="hidden lg:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">Mobile only</div>

// Responsive padding
<div className="p-4 lg:p-6">Content</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

---

## Code Examples

### CSS Variables Setup

```css
@theme {
  /* Primary colours - Emerald */
  --color-primary: #10b981;
  --color-primary-hover: #059669;
  --color-primary-pressed: #047857;
  
  /* Secondary colours - Amber */
  --color-secondary: #f59e0b;
  --color-secondary-hover: #d97706;
  
  /* Neutral colours - Slate */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  
  /* Semantic */
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #10b981;
  --color-info: #3b82f6;
  
  /* Typography */
  --font-family-sans: 'Inter', system-ui, sans-serif;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
}
```

### Tailwind Configuration

If using Tailwind CSS, extend the theme:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10b981',
          hover: '#059669',
          pressed: '#047857',
        },
        secondary: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

---

## Quick Reference

### Common Tailwind Classes

| Purpose | Classes |
|---------|---------|
| Primary button | `bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-4 py-2 font-medium` |
| Card | `bg-white rounded-lg border border-slate-200 shadow-sm p-4` |
| Input | `border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-500` |
| Badge | `inline-flex rounded-full px-2 py-0.5 text-xs font-medium` |
| Header gradient | `bg-gradient-to-r from-emerald-600 to-emerald-700 text-white` |
| Sidebar | `bg-slate-800 text-white` |
| Active nav | `bg-emerald-600 text-white` |
| Body text | `text-sm text-slate-700` |
| Secondary text | `text-sm text-slate-500` |
| Page title | `text-xl font-bold text-slate-800` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | December 2024 | Initial design system documentation |

---

*This design system is maintained by the CarePoint 365 development team. For questions or updates, contact the design lead.*

