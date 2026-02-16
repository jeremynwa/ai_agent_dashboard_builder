# KPIs Finance

## KPIs principaux

### Chiffre d'affaires (CA)
- **Definition** : Total des ventes de biens et services
- **Formule** : Somme des lignes de vente
- **Format** : `fmtCur()` — ex: 1,2M EUR
- **Badge** : up=vert, down=rouge
- **Sparkline** : evolution mensuelle/trimestrielle

### Marge brute
- **Definition** : (CA - Cout des ventes) / CA * 100
- **Format** : `fmtPct()` — ex: 42,5%
- **Badge** : up=vert, down=rouge
- **Seuils** : < 20% = alerte, > 40% = excellent

### EBITDA
- **Definition** : Resultat avant interets, impots, depreciation et amortissement
- **Formule** : Resultat d'exploitation + Dotations aux amortissements
- **Format** : `fmtCur()`
- **Badge** : up=vert, down=rouge

### Marge nette
- **Definition** : Resultat net / CA * 100
- **Format** : `fmtPct()`
- **Badge** : up=vert, down=rouge

### Cash flow / Tresorerie nette
- **Definition** : Entrees - Sorties de tresorerie
- **Format** : `fmtCur()`
- **Badge** : positif=vert, negatif=rouge

### BFR (Besoin en Fonds de Roulement)
- **Definition** : Stocks + Creances clients - Dettes fournisseurs
- **Format** : `fmtCur()`
- **Badge** : baisse=vert (moins de besoin), hausse=rouge

## KPIs secondaires

### ROE (Return on Equity)
- **Formule** : Resultat net / Capitaux propres * 100
- **Format** : `fmtPct()`

### ROA (Return on Assets)
- **Formule** : Resultat net / Total actif * 100
- **Format** : `fmtPct()`

### Ratio d'endettement
- **Formule** : Dettes totales / Capitaux propres
- **Format** : nombre a 2 decimales (ex: 0,85)
- **Badge** : hausse=rouge, baisse=vert

### Delai moyen de paiement clients (DSO)
- **Formule** : (Creances clients / CA) * 365
- **Format** : nombre + "jours" — ex: 45 jours
- **Badge** : hausse=rouge, baisse=vert

### Delai moyen de paiement fournisseurs (DPO)
- **Formule** : (Dettes fournisseurs / Achats) * 365
- **Format** : nombre + "jours"

## Regles d'affichage

- Afficher 4-6 KPIs max en Vue d'ensemble
- Choisir les KPIs selon les colonnes disponibles dans les donnees
- Ne JAMAIS inventer de KPI si la donnee n'existe pas
- Utiliser les sparklines pour montrer l'evolution temporelle
- Varier les couleurs de sparkline par KPI (cyan, magenta, violet, amber)
