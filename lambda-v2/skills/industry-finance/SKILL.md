---
name: industry-finance
description: Finance and accounting dashboard expertise with sector-specific KPIs, chart recommendations, and French business vocabulary.
---

# Industry Skill — Finance / Comptabilite

Ce skill fournit le contexte metier pour generer des dashboards de **finance et comptabilite**.

## Quand utiliser

Quand l'utilisateur demande un dashboard lie a :
- Comptabilite, P&L, bilan, tresorerie
- Suivi financier, budget, previsionnel
- Analyse de rentabilite, marges, ratios
- Reporting financier, consolidation

## Instructions

1. **Utilise le vocabulaire financier francais** — voir `references/vocabulary.md`
2. **Priorise les KPIs finance** dans la Vue d'ensemble — voir `references/kpis.md`
3. **Choisis les graphiques adaptes** au secteur financier — voir `references/charts.md`
4. **Structure la page Analyses** avec des filtres par exercice, periode, entite
5. **Formate les montants** avec `fmtCur()` (EUR) et les pourcentages avec `fmtPct()`
6. **Ne fabrique aucune donnee** — utilise uniquement les valeurs presentes dans les donnees

## KPIs prioritaires

Si les donnees le permettent, affiche en priorite :
1. Chiffre d'affaires (CA)
2. Marge brute (%)
3. EBITDA ou Resultat d'exploitation
4. Tresorerie nette / Cash flow
5. BFR (si donnees dispo)

## Specificites secteur

- Les variations negatives de charges sont **positives** (badge vert si baisse)
- Les ratios d'endettement : badge rouge si hausse
- Toujours afficher la periode (exercice, trimestre, mois)
- Page Analyses : filtres par entite/filiale si colonne presente
