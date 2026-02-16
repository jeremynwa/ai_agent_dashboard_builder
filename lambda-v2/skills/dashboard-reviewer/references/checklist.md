# Visual Quality Checklist

Review the dashboard code against each item below. Fix any violations.

## Layout & Structure

- [ ] `content-area` wrapper present with correct padding-top (for fixed header)
- [ ] Drawer + overlay pattern: `menuOpen` state, hamburger button, `nav-drawer` + `overlay`
- [ ] Header has app title + hamburger button
- [ ] Page navigation works (useState for activePage)
- [ ] Grid layouts use `grid-kpis` or proper CSS Grid with `auto-fit`

## KPIs

- [ ] Exactly 4 KPI cards on Vue d'Ensemble page
- [ ] Each KPI has: label, value, variation badge, sparkline
- [ ] Sparklines use `height={40}`, unique gradient IDs, distinct colors per KPI
- [ ] Values formatted with `fmt()`, `fmtCur()`, or `fmtPct()`
- [ ] Variation badges show up/down with correct colors (text-up / text-down)

## Charts

- [ ] Every chart wrapped in `<ResponsiveContainer width="100%" height={300}>`
- [ ] COLORS array defined: `const COLORS = ['#06B6D4','#EC4899','#8B5CF6','#F59E0B','#10B981','#3B82F6']`
- [ ] PieChart always has `<Cell fill={COLORS[i % COLORS.length]} />` per entry
- [ ] Chart cards have `section-title` heading
- [ ] Tooltips have dark styling: `contentStyle={{ background: '#1E293B', border: 'none' }}`
- [ ] Axis labels readable (not raw IDs, not overlapping)
- [ ] CartesianGrid with `strokeDasharray="3 3" stroke="#1E293B"`

## Tables

- [ ] Header cells use `table-header-cell` class
- [ ] Data cells use `table-cell` class
- [ ] Alternating row backgrounds (odd/even)
- [ ] Numbers right-aligned and formatted
- [ ] Limited to Top 10-15 rows (aggregated, not raw individual records)
- [ ] No raw ID columns visible

## Filters (Analyses page)

- [ ] `<select>` elements styled: `style={{ background:'#1A2332', color:'#E2E8F0', border:'1px solid #1E293B', borderRadius:'8px', padding:'8px 12px', outline:'none' }}`
- [ ] Filters use `useState` + `useMemo` to filter data
- [ ] Charts react to filter changes

## Points Cles (Key Takeaways)

- [ ] Section present at bottom of Vue d'Ensemble page
- [ ] Uses `insight-item` or `insight-bar` CSS classes
- [ ] 3-5 insights, each calculated from real data
- [ ] No fabricated comparisons (no "vs previous", "vs target" unless data supports it)

## Settings Page

- [ ] Present as third page
- [ ] Has proper dark theme styling
- [ ] Toggle switches or configuration items
- [ ] Consistent with overall design system

## Numbers & Formatting

- [ ] All numbers use formatting helpers (fmt, fmtCur, fmtPct)
- [ ] Currency values show EUR symbol
- [ ] Percentages show % symbol
- [ ] Large numbers abbreviated (K, M)
- [ ] No raw unformatted numbers displayed
