# Mix Opportunity Diagnostics - Template Specification

> Reference document for reproducing this dashboard template in a dashboard builder app.

---

## 1. What This Dashboard Does

A **CPG/FMCG Mix Diagnostics** tool that helps brand teams analyze their product portfolio (SKUs) across retail channels. It answers:

- Where should we distribute more? (Channel Context)
- Where are the pricing/pack gaps? (Price x Pack)
- Which SKUs should we grow, defend, fix, or cut? (SKU Role Matrix)
- What are our strongest SKUs overall? (SKU Power Ranking)

The dashboards flow top-down: Channel Context gives the macro view, then each subsequent tab zooms into SKU-level detail.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (functional components, hooks only) |
| Build | Vite 5 |
| Language | TypeScript |
| Styling | Tailwind CSS 3 with custom design tokens |
| Charts | Recharts 2 |
| Icons | lucide-react |
| Utilities | clsx |
| Deploy | Docker + nginx, Google Cloud Build |

No routing library is used for navigation (tabs are managed via state in `App.tsx`). No state management library (just `useState` + `useCallback` + prop drilling).

---

## 3. Project Structure

```
src/
  App.tsx                          # Root: tab state, filter state, SKU selection state
  main.tsx                         # Entry point
  types/index.ts                   # All TypeScript interfaces
  lib/mockData.ts                  # Mock data generators + reference data + utility formatters
  styles/index.css                 # Tailwind layers: base, components (design system)
  components/
    layout/
      Layout.tsx                   # Shell: header, tab nav, filter panel, mobile menu
    charts/
      ChannelContext.tsx            # Tab 1: bar charts + KPIs + insight cards + data table
      PricePackScatter.tsx          # Tab 2: scatter/bubble chart + opportunity alerts + table
      SKURoleMatrix.tsx             # Tab 3: quadrant scatter + quadrant cards + action tables
      SKUPowerRanking.tsx           # Tab 4: sortable ranking table + score bars + reco cards
    common/
      KPICard.tsx                   # Reusable KPI metric card
      ChartTooltip.tsx              # Standard tooltip + BubbleTooltip for scatter charts
      ChartLegend.tsx               # Generic legend + BrandLegend variant
      ChannelRequired.tsx           # Empty state when required filter is missing
```

---

## 4. Design System

### 4.1 Theme (Dark Mode Only)

All colors are defined as Tailwind `extend.colors` tokens:

```
Surface palette (backgrounds):
  base:    #0F0F12    (page background)
  raised:  #16161A    (cards)
  overlay: #1C1C21    (overlays, active states)
  subtle:  #232329    (secondary backgrounds)
  border:  #2E2E36    (borders)
  muted:   #3D3D47    (heavy borders, scrollbars)

Brand color:
  sk-green: #00765F   (primary action color, with 50-900 scale)

Accent palette:
  amber:   #F59E0B    (warnings, second-priority)
  coral:   #EF6461
  sky:     #38BDF8    (info badges)
  violet:  #A78BFA
  emerald: #34D399    (success, positive trends)
  rose:    #FB7185

Text palette:
  primary:   #FFFFFF
  secondary: #A1A1AA
  tertiary:  #71717A
  muted:     #52525B
```

### 4.2 CSS Component Classes (defined in index.css @layer components)

| Class | Purpose |
|-------|---------|
| `.card` | Base card: bg-surface-raised, border, rounded-lg, shadow-card |
| `.card-hover` | Adds hover lift + shadow-card-hover |
| `.btn-primary` | Green CTA button |
| `.btn-secondary` | Subtle bordered button |
| `.btn-ghost` | Text-only button |
| `.select-input` | Styled select dropdown with custom chevron |
| `.badge` + variants | Pill badges: `-success`, `-warning`, `-danger`, `-info`, `-neutral` |
| `.data-table` | Full data table with sticky headers, hover rows, `.selected` row state |
| `.kpi-card` / `.kpi-value` / `.kpi-label` / `.kpi-change` | KPI card structure |
| `.chart-container` / `.chart-title` / `.chart-subtitle` | Chart wrapper |
| `.chart-tooltip` / `.tooltip-label` / `.tooltip-row` / `.tooltip-dot` | Tooltip structure |
| `.custom-scrollbar` | Thin styled scrollbar |

### 4.3 Animations

- `animate-fade-in`: opacity 0->1, 0.5s ease-out
- `animate-slide-up`: opacity + translateY(20px->0)
- `animate-scale-in`: opacity + scale(0.95->1), 0.3s

### 4.4 Typography

- Display: Sora (headings, KPI values)
- Body: Inter (default text)
- Mono: JetBrains Mono (data values, tables)

---

## 5. Data Architecture

### 5.1 Reference Data (dimensions for filters)

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `Channel` | id, name, color | Retail channels (Grocery, Mass, Club, Drug, etc.) |
| `Brand` | id, name, isOwned, color | `isOwned` distinguishes portfolio vs competitors |
| `Category` | id, name | Product categories |
| `PackType` | id, name | Single, 2-Pack, Travel, Club Pack, etc. |
| `TimePeriod` | id, name, startDate, endDate | L4W, L13W, L52W, YTD |

### 5.2 Metric Data (one interface per dashboard)

**ChannelMetrics** (Channel Context tab):
- dollarSales, distribution (ACV %), velocity (vol/ACV point)
- volumeSales, unitSales, shareOfCategory, yoyGrowth
- Data is provided as `totalMarket[]` vs `selectedBrand[]` for comparison

**PricePackItem** (Price x Pack tab):
- skuName, brandId, packSize, packSizeUnit
- pricePerUnit, pricePerPack
- dollarSales, volumeSales, distribution
- isOwned, packType, channel
- Also: `medianPriceBySize` reference line data

**SKURoleItem** (SKU Role Matrix tab):
- Same base SKU fields + distribution, velocity
- `quadrant`: computed enum `'expand' | 'defend' | 'fix' | 'question'`
- Quadrant is determined by position relative to median distribution & median velocity

**SKUPowerItem** (SKU Power Ranking tab):
- All SKU fields + incrementalCategoryVolume, incrementalPortfolioVolume
- `categoryHeroScore` (0-100): weighted composite of $ sales (40%), distribution (25%), velocity (20%), incremental volume (15%)
- `portfolioHeroScore` (0-100): portfolio share (35%), velocity vs avg (30%), incremental portfolio volume (35%)
- `overallRank`: sorted by categoryHeroScore

### 5.3 Filter State

```typescript
interface FilterState {
  category: string | null;       // single-select
  channel: string | null;        // single-select
  brands: string[];              // multi-select (implemented as single in UI)
  timePeriod: string;            // single-select, default 'l52w'
  packTypes: string[];           // multi-select (implemented as single in UI)
  showOwnedOnly: boolean;        // toggle
  packSizeRange: [number, number] | null;  // predefined ranges
}
```

Filters are owned by `App.tsx` and passed down to all tabs. Each tab applies filters via `useMemo` over the data arrays.

---

## 6. Dashboard Tabs - Detailed Patterns

### 6.1 Channel Context (`ChannelContext.tsx`)

**Purpose:** Macro view comparing brand performance vs total market across channels.

**Layout (top to bottom):**
1. Header with metric toggle (Dollar Sales / Distribution / Velocity)
2. KPI row (5 cards): Total Sales, Market Share, Avg Distribution, Avg Velocity, YoY Growth
3. Bar chart: side-by-side bars (Market vs Brand) per channel, using Recharts `BarChart`
4. Insight cards row (3 cards): Highest Velocity, Distribution Gap, Growth Potential - each with a navigation action to another tab
5. Data table: all channels with Sales, Distribution, Velocity, Share, YoY, Gap vs Market

**Interactions:**
- Toggle between Dollar Sales / Distribution / Velocity metrics
- Switch view mode: Compare / Market / Brand
- Click insight card "Explore" links to navigate to other tabs with pre-set filters
- Click table row to navigate to Price x Pack for that channel

**Key pattern:** Insight cards use computed analysis (best velocity channel, biggest distribution gap, growth potential) and link to deeper tabs with filter context.

### 6.2 Price x Pack Architecture (`PricePackScatter.tsx`)

**Purpose:** Visualize pricing architecture across pack sizes to find white spaces and mispricing.

**Layout:**
1. Header with price mode toggle ($/kg vs $/Pack)
2. Opportunity alerts row (3 cards): White Spaces, Overcrowded zones, Price Review items
3. Scatter/bubble chart: X = pack size (log scale), Y = price, Z (bubble size) = dollar sales
4. Interactive brand legend (click to filter)
5. Selected SKU detail bar
6. Data table with vs-Market deviation badges

**Key features:**
- Logarithmic X axis for pack sizes
- Market median reference line
- Bubble size = sqrt(dollarSales)
- Opportunity detection: white spaces (no owned SKUs in a size range), overcrowded (>8 SKUs), mispriced (>25% off median)
- Click bubble to select SKU, click brand legend to filter

### 6.3 SKU Role Matrix (`SKURoleMatrix.tsx`)

**Purpose:** Classify SKUs into 4 action quadrants based on Distribution x Velocity.

**Layout:**
1. Header
2. Quadrant summary cards (4): Expand, Defend, Fix, Question - clickable to filter
3. Scatter chart with 4 colored ReferenceArea backgrounds + median crosshairs
4. Brand legend
5. Two action tables side by side: Expand (top velocity, low dist) and Fix (low velocity, high dist)

**Quadrant logic:**
- **Expand** (top-left): velocity >= median, distribution < median - "grow distribution"
- **Defend** (top-right): velocity >= median, distribution >= median - "protect position"
- **Fix** (bottom-right): velocity < median, distribution >= median - "optimize or rationalize"
- **Question** (bottom-left): velocity < median, distribution < median - "evaluate potential"

**Key features:**
- `ReferenceArea` components for quadrant background colors
- `ReferenceLine` for median crosshairs
- Quadrant label overlays positioned absolutely
- Clickable quadrant cards to filter the scatter to one quadrant

### 6.4 SKU Power Ranking (`SKUPowerRanking.tsx`)

**Purpose:** Composite scoring to prioritize SKUs for action.

**Layout:**
1. Header with view mode toggle (All / Category Heroes / Portfolio Heroes)
2. Summary cards (4): Top Category Hero, Top Portfolio Hero, Avg Score, SKU Count
3. Expandable methodology section (scoring weights disclosure)
4. Sortable data table: rank badges, score bars (inline progress bars), all metrics
5. Action recommendation cards (3): Defend, Expand, Review

**Key features:**
- `ScoreBar` inline component: 20px-wide progress bar with colored fill
- Rank badges: Crown icon (#1), Trophy icon (#2, #3), `#N` for rest
- All columns sortable (click header toggles asc/desc)
- Score methodology is transparently shown (expandable)

---

## 7. Reusable Component Patterns

### 7.1 KPICard
```
Props: label, value, format ('currency'|'number'|'percent'), change (number), icon, trend
```
Auto-determines trend direction from change value. Shows: label, formatted value, change with trend icon.

### 7.2 ChartTooltip / BubbleTooltip
- `ChartTooltip`: for bar charts. Auto-formats values based on name heuristics (contains "dollar" -> currency, etc.)
- `BubbleTooltip`: for scatter charts. Shows SKU name, brand, owned badge, configurable field list.

### 7.3 ChannelRequired (Empty State)
Shown when a required filter (channel or category) is not selected. CTA opens the filter panel.

### 7.4 Common Interaction Patterns
- **SKU selection**: click bubble/row -> highlights it, dims others, shows detail bar
- **Brand filtering**: click legend item -> dims non-matching, toggle off
- **Tab-to-tab navigation**: insight cards carry filter context (e.g., channel ID) to the target tab
- **Filter panel**: collapsible, stays open until user closes. Shows active filter count badge. Highlights required filters with amber ring.

---

## 8. Chart Configuration Patterns (Recharts)

### Bar Charts
```tsx
<BarChart barGap={2} barCategoryGap="25%" barSize={12}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(46,46,54,0.5)" />
  <XAxis angle={-45} textAnchor="end" height={60} interval={0} />
  <YAxis tickLine={false} axisLine={false} />
  <Tooltip content={<ChartTooltip />} />
  <Bar radius={[2,2,0,0]} />  {/* rounded top corners */}
</BarChart>
```

### Scatter/Bubble Charts
```tsx
<ScatterChart>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis type="number" scale="log" />   {/* log scale for size-based axes */}
  <YAxis type="number" />
  <ZAxis type="number" range={[40, 300]} />  {/* bubble size range */}
  <ReferenceLine />                     {/* medians, benchmarks */}
  <ReferenceArea />                     {/* quadrant backgrounds */}
  <Scatter>
    <Cell fill={color} fillOpacity={opacity} stroke={...} strokeWidth={...} />
  </Scatter>
</ScatterChart>
```

### Chart Styling Constants
- Grid stroke: `rgba(46, 46, 54, 0.5)`
- Axis tick fill: `#a1a1aa`, fontSize: 10
- Reference line stroke: `#52525B`, dasharray `5 5`
- Chart heights: 280px (bar), 320px (scatter)

---

## 9. Layout Pattern

```
+-----------------------------------------------------------+
| Header: Logo | Tab Navigation (desktop) | Filters + Menu  |
|   [Collapsible Filter Panel: 6-col grid of selects]       |
+-----------------------------------------------------------+
| Main Content (max-w-[1800px], px-3 sm:px-4 lg:px-6 py-4) |
|   [Active Tab Component]                                   |
+-----------------------------------------------------------+
```

- Sticky header with `backdrop-blur-xl`
- Mobile: hamburger menu slides in from right as overlay
- Filter panel: animated max-height transition, grid of 6 select dropdowns + owned toggle + active filter pills
- No sidebar - everything is in the top bar

---

## 10. Key Design Decisions to Preserve

1. **Dark theme only** - all colors assume dark background
2. **Compact density** - small text sizes (10px-12px), tight padding (p-2, p-3), narrow gaps
3. **Data-heavy tables** - scrollable with sticky headers, max-height constrained
4. **Progressive disclosure** - KPIs first, then chart, then table, then recommendations
5. **Cross-linking between tabs** - insight cards navigate with filter context
6. **Owned vs competitor distinction** - visual badges, legend checkmarks, owned-only toggle
7. **Bubble size = revenue** - consistent across all scatter charts (sqrt scale)
8. **Median-based quadrants** - SKU Role Matrix uses data medians, not fixed thresholds
9. **Score transparency** - Power Ranking shows its methodology/weights
10. **Empty states** - graceful handling when required filters are missing
