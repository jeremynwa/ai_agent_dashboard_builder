---
name: industry-ecommerce
description: E-commerce and retail dashboard expertise with conversion funnels, basket metrics, and French commerce vocabulary.
---

# Industry Skill — E-commerce / Retail

Ce skill fournit le contexte metier pour generer des dashboards **e-commerce et retail**.

## Quand utiliser

Quand l'utilisateur demande un dashboard lie a :
- Ventes en ligne, boutique e-commerce
- Performance produits, catalogue
- Conversion, tunnel d'achat
- Commerce de detail, magasins

## Instructions

1. **Utilise le vocabulaire e-commerce francais** — voir `references/vocabulary.md`
2. **Priorise les KPIs e-commerce** dans la Vue d'ensemble — voir `references/kpis.md`
3. **Choisis les graphiques adaptes** au retail — voir `references/charts.md`
4. **Structure la page Analyses** avec des filtres par canal, categorie produit, periode
5. **Formate les montants** avec `fmtCur()` et les taux avec `fmtPct()`
6. **Ne fabrique aucune donnee** — utilise uniquement les valeurs presentes dans les donnees

## KPIs prioritaires

Si les donnees le permettent, affiche en priorite :
1. Chiffre d'affaires
2. Nombre de commandes
3. Panier moyen
4. Taux de conversion (%)
5. Taux d'abandon panier (%)

## Specificites secteur

- Le taux d'abandon : badge **rouge si hausse** (inverse du CA)
- Le taux de retour : badge **rouge si hausse**
- Toujours segmenter par canal si la donnee est disponible (web, mobile, magasin)
- Page Analyses : filtres par categorie produit et canal
