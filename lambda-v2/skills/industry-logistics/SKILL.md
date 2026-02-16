---
name: industry-logistics
description: Logistics and supply chain dashboard expertise with delivery metrics, stock management KPIs, and operational vocabulary.
---

# Industry Skill — Logistique / Supply Chain

Ce skill fournit le contexte metier pour generer des dashboards **logistique et supply chain**.

## Quand utiliser

Quand l'utilisateur demande un dashboard lie a :
- Livraisons, expeditions, transport
- Gestion des stocks, entrepots
- Performance logistique, taux de service
- Supply chain, approvisionnement

## Instructions

1. **Utilise le vocabulaire logistique francais** — voir `references/vocabulary.md`
2. **Priorise les KPIs logistiques** dans la Vue d'ensemble — voir `references/kpis.md`
3. **Choisis les graphiques adaptes** — voir `references/charts.md`
4. **Structure la page Analyses** avec des filtres par entrepot, region, transporteur, periode
5. **Formate les delais** en jours et les taux avec `fmtPct()`
6. **Ne fabrique aucune donnee** — utilise uniquement les valeurs presentes dans les donnees

## KPIs prioritaires

Si les donnees le permettent, affiche en priorite :
1. OTIF (On Time In Full, %)
2. Taux de service (%)
3. Lead time moyen (jours)
4. Nombre d'expeditions
5. Taux de rupture de stock (%)

## Specificites secteur

- Le taux de rupture : badge **rouge si hausse** (inverse)
- Le lead time : badge **rouge si hausse** (plus long = pire)
- Le cout logistique : badge **rouge si hausse** (cout)
- OTIF et Taux de service : badge **vert si hausse**
- Toujours segmenter par entrepot/region si la donnee est disponible
- Page Analyses : filtres par entrepot, transporteur, destination
