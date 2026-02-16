# Graphiques Finance

## Graphiques recommandes

### AreaChart — Evolution temporelle
- **Usage** : CA mensuel, tresorerie, EBITDA dans le temps
- **Quand** : 1 metrique numerique + 1 colonne temporelle
- **Couleur** : cyan (#06B6D4) pour CA, amber (#F59E0B) pour tresorerie

### LineChart — Comparaisons multi-series
- **Usage** : Budget vs Reel, CA vs Charges, comparaison N/N-1
- **Quand** : 2-4 metriques sur le meme axe temporel
- **Attention** : Max 4 series, au-dela c'est illisible

### BarChart empile (stacked)
- **Usage** : Repartition des charges par poste, ventilation CA par activite
- **Quand** : 1 colonne temporelle + 1 colonne categorielle + 1 valeur
- **Max** : 8 segments par barre

### BarChart simple
- **Usage** : Comparaison entre entites/filiales, classement par montant
- **Quand** : 1 colonne categorielle + 1 valeur numerique

### PieChart
- **Usage** : Repartition du CA par segment, structure des charges
- **Quand** : 1 colonne categorielle (max 6 valeurs) + 1 valeur
- **JAMAIS** : Plus de 6 segments — utiliser BarChart a la place
- **Obligatoire** : `<Cell fill={COLORS[i % COLORS.length]} />`

## Graphiques a EVITER en finance

- **Waterfall** : Pas disponible dans Recharts standard — simuler avec BarChart si necessaire
- **Gauge** : Pas natif Recharts — utiliser KPI avec badge a la place
- **Treemap** : Trop complexe pour un dashboard standard

## Regles

1. Page Analyses : minimum 2 graphiques + filtres dynamiques
2. Toujours inclure un tableau de donnees detaillees
3. Axe Y formate avec `fmtCur()` pour les montants
4. Tooltip avec valeurs formatees
5. Legende visible pour les graphiques multi-series
