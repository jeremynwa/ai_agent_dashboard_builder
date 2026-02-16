# Graphiques SaaS

## Graphiques recommandes

### AreaChart — Evolution MRR/ARR
- **Usage** : Tendance du MRR/ARR dans le temps
- **Quand** : MRR + colonne temporelle
- **Couleur** : cyan (#06B6D4) pour MRR
- **C'est LE graphique principal** d'un dashboard SaaS

### BarChart empile — MRR Breakdown
- **Usage** : Decomposition du MRR (New + Expansion - Churn - Contraction)
- **Quand** : Donnees de mouvement MRR par mois
- **Couleurs** : vert pour New/Expansion, rouge pour Churn/Contraction
- **Important** : Les barres negatives (churn) sont sous l'axe 0

### LineChart — Churn rate / Retention
- **Usage** : Evolution du taux de churn dans le temps
- **Quand** : Churn rate mensuel
- **Couleur** : magenta (#EC4899) pour le churn

### BarChart — Comparaison par plan/tier
- **Usage** : Nombre de clients ou MRR par plan (Free, Starter, Pro, Enterprise)
- **Quand** : Colonne plan/tier + valeur numerique
- **Tri** : Du plus grand au plus petit

### PieChart — Repartition des clients par plan
- **Usage** : Part de chaque plan dans la base clients
- **Quand** : <= 6 plans/tiers
- **JAMAIS** : Plus de 6 segments
- **Obligatoire** : `<Cell fill={COLORS[i % COLORS.length]} />`

### LineChart multi-series — LTV vs CAC
- **Usage** : Evolution LTV et CAC dans le temps
- **Quand** : Donnees LTV + CAC temporelles
- **Objectif visuel** : Montrer l'ecart LTV-CAC (doit etre positif et croissant)

## Regles

1. Page Analyses : minimum 2 graphiques + filtres (plan, periode, cohorte)
2. Toujours un tableau de donnees detaillees
3. MRR en AreaChart est quasi-obligatoire si la donnee existe
4. Axes formates avec `fmtCur()` pour montants
5. Tooltips avec valeurs formatees
