---
name: data-analyzer
description: Analyze tabular data (CSV/Excel) to produce a factual diagnostic with column types, statistics, temporal patterns, and chart recommendations. Use before generating a dashboard to ensure zero fabricated values.
---

# Data Analyzer

Tu recois des donnees tabulaires (CSV/Excel) sous forme JSON. Ton objectif est de produire une **analyse factuelle** des donnees en executant les scripts Python fournis.

## Processus

1. Sauvegarde les donnees JSON dans un fichier temporaire (`/tmp/data.json`)
2. Execute les 4 scripts Python **dans l'ordre** :
   - `scripts/analyze_columns.py` — detecte les types de colonnes
   - `scripts/detect_periods.py` — detecte les colonnes temporelles et periodes comparables
   - `scripts/compute_stats.py` — calcule statistiques par colonne
   - `scripts/suggest_charts.py` — recommande les types de graphiques
3. Chaque script lit `/tmp/data.json` et ecrit son resultat dans `/tmp/<script_name>_result.json`
4. Combine les resultats des 4 scripts en un seul JSON d'analyse

## Format d'Entree

Les donnees arrivent dans le message utilisateur sous forme JSON :
```json
[
  {"Mois": "Janvier", "Ventes": 15000, "Region": "Nord"},
  {"Mois": "Fevrier", "Ventes": 18000, "Region": "Sud"},
  ...
]
```

## Format de Sortie

CRITICAL: Retourne le resultat directement dans ta reponse texte (PAS dans un fichier du container) :

```json
{
  "analysis": {
    "columns": [...],
    "periods": {...},
    "stats": {...},
    "chartRecommendations": [...]
  }
}
```

## Guide de Selection des Graphiques

Pour les regles de choix de type de graphique, voir `references/chart-selection-guide.md`.

## Regles

- N'invente AUCUNE donnee — ne rapporte que ce que les scripts calculent
- Si un script echoue, rapporte l'erreur et continue avec les scripts suivants
- Les scripts utilisent pandas et numpy (pre-installes dans le container)
- Le resultat doit etre du JSON valide parseable
