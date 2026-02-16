# Guide de Selection des Graphiques

## Quand utiliser chaque type

### AreaChart
- **Ideal pour** : tendance temporelle d'une seule metrique
- **Donnees** : 1 colonne numerique + 1 colonne temporelle
- **Exemples** : evolution du CA mensuel, progression des ventes
- **Eviter si** : pas de dimension temporelle, ou plusieurs metriques a comparer

### LineChart
- **Ideal pour** : comparer 2-4 metriques sur le meme axe temporel
- **Donnees** : 2+ colonnes numeriques + 1 colonne temporelle
- **Exemples** : revenus vs depenses par mois, comparaison multi-produits
- **Eviter si** : plus de 4 series (illisible), pas de dimension temporelle

### BarChart
- **Ideal pour** : comparer des valeurs entre categories discretes
- **Donnees** : 1 colonne categorielle (max 15 categories) + 1-3 colonnes numeriques
- **Exemples** : ventes par region, performance par produit
- **Eviter si** : plus de 15 categories (utiliser un tableau)

### PieChart
- **Ideal pour** : montrer la repartition/proportion d'un total
- **Donnees** : 1 colonne categorielle (max 6 categories) + 1 colonne numerique
- **Exemples** : part de marche, repartition du budget par poste
- **JAMAIS si** : plus de 6 categories, ou valeurs negatives
- **Regle Recharts** : TOUJOURS utiliser `<Cell fill={COLORS[i % COLORS.length]} />`

### StackedBarChart
- **Ideal pour** : composition au fil du temps ou par categorie
- **Donnees** : 1 colonne temporelle + 1 colonne categorielle (max 8) + 1 colonne numerique
- **Exemples** : ventes par region par mois, depenses par categorie par trimestre
- **Eviter si** : trop de segments (>8), ou si les valeurs sont tres inegales

### Table
- **Ideal pour** : donnees detaillees, beaucoup de colonnes, exploration
- **Toujours recommande** en complement des graphiques
- **Exemples** : listing complet, donnees brutes avec tri

## Regles generales

1. **Pas de PieChart > 6 slices** — au-dela, utiliser BarChart
2. **Pas de graphique temporel sans colonne date** — utiliser BarChart ou Table
3. **Pas de comparaison temporelle si < 2 periodes** — pas de variation %
4. **Maximum 3-4 graphiques par page** — au-dela, utiliser des onglets
5. **Toujours un tableau** — pour les donnees detaillees
