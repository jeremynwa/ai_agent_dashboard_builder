# Design System CSS — Classes Disponibles

Un fichier `ds.css` est pre-charge. Utilise `className=""` avec ces classes.
Utilise aussi `style={{}}` pour les valeurs dynamiques ou specifiques.

## Layout
min-h-screen, h-screen, w-full, overflow-y-auto, overflow-x-auto, overflow-hidden, relative, absolute, fixed, inset-0, top-0, left-0, right-0, bottom-0, z-50, z-999, z-1000

## Flexbox
flex, inline-flex, flex-col, flex-wrap, items-center, items-start, items-end, justify-center, justify-between, justify-end, flex-1, shrink-0

## Grid
grid, grid-cols-1/2/3/4/5, col-span-2

Responsive grids:
- `grid-kpis` — auto-fit minmax(220px, 1fr)
- `grid-charts-2` — 1 col a 768px: 2 cols
- `grid-charts-3` — 1 col a 768px: 2 cols a 1200px: 3 cols

## Gap
gap-1(4px) gap-2(8px) gap-3(12px) gap-4(16px) gap-5(20px) gap-6(24px) gap-8(32px)

## Padding
p-0 a p-8, px-2 a px-7, py-1 a py-4

## Margin
mb-1 a mb-8, mt-2 mt-4 mt-6

## Backgrounds
bg-base(#0B1120) bg-card(#111827) bg-card-hover(#1A2332) bg-card-alt(#0D1526) bg-accent(#06B6D4) bg-accent-10 bg-magenta bg-violet bg-amber bg-up bg-up-10 bg-down bg-down-10 bg-black-50 bg-transparent

## Text
text-primary(#F1F5F9) text-secondary(#94A3B8) text-tertiary(#64748B) text-accent text-magenta text-violet text-amber text-up text-down text-white

## Borders
border, border-b, border-t, border-r, border-l, border-none

## Border Radius
rounded(6px) rounded-lg(10px) rounded-xl(14px) rounded-full rounded-sm(2px)

## Typography
Sizes: text-xs(12) text-sm(14) text-base(16) text-lg(18) text-xl(20) text-2xl(24) text-3xl(30) text-11 text-13 text-15 text-28

Weights: font-normal font-medium font-semibold font-bold

Deco: uppercase tracking-wider leading-tight leading-relaxed text-left text-center text-right truncate

## Transition & Transform
transition, transition-transform, transition-colors, translate-x-0, -translate-x-full

## Interaction
cursor-pointer, select-none

## Animation
animate-pulse

## Composants Pre-definis

- **card** — bg #111827, rounded-xl, border, p-24
- **kpi-card** — card + flex-col + gap-6
- **kpi-label** — 11px uppercase text-tertiary
- **kpi-value** — 28px bold text-primary
- **kpi-comparison** — 12px text-secondary
- **badge-up** / **badge-down** — 13px semibold vert/rouge
- **section-title** — 15px semibold mb-16
- **app-header** — 60px fixed header bg-card-alt
- **nav-item** / **nav-item-active** — sidebar nav items
- **tab-btn** / **tab-btn-active** — header tabs
- **hamburger** + **hamburger-line** — menu button (3 lignes)
- **overlay** — fixed bg noir 50%, z-999
- **drawer** + **drawer-open** / **drawer-closed** — panneau lateral, z-1000
- **content-area** — padding + scroll + h-calc(100vh-60px)
- **insight-item** + **insight-bar** + **insight-bar-up/down/accent** + **insight-text** — points cles
- **table-header-cell**, **table-cell**, **table-row-even**, **table-row-odd** — tableau
- **hover-card**, **hover-bg** — hover helpers
- **skeleton** — loading placeholder avec pulse
