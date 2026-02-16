# Filtres Dynamiques

Sur les pages Analyses et Rapports, TOUJOURS une barre de filtres en haut.

## Structure

```jsx
<div className="flex flex-wrap gap-3 mb-6">
  {filterOptions.map(filter => (
    <select
      key={filter.key}
      className="px-3 py-2 rounded-lg text-sm text-primary"
      style={{background:'#1A2332', border:'1px solid #1E293B', outline:'none'}}
      value={filters[filter.key]}
      onChange={e => setFilters(prev => ({...prev, [filter.key]: e.target.value}))}
    >
      <option value="all">{filter.label} (Tous)</option>
      {filter.values.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  ))}
</div>
```

## Regles

- Filtres generes **DYNAMIQUEMENT** a partir des colonnes des donnees (marques, categories, segments, periodes, etc.)
- `useState` pour l'etat des filtres
- `useMemo` pour filtrer les donnees
- Les graphiques et tableaux de la page utilisent les donnees **FILTREES**

## Pattern d'Implementation

```jsx
const [filters, setFilters] = useState({ category: 'all', period: 'all' });

const filteredData = useMemo(() => {
  return data.filter(row => {
    if (filters.category !== 'all' && row.category !== filters.category) return false;
    if (filters.period !== 'all' && row.period !== filters.period) return false;
    return true;
  });
}, [data, filters]);

// Utiliser filteredData dans les graphiques et tableaux
```

## Style OBLIGATOIRE

Le style inline des `<select>` est **NON-NEGOCIABLE** — ne pas l'omettre:

```jsx
style={{background:'#1A2332', border:'1px solid #1E293B', outline:'none'}}
```

Sans ce style, les selects apparaissent en blanc/gris par defaut du navigateur — visuellement casse sur le fond sombre du dashboard.

**INTERDIT**:
- `<select>` sans style inline (fond blanc par defaut = illisible)
- `<select>` sans className `px-3 py-2 rounded-lg text-sm text-primary`
- Filtres sans espacement (`mb-6` sur le conteneur flex)
