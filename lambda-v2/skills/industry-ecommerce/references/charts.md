# Graphiques E-commerce

## Graphiques recommandes

### AreaChart — Tendances de ventes
- **Usage** : Evolution du CA, nombre de commandes dans le temps
- **Quand** : 1 metrique + 1 colonne temporelle
- **Couleur** : cyan pour CA, magenta pour commandes

### BarChart horizontal — Funnel de conversion
- **Usage** : Simuler un tunnel de conversion (Visiteurs > Paniers > Commandes > Paiements)
- **Quand** : Donnees d'etapes du parcours client
- **Layout** : `layout="vertical"` pour BarChart horizontal
- **Tri** : Du plus grand au plus petit (haut en bas)

### PieChart — Repartition par canal
- **Usage** : Part du CA par canal (Web, Mobile, Magasin)
- **Quand** : 1 colonne categorielle (max 6 valeurs) + 1 valeur
- **JAMAIS** : Plus de 6 segments
- **Obligatoire** : `<Cell fill={COLORS[i % COLORS.length]} />`

### BarChart — Top produits / categories
- **Usage** : Classement des produits par CA, quantite vendue
- **Quand** : Colonne produit/categorie + valeur numerique
- **Max** : 15 barres, au-dela utiliser un tableau

### LineChart — Comparaisons temporelles
- **Usage** : Conversion vs abandon, comparaison periodes
- **Quand** : 2-3 metriques sur le meme axe temporel

### StackedBarChart — Ventes par canal dans le temps
- **Usage** : CA par canal par mois
- **Quand** : Temporel + categoriel + numerique

## Regles

1. Page Analyses : minimum 2 graphiques + filtres (categorie, canal, periode)
2. Toujours un tableau avec les donnees detaillees
3. Axes formates : `fmtCur()` pour montants, `fmtPct()` pour taux
4. Tooltips avec valeurs formatees
