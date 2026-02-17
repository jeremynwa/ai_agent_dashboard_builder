# KPIs

4 KPIs dans une grid responsive. Toujours 4, pas plus, pas moins.

## Selection des KPIs — Ordre de Priorite

Choisir les 4 KPIs dans cet ordre de priorite:

1. **Metrique monetaire principale** (revenue, CA, montant total) → `sum()` → `fmtCur()`
2. **Nombre d'enregistrements** (commandes, transactions, clients) → `count` → `fmt()`
3. **Metrique de performance** (taux, marge, moyenne) → `avg()` → `fmtPct()` ou `fmt()`
4. **Variation ou metrique secondaire** — si periodes comparables: variation % de la metrique #1. Sinon: une autre metrique numerique pertinente.

Si les donnees n'ont qu'une seule colonne numerique, deriver les 4 KPIs: total, moyenne, min, max.

## Structure

```jsx
<div className="grid-kpis mb-6">
  <div className="kpi-card">
    <span className="kpi-label">Revenue</span>
    <span className="kpi-value">{fmtCur(total)}</span>
    {/* Mini sparkline */}
  </div>
</div>
```

## REGLE ABSOLUE — ZERO CHIFFRE INVENTE

- **TOUS** les chiffres affiches doivent etre **CALCULES** a partir des donnees reelles
- **INTERDIT** d'inventer des comparaisons "Precedent", "Annee derniere", "Objectif" si ces donnees **N'EXISTENT PAS** dans le dataset
- Si les donnees n'ont **PAS** de colonne date/periode permettant de comparer: **PAS** de variation %, **PAS** de "Actuel vs Precedent"
- Si les donnees **ONT** des periodes comparables (ex: mois, trimestres): calculer la variation a partir des **VRAIES** valeurs
- En cas de doute, afficher **SEULEMENT** la valeur calculee, sans comparaison
- Les badges `badge-up`/`badge-down` ne sont utilises **QUE** si la variation est calculable a partir des donnees

## Utilisation des Stats Pre-Calculees

Si un contexte "STATISTIQUES AUTORITAIRES" est fourni:
- KPI 1 (metrique monetaire): valider avec `stats[colonne].sum` — le code DOIT calculer dynamiquement via `DATA.reduce()`
- KPI 2 (nombre): utiliser `DATA.length` (nombre reel apres injection)
- KPI 3 (performance): valider avec `stats[colonne].mean` — calculer via `DATA.reduce() / DATA.length`
- KPI 4 (variation): UNIQUEMENT si `stats[colonne].variation` existe dans le contexte d'analyse

### Pattern OBLIGATOIRE pour les KPIs:

```jsx
// CORRECT — calcul dynamique
const totalRevenue = useMemo(() => DATA.reduce((s, r) => s + (Number(r.revenue) || 0), 0), []);

// INTERDIT — valeur hardcodee
const totalRevenue = 1523456.78; // JAMAIS
```

### Pattern OBLIGATOIRE pour les variations:

```jsx
// CORRECT — variation calculee si periodes comparables
const variation = useMemo(() => {
  const periods = [...new Set(DATA.map(r => r.month))].sort();
  if (periods.length < 2) return null; // Pas de variation possible
  const current = DATA.filter(r => r.month === periods[periods.length - 1]);
  const previous = DATA.filter(r => r.month === periods[periods.length - 2]);
  const sumCur = current.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const sumPrev = previous.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  return sumPrev > 0 ? ((sumCur - sumPrev) / sumPrev) * 100 : null;
}, []);

// INTERDIT — variation inventee
const variation = 15.3; // JAMAIS
```

## Sparklines

Chaque KPI utilise donnees et couleurs **DIFFERENTES**:

- KPI 1: `stroke="#06B6D4"` (cyan), gradient id=`"sparkGrad1"`
- KPI 2: `stroke="#F59E0B"` (amber), gradient id=`"sparkGrad2"`
- KPI 3: `stroke="#8B5CF6"` (violet), gradient id=`"sparkGrad3"`
- KPI 4: `stroke="#EC4899"` (magenta), gradient id=`"sparkGrad4"`

Chaque gradient SVG = **ID UNIQUE**.

```jsx
<ResponsiveContainer width="100%" height={40}>
  <AreaChart data={sparklineData}>
    <defs>
      <linearGradient id="sparkGrad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
      </linearGradient>
    </defs>
    <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="url(#sparkGrad1)" strokeWidth={1.5} />
  </AreaChart>
</ResponsiveContainer>
```

**IMPORTANT**: Sparklines dans `<ResponsiveContainer width="100%" height={40}>` — PAS plus grand.
