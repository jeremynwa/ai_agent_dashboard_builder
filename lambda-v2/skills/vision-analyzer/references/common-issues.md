# Common Visual Issues & Fixes

## 1. Overlapping Elements

**Symptom**: Charts overflow their container, KPI cards overlap on narrow widths.

**Fix**:
- Wrap every chart in `<ResponsiveContainer width="100%" height={300}>`
- Add `overflow: hidden` to chart card containers
- Use `grid-kpis` class (auto-fit responsive grid) instead of fixed-column grids

## 2. Empty/Wasted Space

**Symptom**: Large blank areas between sections, content not filling the page.

**Fix**:
- Check `margin-bottom` / `mb-*` values — reduce if too large
- Ensure grid columns fill available space (`1fr` or `auto-fit`)
- Verify all pages have content (no empty page shells)

## 3. Unreadable Text

**Symptom**: Text invisible or barely visible on dark background, too small to read.

**Fix**:
- Use DS text classes: `text-primary` (#E2E8F0), `text-secondary` (#94A3B8), `text-accent` (#06B6D4)
- Never use dark text colors on dark backgrounds
- Minimum font size: 12px for labels, 14px for body text
- Chart axis labels: `tick={{ fill: '#94A3B8', fontSize: 12 }}`

## 4. Charts Cut Off

**Symptom**: Chart bars/lines extend beyond visible area, axes not showing.

**Fix**:
- Always use `<ResponsiveContainer width="100%" height={300}>`
- Add padding to chart container: `margin={{ top: 5, right: 20, left: 20, bottom: 5 }}`
- Ensure parent has explicit height or uses flex layout

## 5. Grey PieChart

**Symptom**: All PieChart slices are the same grey color.

**Fix**:
- Add `<Cell>` elements inside `<Pie>`:
```jsx
<Pie data={data} dataKey="value">
  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
</Pie>
```
- Define COLORS array: `const COLORS = ['#06B6D4','#EC4899','#8B5CF6','#F59E0B','#10B981','#3B82F6']`

## 6. Misaligned KPI Cards

**Symptom**: KPI cards different sizes, not aligned in a row, uneven spacing.

**Fix**:
- Use `className="grid-kpis"` on the container
- Each KPI card uses `className="kpi-card"` with consistent inner structure
- Sparklines all use `height={40}` for uniformity

## 7. Broken Filter Selects

**Symptom**: White/default browser selects on dark background — looks broken.

**Fix**:
- Required inline style on every `<select>`:
```jsx
style={{
  background: '#1A2332',
  color: '#E2E8F0',
  border: '1px solid #1E293B',
  borderRadius: '8px',
  padding: '8px 12px',
  outline: 'none',
}}
```

## 8. Invisible Table Headers

**Symptom**: Table header row blends into background, can't distinguish from data.

**Fix**:
- Header cells: `className="table-header-cell"`
- Data cells: `className="table-cell"`
- Table container: `className="table-container"`

## 9. Sparklines Too Large

**Symptom**: Sparklines in KPI cards are oversized, pushing content out.

**Fix**:
- Always use `height={40}` for sparkline SVGs
- Each sparkline needs a unique gradient ID (e.g., `sparkGrad1`, `sparkGrad2`)

## 10. Content Behind Fixed Header

**Symptom**: Top content hidden behind the fixed header bar.

**Fix**:
- Main content wrapper must use `className="content-area"` which includes proper `padding-top`
- Or add explicit `paddingTop: '80px'` if not using the DS class

## 11. Drawer/Menu Issues

**Symptom**: Navigation menu doesn't appear, or appears but can't close.

**Fix**:
- Hamburger button toggles `menuOpen` state
- Drawer uses `className={`nav-drawer ${menuOpen ? 'open' : ''}`}`
- Overlay: `{menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}`
- Clicking a nav item closes the drawer

## 12. Chart Tooltip Invisible

**Symptom**: Hovering over chart shows white/default tooltip that's hard to read.

**Fix**:
- Add dark tooltip styling:
```jsx
<Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px' }} />
```

## 13. Truncated/Overlapping Axis Labels

**Symptom**: X-axis labels overlap each other or are cut off, especially with long category names or many data points.

**Fix**:
- Rotate labels: `<XAxis angle={-45} textAnchor="end" height={80} />`
- Or truncate long names: `tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '...' : v}`
- Increase bottom margin: `margin={{ bottom: 40 }}`
- For many data points (>15), use `interval={Math.ceil(data.length / 10)}` to skip labels

## 14. Legend Overflow/Clipping

**Symptom**: Chart legend extends beyond card boundaries, overlaps other content, or items are cut off.

**Fix**:
- Use vertical legend for many items: `<Legend layout="vertical" align="right" verticalAlign="middle" />`
- Limit PieChart data to 6-8 slices max — group remaining into "Autres"
- Add `wrapperStyle={{ paddingTop: '10px' }}` to prevent overlap with chart area
- Ensure parent card has enough height to accommodate legend

## 15. Badge Color Logic Error

**Symptom**: Positive variations shown in red (badge-down) and negative variations in green (badge-up), or all badges same color regardless of value.

**Fix**:
- Standard metrics (CA, commandes): positive=green (`badge-up`), negative=red (`badge-down`)
- Inverse metrics (churn, couts, retours): positive=red (`badge-up`), negative=green (`badge-down`)
- Use conditional class: `className={variation >= 0 ? 'badge-up' : 'badge-down'}`
- For inverse metrics: `className={variation >= 0 ? 'badge-down' : 'badge-up'}`
- Always prefix with sign: `{variation >= 0 ? '+' : ''}{fmtPct(variation)}`

## 16. Empty Chart State

**Symptom**: Chart renders as blank rectangle — no bars, lines, or slices visible, even though the chart component is present.

**Fix**:
- Check if filtered data is empty — add guard: `if (filteredData.length === 0) return <p className="text-secondary">Aucune donnee pour ces filtres</p>`
- Verify `dataKey` matches actual object keys (case-sensitive)
- BarChart needs `<Bar dataKey="value" />` child, AreaChart needs `<Area>`, LineChart needs `<Line>`
- PieChart: ensure `<Pie data={data}>` receives non-empty array with positive numeric values
- Check that data values are numbers, not strings: `Number(r.amount) || 0`
