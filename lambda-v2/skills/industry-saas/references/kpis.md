# KPIs SaaS / Tech

## KPIs principaux

### MRR (Monthly Recurring Revenue)
- **Definition** : Revenu mensuel recurrent total
- **Format** : `fmtCur()` — ex: 125K EUR
- **Badge** : up=vert, down=rouge
- **Sparkline** : evolution mensuelle obligatoire
- **Decomposition** : New MRR + Expansion MRR - Churn MRR - Contraction MRR

### ARR (Annual Recurring Revenue)
- **Definition** : MRR * 12
- **Format** : `fmtCur()` — ex: 1,5M EUR
- **Badge** : up=vert, down=rouge

### Churn rate
- **Definition** : Clients perdus / Total clients debut de periode * 100
- **Format** : `fmtPct()` — ex: 2,3%
- **Badge** : up=**rouge** (inverse), down=**vert**
- **Seuils** : > 5% mensuel = alerte, < 2% = bon, < 1% = excellent

### Nombre de clients actifs
- **Format** : `fmt()` — ex: 2 340
- **Badge** : up=vert, down=rouge

### LTV (Lifetime Value)
- **Definition** : ARPU / Churn rate mensuel
- **Format** : `fmtCur()` — ex: 4 500 EUR
- **Badge** : up=vert

### CAC (Customer Acquisition Cost)
- **Definition** : Total depenses acquisition / Nouveaux clients
- **Format** : `fmtCur()` — ex: 320 EUR
- **Badge** : up=**rouge** (inverse), down=**vert**

### Ratio LTV/CAC
- **Definition** : LTV / CAC
- **Format** : nombre — ex: 3,2x
- **Badge** : up=vert
- **Seuils** : < 1x = danger, 1-3x = attention, > 3x = sain

## KPIs secondaires

### NPS (Net Promoter Score)
- **Definition** : % Promoteurs - % Detracteurs
- **Format** : nombre — ex: +42
- **Badge** : up=vert, down=rouge
- **Seuils** : < 0 = alerte, 0-30 = moyen, > 30 = bon, > 50 = excellent

### Trial-to-paid conversion
- **Formule** : Conversions payantes / Inscriptions essai * 100
- **Format** : `fmtPct()`
- **Badge** : up=vert

### ARPU (Average Revenue Per User)
- **Formule** : MRR / Nombre de clients
- **Format** : `fmtCur()`

### DAU/MAU ratio
- **Definition** : Utilisateurs actifs quotidiens / mensuels
- **Format** : `fmtPct()` — ex: 32%
- **Badge** : up=vert

### Expansion MRR
- **Definition** : Revenue supplementaire des clients existants (upsell, add-ons)
- **Format** : `fmtCur()`
- **Badge** : up=vert

## Regles d'affichage

- Afficher 4-6 KPIs max en Vue d'ensemble
- MRR est toujours le KPI #1
- Ne JAMAIS inventer de KPI si la donnee n'existe pas
- Sparklines obligatoires pour MRR et churn
