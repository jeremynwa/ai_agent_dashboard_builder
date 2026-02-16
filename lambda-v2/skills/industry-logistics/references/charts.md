# Graphiques Logistique

## Graphiques recommandes

### BarChart — OTIF par entrepot/region
- **Usage** : Comparer la performance entre sites
- **Quand** : Colonne entrepot/region + OTIF ou taux de service
- **Couleur** : Gradient selon performance (vert pour bon, rouge pour alerte)

### AreaChart — Evolution du lead time
- **Usage** : Tendance du delai de livraison dans le temps
- **Quand** : Lead time + colonne temporelle
- **Couleur** : cyan, avec zone rouge pour le seuil max acceptable

### LineChart — Stock vs Demande
- **Usage** : Comparer le niveau de stock avec la demande
- **Quand** : 2 series temporelles (stock, demande)
- **Couleur** : cyan pour stock, magenta pour demande

### BarChart horizontal — Top destinations
- **Usage** : Classement des destinations par volume d'expeditions
- **Quand** : Colonne destination + volume
- **Layout** : `layout="vertical"` pour BarChart horizontal
- **Max** : 15 destinations

### PieChart — Repartition par transporteur
- **Usage** : Part de chaque transporteur dans les expeditions
- **Quand** : <= 6 transporteurs
- **JAMAIS** : Plus de 6 segments
- **Obligatoire** : `<Cell fill={COLORS[i % COLORS.length]} />`

### LineChart multi-series — Performance temporelle
- **Usage** : OTIF + Taux de service + Taux de rupture dans le temps
- **Quand** : 2-3 metriques temporelles
- **Max** : 4 series

## Regles

1. Page Analyses : minimum 2 graphiques + filtres (entrepot, transporteur, periode)
2. Toujours un tableau de donnees detaillees
3. Axes formates : `fmtPct()` pour les taux, nombre pour les jours
4. Tooltips avec valeurs formatees
5. Inclure des seuils visuels si pertinent (ligne de reference pour objectif OTIF)
