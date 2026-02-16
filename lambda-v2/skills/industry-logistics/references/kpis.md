# KPIs Logistique / Supply Chain

## KPIs principaux

### OTIF (On Time In Full)
- **Definition** : Livraisons a l'heure ET completes / Total livraisons * 100
- **Format** : `fmtPct()` — ex: 94,2%
- **Badge** : up=vert, down=rouge
- **Seuils** : < 90% = alerte, > 95% = bon, > 98% = excellent

### Taux de service
- **Definition** : Commandes livrees / Commandes passees * 100
- **Format** : `fmtPct()` — ex: 97,5%
- **Badge** : up=vert, down=rouge

### Lead time moyen
- **Definition** : Delai moyen entre commande et livraison
- **Format** : nombre + "jours" — ex: 3,2 jours
- **Badge** : up=**rouge** (inverse — plus long = pire), down=**vert**

### Nombre d'expeditions
- **Format** : `fmt()` — ex: 12 450
- **Badge** : up=vert (plus d'activite)

### Taux de rupture de stock
- **Definition** : References en rupture / Total references * 100
- **Format** : `fmtPct()` — ex: 1,8%
- **Badge** : up=**rouge** (inverse), down=**vert**
- **Seuils** : > 5% = alerte, < 2% = bon

## KPIs secondaires

### Taux de remplissage
- **Definition** : Volume utilise / Capacite totale * 100
- **Format** : `fmtPct()`
- **Badge** : up=vert (meilleure utilisation)
- **Attention** : > 95% peut indiquer un risque de saturation

### Couverture de stock
- **Definition** : Stock actuel / Consommation moyenne quotidienne
- **Format** : nombre + "jours" — ex: 15 jours
- **Badge** : contextuel (trop bas = rouge, trop haut = orange, optimal = vert)

### Cout logistique / CA
- **Formule** : Total couts logistiques / CA * 100
- **Format** : `fmtPct()`
- **Badge** : up=**rouge** (cout, inverse), down=**vert**

### Delai moyen de livraison
- **Format** : nombre + "jours" ou "heures"
- **Badge** : up=**rouge**, down=**vert**

### Precision des previsions
- **Definition** : 1 - |Prevu - Reel| / Prevu * 100
- **Format** : `fmtPct()`
- **Badge** : up=vert

### Taux de retour logistique
- **Definition** : Retours / Expeditions * 100
- **Format** : `fmtPct()`
- **Badge** : up=**rouge**, down=**vert**

## Regles d'affichage

- Afficher 4-6 KPIs max en Vue d'ensemble
- OTIF et Taux de service sont toujours prioritaires
- Ne JAMAIS inventer de KPI si la donnee n'existe pas
- Sparklines pour les tendances temporelles (OTIF, lead time)
