# KPIs E-commerce / Retail

## KPIs principaux

### Chiffre d'affaires
- **Format** : `fmtCur()` — ex: 245K EUR
- **Badge** : up=vert, down=rouge
- **Sparkline** : evolution journaliere/hebdo/mensuelle

### Nombre de commandes
- **Format** : `fmt()` — ex: 1 234
- **Badge** : up=vert, down=rouge

### Panier moyen
- **Definition** : CA / Nombre de commandes
- **Format** : `fmtCur()` — ex: 67,50 EUR
- **Badge** : up=vert, down=rouge

### Taux de conversion
- **Definition** : Commandes / Visiteurs * 100
- **Format** : `fmtPct()` — ex: 3,2%
- **Badge** : up=vert, down=rouge
- **Seuils** : < 1% = alerte, > 3% = bon, > 5% = excellent

### Taux d'abandon panier
- **Definition** : Paniers abandonnes / Paniers crees * 100
- **Format** : `fmtPct()`
- **Badge** : up=**rouge** (inverse), down=**vert**
- **Seuils** : > 70% = alerte, < 50% = excellent

### CA par canal
- **Definition** : Ventilation du CA par source (web, mobile, magasin)
- **Format** : `fmtCur()` par canal
- **Graphique associe** : PieChart (si <= 6 canaux) ou BarChart

## KPIs secondaires

### Taux de retour
- **Formule** : Retours / Commandes * 100
- **Format** : `fmtPct()`
- **Badge** : up=**rouge**, down=**vert**

### Repeat purchase rate
- **Definition** : Clients avec 2+ achats / Total clients * 100
- **Format** : `fmtPct()`
- **Badge** : up=vert

### Cout d'acquisition client (CAC)
- **Formule** : Depenses marketing / Nouveaux clients
- **Format** : `fmtCur()`
- **Badge** : up=**rouge** (cout, inverse), down=**vert**

### Marge par produit
- **Formule** : (Prix vente - Cout) / Prix vente * 100
- **Format** : `fmtPct()`

### Valeur vie client (LTV)
- **Formule** : Panier moyen * Frequence achat * Duree relation
- **Format** : `fmtCur()`

## Regles d'affichage

- Afficher 4-6 KPIs max en Vue d'ensemble
- Privilegier CA + Commandes + Panier moyen + Conversion
- Ne JAMAIS inventer de KPI si la donnee n'existe pas
- Sparklines pour les tendances temporelles
