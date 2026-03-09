# Recharts API Reference (v2.15+)

Ce fichier documente les composants Recharts EXACTS a utiliser. NE PAS inventer de props ou composants qui n'existent pas ici.

## Imports Valides

```jsx
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ComposedChart,
  CartesianGrid, XAxis, YAxis,
  Tooltip, Legend,
  Sparklines // N'EXISTE PAS — utiliser un mini AreaChart a la place
} from 'recharts';
```

**ATTENTION**: `Sparklines` n'est PAS un composant Recharts. Pour les sparklines dans les KPIs, utiliser un mini `AreaChart` dans un `ResponsiveContainer` de height=40.

## ResponsiveContainer

Wrapper OBLIGATOIRE autour de tout graphique.

```jsx
<ResponsiveContainer width="100%" height={300}>
  {/* UN SEUL enfant direct */}
</ResponsiveContainer>
```

**Props valides**: `width`, `height`, `minWidth`, `minHeight`, `aspect`, `debounce`
**ERREUR COURANTE**: ne PAS mettre 2 enfants dans un ResponsiveContainer.

## AreaChart

```jsx
<AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
  <defs>
    <linearGradient id="gradientId" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
  <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="url(#gradientId)" strokeWidth={2} />
</AreaChart>
```

### Area Props
| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| dataKey | string | OUI | Cle dans l'objet data |
| type | string | non | "monotone", "linear", "step", "basis" (defaut: "linear") |
| stroke | string | non | Couleur de la ligne |
| fill | string | non | Couleur de remplissage ou "url(#gradientId)" |
| strokeWidth | number | non | Epaisseur de la ligne |
| dot | bool/object | non | false pour masquer les points |
| activeDot | bool/object | non | Point au survol |
| stackId | string | non | Pour empiler plusieurs Area |

**IMPORTANT**: chaque `linearGradient` doit avoir un `id` UNIQUE dans tout le composant. Si 2 AreaCharts utilisent le meme `id`, les gradients se melangent.

## BarChart

```jsx
<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
  <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Bar dataKey="value" fill="#06B6D4" radius={[4,4,0,0]} />
</BarChart>
```

### Bar Props
| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| dataKey | string | OUI | Cle numerique dans l'objet data |
| fill | string | non | Couleur de remplissage |
| radius | array | non | [topLeft, topRight, bottomRight, bottomLeft] pour coins arrondis |
| stackId | string | non | Pour empiler (stacked bar) |
| barSize | number | non | Largeur en pixels |
| name | string | non | Nom affiche dans Legend/Tooltip |

**ERREUR COURANTE**: oublier `<Bar>` enfant — sans lui, rien ne s'affiche.

## LineChart

```jsx
<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
  <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} dot={false} />
</LineChart>
```

### Line Props
| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| dataKey | string | OUI | Cle dans l'objet data |
| type | string | non | "monotone", "linear", "step" |
| stroke | string | non | Couleur de la ligne |
| strokeWidth | number | non | Epaisseur |
| dot | bool/object | non | false pour masquer les points |
| strokeDasharray | string | non | "5 5" pour ligne pointillee |
| name | string | non | Nom dans Legend/Tooltip |

## PieChart

```jsx
<PieChart>
  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
    {pieData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Legend wrapperStyle={{ color:'#94A3B8', fontSize:'12px' }} />
</PieChart>
```

### Pie Props
| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| data | array | OUI | Tableau d'objets |
| dataKey | string | OUI | Cle numerique (la valeur) |
| nameKey | string | OUI | Cle string (le label) |
| cx | string/number | non | Centre X (defaut "50%") |
| cy | string/number | non | Centre Y (defaut "50%") |
| outerRadius | number | non | Rayon externe |
| innerRadius | number | non | Rayon interne (donut si > 0) |
| paddingAngle | number | non | Espace entre tranches |
| label | bool/func | non | true pour labels externes |

**OBLIGATOIRE**: `<Cell>` avec COLORS — sans Cell, tout est gris.
**OBLIGATOIRE**: `<Legend>` — sans Legend, impossible de distinguer les tranches.

## ComposedChart

Pour combiner Bar + Line + Area dans un meme graphique.

```jsx
<ComposedChart data={data}>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
  <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Bar dataKey="amount" fill="#06B6D4" radius={[4,4,0,0]} />
  <Line type="monotone" dataKey="trend" stroke="#EC4899" strokeWidth={2} dot={false} />
</ComposedChart>
```

## Composants Utilitaires

### CartesianGrid
```jsx
<CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
```
Props: `strokeDasharray`, `stroke`, `horizontal`, `vertical`

### XAxis
```jsx
<XAxis
  dataKey="name"
  tick={{ fill:'#64748B', fontSize:11 }}
  axisLine={{ stroke:'#1E293B' }}
  tickLine={false}
  angle={-45}           // optionnel: rotation si labels longs
  textAnchor="end"      // obligatoire si angle
  height={60}           // augmenter si labels rotates
  interval={0}          // 0 = afficher tous les labels
/>
```

### YAxis
```jsx
<YAxis
  tick={{ fill:'#64748B', fontSize:11 }}
  axisLine={{ stroke:'#1E293B' }}
  tickFormatter={v => fmt(v)}
  width={60}            // augmenter si grands nombres
/>
```

**Pour 2 axes Y** (gauche + droite):
```jsx
<YAxis yAxisId="left" tick={{ fill:'#64748B', fontSize:11 }} tickFormatter={v => fmt(v)} />
<YAxis yAxisId="right" orientation="right" tick={{ fill:'#64748B', fontSize:11 }} />
<Bar yAxisId="left" dataKey="revenue" fill="#06B6D4" />
<Line yAxisId="right" dataKey="count" stroke="#EC4899" />
```

### Tooltip
```jsx
<Tooltip
  contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }}
  formatter={(value, name) => [fmt(value), name]}
  labelFormatter={(label) => `Periode: ${label}`}
/>
```
Props: `contentStyle`, `formatter`, `labelFormatter`, `cursor`, `active`

### Legend
```jsx
<Legend wrapperStyle={{ color:'#94A3B8', fontSize:'12px' }} />
```
Props: `wrapperStyle`, `verticalAlign`, `align`, `iconType`, `iconSize`

## Mini Sparkline (pour KPIs)

Recharts n'a PAS de composant Sparkline natif. Utiliser ce pattern:

```jsx
<ResponsiveContainer width="100%" height={40}>
  <AreaChart data={sparkData} margin={{ top:0, right:0, left:0, bottom:0 }}>
    <Area type="monotone" dataKey="v" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
  </AreaChart>
</ResponsiveContainer>
```

**PAS de CartesianGrid, XAxis, YAxis, Tooltip** dans les sparklines — c'est une micro-visualisation.

## Props qui N'EXISTENT PAS (erreurs courantes)

- `<AreaChart smooth>` — n'existe pas, utiliser `<Area type="monotone">`
- `<Bar color="...">` — n'existe pas, utiliser `fill`
- `<Pie colors={[...]}>` — n'existe pas, utiliser `<Cell fill>`
- `<Chart>` — n'existe pas, utiliser le type specifique (AreaChart, BarChart, etc.)
- `<Sparkline>` ou `<Sparklines>` — n'existe pas dans Recharts
- `<XAxis label="...">` — pour un label d'axe utiliser `<XAxis><Label value="..." position="bottom" /></XAxis>`
- `<Tooltip theme="dark">` — n'existe pas, utiliser `contentStyle`

## Format des Donnees

Recharts attend un tableau d'objets plats:
```jsx
// BON
const data = [
  { name: 'Jan', revenue: 4000, cost: 2400 },
  { name: 'Feb', revenue: 3000, cost: 1398 },
];

// MAUVAIS — pas d'objets imbriques
const data = [
  { name: 'Jan', values: { revenue: 4000 } }, // Recharts ne lit pas les nested
];
```
