# Graphiques

## Types Minimum

MINIMUM 3 types: AreaChart, BarChart, PieChart, LineChart, Table

## Couleurs

```jsx
const COLORS = ['#06B6D4','#EC4899','#8B5CF6','#F59E0B','#10B981','#F97316'];
```

## PieChart — OBLIGATOIRE: Cell avec COLORS

TOUJOURS utiliser `<Cell>` avec le tableau COLORS — sinon tout est gris:

```jsx
<PieChart>
  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
    {pieData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip contentStyle={{background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9'}} />
</PieChart>
```

## Wrapper Graphique

```jsx
<div className="card mb-6">
  <h3 className="section-title">Titre</h3>
  <ResponsiveContainer width="100%" height={300}>
    {/* Chart ici */}
  </ResponsiveContainer>
</div>
```

## Grid de Graphiques

```jsx
{/* 2 colonnes */}
<div className="grid-charts-2 mb-6">
  <div className="card">...</div>
  <div className="card">...</div>
</div>

{/* 3 colonnes */}
<div className="grid-charts-3 mb-6">
  <div className="card">...</div>
  <div className="card">...</div>
  <div className="card">...</div>
</div>
```

## Configuration Recharts

Props style inline (Recharts n'accepte pas className):

```jsx
<CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
<XAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
<YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
<Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
```
