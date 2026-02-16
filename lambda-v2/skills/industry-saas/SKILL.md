---
name: industry-saas
description: SaaS and tech dashboard expertise with recurring revenue metrics, churn analysis, and subscription-focused KPIs.
---

# Industry Skill — SaaS / Tech

Ce skill fournit le contexte metier pour generer des dashboards **SaaS et tech**.

## Quand utiliser

Quand l'utilisateur demande un dashboard lie a :
- Revenus recurrents (MRR, ARR)
- Abonnements, subscriptions
- Retention, churn, cohortes
- Metriques produit (DAU, MAU, NPS)
- Performance SaaS, startup metrics

## Instructions

1. **Utilise le vocabulaire SaaS** — voir `references/vocabulary.md`
2. **Priorise les KPIs SaaS** dans la Vue d'ensemble — voir `references/kpis.md`
3. **Choisis les graphiques adaptes** — voir `references/charts.md`
4. **Structure la page Analyses** avec des filtres par plan/tier, cohorte, periode
5. **Formate les montants** avec `fmtCur()` et les taux avec `fmtPct()`
6. **Ne fabrique aucune donnee** — utilise uniquement les valeurs presentes dans les donnees

## KPIs prioritaires

Si les donnees le permettent, affiche en priorite :
1. MRR (Monthly Recurring Revenue)
2. Nombre de clients actifs
3. Churn rate (%)
4. LTV / CAC ratio
5. NPS ou satisfaction

## Specificites secteur

- Le churn rate : badge **rouge si hausse** (perte de clients)
- Le CAC : badge **rouge si hausse** (cout, inverse)
- MRR : decomposer si possible en New + Expansion - Churn - Contraction
- Toujours montrer la tendance temporelle du MRR
- Page Analyses : filtres par plan (Free, Starter, Pro, Enterprise)
