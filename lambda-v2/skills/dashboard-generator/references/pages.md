# Pages et Onglets

Chaque dashboard a 3-4 onglets. Regles par type de page:

## Vue d'Ensemble (page principale)

- KPIs en haut (grid-kpis)
- Graphiques varies (AreaChart, BarChart, PieChart)
- Points cles en bas (voir `references/insights.md`)

## Analyses / Rapports

- **INTERDIT** d'afficher juste du texte ou des gros chiffres centres — c'est un DASHBOARD, tout doit etre VISUEL
- **OBLIGATOIRE**: au moins 2 graphiques Recharts (BarChart, AreaChart, PieChart, etc.) + 1 tableau de donnees
- **OBLIGATOIRE**: une BARRE DE FILTRES en haut de la page (voir `references/filters.md`)
- Les graphiques et tableaux reagissent aux filtres selectionnes
- Comparer periodes, segments, categories avec des graphiques cote-a-cote

## Parametres

Design impose — structure EXACTE a suivre:

```jsx
<div className="content-area">
  <div className="card mb-6">
    <h3 className="section-title">Parametres</h3>
    {settingsItems.map((item, i) => (
      <div key={i} className="flex items-center justify-between py-3"
        style={{borderBottom: i < settingsItems.length-1 ? '1px solid #1E293B' : 'none'}}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">{item.label}</span>
          <span className="text-xs text-tertiary">{item.description}</span>
        </div>
        {item.type === 'toggle' ? (
          <button
            className={`px-3 py-1 rounded text-xs font-semibold ${item.value ? 'bg-accent text-white' : 'border text-secondary'}`}
            onClick={() => toggleSetting(item.key)}>
            {item.value ? 'Active' : 'Desactive'}
          </button>
        ) : (
          <span className="text-sm font-semibold text-accent">{item.display}</span>
        )}
      </div>
    ))}
  </div>
  <div className="card">
    <h3 className="section-title">Informations sur les donnees</h3>
    <div className="grid grid-cols-2 gap-4">
      {dataInfo.map((info, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-11 uppercase tracking-wider text-tertiary">{info.label}</span>
          <span className="text-sm font-semibold text-primary">{info.value}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```

- Les settings doivent avoir: label + description sur la gauche, valeur/toggle sur la droite
- Espacement correct entre label et description (gap-1, pas colles)
