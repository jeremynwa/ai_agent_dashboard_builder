# Pages et Onglets

Chaque dashboard a 3-4 onglets. Regles par type de page:

## Vue d'Ensemble (page principale) — Layout FIXE

Suivre cet ordre EXACT de composants, de haut en bas:

1. **KPIs** (grid-kpis) — 4 KPIs avec sparklines (voir `references/kpis.md` pour la selection)
2. **Graphique temporel** (card pleine largeur) — AreaChart si 1 metrique temporelle, LineChart si 2-4 metriques temporelles, BarChart si pas de dimension temporelle
3. **Grille 2 colonnes** (grid-charts-2) — PieChart (repartition/proportion, max 6 categories) + BarChart (comparaison top categories)
4. **Points cles** (card) — section insight-item OBLIGATOIRE — voir `references/insights.md`

**NE PAS** changer l'ordre. **NE PAS** omettre de composant. **NE PAS** ajouter de tableau sur cette page.

**INTERDIT sur Vue d'Ensemble**:
- Tableaux de donnees brutes (commandes individuelles, transactions, etc.)
- Colonnes ID (order_id, product_id, etc.) dans les graphiques ou tableaux
- Voir `references/data-intelligence.md` pour les regles d'agregation

## Analyses / Rapports — Layout FIXE

Suivre cet ordre EXACT de composants, de haut en bas:

1. **Barre de filtres** — selects styles en haut (voir `references/filters.md`)
2. **Grille 2 colonnes** (grid-charts-2) — 2 graphiques Recharts (BarChart, AreaChart, PieChart, etc.) qui reagissent aux filtres
3. **Tableau** (card) — Top 10-15 agrege par dimension significative, trie par metrique decroissante

- **INTERDIT** d'afficher juste du texte ou des gros chiffres centres — c'est un DASHBOARD, tout doit etre VISUEL
- Les graphiques et tableaux utilisent les donnees **FILTREES** (useMemo)
- **INTERDIT**: tableaux de donnees brutes (commandes individuelles, transactions ligne par ligne)
- Axes des graphiques = noms/categories/dates, JAMAIS des IDs
- Voir `references/data-intelligence.md` pour les regles d'agregation

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

### Section "Informations sur les donnees" — OBLIGATOIRE

Le tableau `dataInfo` DOIT contenir au minimum:

```jsx
const dataInfo = [
  { label: 'Source', value: 'fichier.csv' },          // ou 'Base de donnees PostgreSQL'
  { label: 'Lignes', value: fmt(DATA.length) },        // TOUJOURS DATA.length dynamique
  { label: 'Colonnes', value: String(Object.keys(DATA[0] || {}).length) },
  { label: 'Derniere mise a jour', value: new Date().toLocaleDateString('fr-FR') },
];
```

- `DATA.length` DOIT etre dynamique (pas hardcode)
- Le nom du fichier source doit correspondre au fichier uploade
