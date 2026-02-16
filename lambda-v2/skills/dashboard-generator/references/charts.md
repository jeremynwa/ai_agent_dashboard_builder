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

## Selection du Type de Graphique

### AreaChart
- **Ideal pour**: tendance temporelle d'une seule metrique
- **Donnees**: 1 colonne numerique + 1 colonne temporelle
- **Exemples**: evolution du CA mensuel, progression des ventes
- **Eviter si**: pas de dimension temporelle

### LineChart
- **Ideal pour**: comparer 2-4 metriques sur le meme axe temporel
- **Exemples**: revenus vs depenses par mois
- **Eviter si**: plus de 4 series (illisible)

### BarChart
- **Ideal pour**: comparer des valeurs entre categories discretes
- **Max categories**: 15 — au-dela, utiliser un tableau
- **Exemples**: ventes par region, top 10 produits

### PieChart
- **Ideal pour**: repartition/proportion d'un total
- **Max categories**: 6 — au-dela, utiliser BarChart
- **JAMAIS si**: plus de 6 categories, ou valeurs negatives
- **Rappel**: TOUJOURS `<Cell fill={COLORS[i % COLORS.length]} />`

### StackedBarChart
- **Ideal pour**: composition par categorie au fil du temps
- **Max segments**: 8

## Regles des Axes — OBLIGATOIRE

- **INTERDIT** de mettre des IDs (order_id, product_id, transaction_id, customer_id, etc.) sur les axes X ou Y
- XAxis `dataKey` doit pointer vers un nom, une categorie, une date — JAMAIS un ID
- Si les donnees n'ont qu'un ID, agreger par une autre colonne
- YAxis: TOUJOURS `tickFormatter={v => fmt(v)}` pour les nombres
- Regrouper les petites categories (< 3% du total) dans "Autres"
- Voir `references/data-intelligence.md` pour les regles completes
