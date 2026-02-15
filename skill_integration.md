# Plan d'intégration Agent Skills — App Factory

## Contexte

Actuellement, la Lambda `generate/index.mjs` envoie un system prompt monolithique (~3000+ tokens) à chaque appel Claude. L'intégration des Agent Skills permet de :

- Découper ce prompt en modules chargés à la demande
- Ajouter des compétences métier (industrie, data analysis)
- Intégrer les exports PPTX/XLSX/PDF via les Skills Anthropic pré-construits
- Réduire le coût en tokens et améliorer la qualité

## Changement architectural clé

```
AVANT:
Lambda → anthropic.messages.create({ system: GROS_PROMPT, messages: [...] })

APRÈS:
Lambda → anthropic.beta.messages.create({
  betas: ["code-execution-2025-08-25", "skills-2025-10-02"],
  container: {
    skills: [
      { type: "custom", skill_id: "skill_dashboard-generator", version: "latest" },
      { type: "custom", skill_id: "skill_finance", version: "latest" },  // si pertinent
      { type: "anthropic", skill_id: "xlsx", version: "latest" },         // si export
    ]
  },
  tools: [{ type: "code_execution_20250825", name: "code_execution" }],
  messages: [...]
})
```

Les Skills utilisent le **Code Execution Tool** (beta) — Claude a accès à un VM avec filesystem. Les Skills sont des dossiers avec un `SKILL.md` + fichiers de référence + scripts.

---

## Phase 0 — Préparation (1 jour)

### 0.1 Setup API Skills

- [ ] Vérifier que l'API key Anthropic a accès aux betas `code-execution-2025-08-25` + `skills-2025-10-02` + `files-api-2025-04-14`
- [ ] Tester un appel simple avec le code execution tool + un skill Anthropic (xlsx) pour valider que tout marche
- [ ] Installer le SDK Python ou Node.js à jour pour les commandes de gestion des skills

### 0.2 Script de gestion des skills

- [ ] Créer un script `manage-skills.mjs` dans lambda-v2/ pour :
  - Lister les skills existants
  - Uploader un skill (zip → POST /v1/skills)
  - Mettre à jour un skill (nouvelle version)
  - Supprimer un skill
- [ ] Tester upload + list + retrieve

**Livrable** : Script fonctionnel, appel API avec skill vérifié
**Durée** : ~1 jour

---

## Phase 1 — Skill "Dashboard Generator" (2-3 jours)

Objectif : remplacer le system prompt monolithique par un skill modulaire.

### 1.1 Découper le prompt actuel en fichiers

```
skills/dashboard-generator/
├── SKILL.md                    ← Règles de base (JSON output, no emojis, compile-safe)
├── references/
│   ├── design-system.md        ← Toutes les classes ds.css, couleurs, composants
│   ├── charts.md               ← Règles Recharts, PieChart Cell, tooltips, couleurs
│   ├── kpis.md                 ← Règles KPIs, sparklines, zéro données inventées
│   ├── layout.md               ← Structure drawer/header/content, grids responsives
│   ├── tables.md               ← Règles tables, formatage, lignes alternées
│   ├── filters.md              ← Filtres dynamiques, useState/useMemo, select dropdowns
│   ├── settings-template.md    ← Template JSX imposé pour la page Paramètres
│   ├── key-takeaways.md        ← Points clés, insight-item, calculated from real data
│   └── formatting.md           ← fmt(), fmtCur(), fmtPct() + règles nombres
├── templates/
│   └── settings-page.jsx       ← Template JSX copiable pour la page Paramètres
└── scripts/
    └── validate_output.py      ← Vérifie que le JSON output est valide + a les bons fichiers
```

### 1.2 Écrire le SKILL.md

```yaml
---
name: dashboard-generator
description: >
  Generate premium React data analytics dashboards with a pre-built CSS design system.
  Use when asked to create, modify, or review a dashboard application.
  The skill includes design system reference, chart guidelines, KPI rules,
  and layout templates.
---
```

Le body de SKILL.md contient :

- Les règles absolues (JSON output, structure fichiers, imports)
- La structure obligatoire (drawer + header + content)
- Les renvois vers les fichiers de référence ("Pour les KPIs, voir references/kpis.md")
- Les renvois vers les scripts ("Après génération, exécuter scripts/validate_output.py")

### 1.3 Adapter la Lambda

- [ ] Modifier `index.mjs` pour utiliser `anthropic.beta.messages.create()` avec le skill
- [ ] Supprimer le `SYSTEM_PROMPT` string monolithique
- [ ] Adapter le parsing de la réponse (le code execution tool peut changer le format)
- [ ] Garder le `fixJsxCode()` post-processing
- [ ] Tester : générer un dashboard avec données Excel → vérifier que le résultat est identique ou meilleur

### 1.4 Upload et test

- [ ] Zipper le skill → upload via `/v1/skills`
- [ ] Tester génération complète (prompt → compilation WebContainer → review → vision)
- [ ] Comparer qualité avant/après
- [ ] Mesurer la réduction de tokens

**Livrable** : Skill uploadé, Lambda adaptée, qualité validée
**Durée** : ~2-3 jours
**Risque** : Le code execution tool change le flow de réponse — il faut adapter le parsing

---

## Phase 2 — Skill "Data Analyzer" (2 jours)

Objectif : analyser les données AVANT de générer le code, pour que Claude ait un diagnostic factuel.

### 2.1 Créer le skill

```
skills/data-analyzer/
├── SKILL.md                    ← Instructions d'analyse
├── scripts/
│   ├── analyze_columns.py      ← Détecte types (date, catégorie, numérique, devise, %)
│   ├── detect_periods.py       ← Vérifie si des comparaisons temporelles sont possibles
│   ├── suggest_charts.py       ← Recommande les types de graphiques selon les données
│   └── compute_stats.py        ← Stats de base (min, max, avg, distribution) par colonne
└── references/
    └── chart-selection-guide.md ← Quand utiliser AreaChart vs BarChart vs PieChart
```

### 2.2 Flow d'utilisation

```
1. User upload Excel → Frontend envoie données à Lambda
2. Lambda appelle Claude avec skill "data-analyzer"
3. Scripts Python analysent les données dans le container :
   - "3 colonnes numériques, 1 colonne date (mensuelle), 2 colonnes catégorielles"
   - "Comparaison mois/mois possible (jan-dec 2024)"
   - "Recommandé : AreaChart pour tendances, PieChart pour répartition catégories"
   - "PAS de colonne 'objectif' → pas de comparaison target"
4. Le diagnostic est passé au skill dashboard-generator comme contexte
5. Claude génère le code avec des informations factuelles sur les données
```

### 2.3 Intégration

- [ ] Créer les scripts Python d'analyse
- [ ] Écrire le SKILL.md avec les instructions
- [ ] Modifier la Lambda pour faire un appel data-analyzer AVANT l'appel dashboard-generator
- [ ] Ou : combiner les deux skills dans un seul appel (max 8 skills par requête)
- [ ] Tester avec différents jeux de données (dates, pas de dates, peu de colonnes, beaucoup)

**Livrable** : Skill uploadé, pré-analyse fonctionnelle, zéro données inventées
**Durée** : ~2 jours
**Impact** : Résout définitivement le problème des données fabriquées

---

## Phase 3 — Skills Industrie (3-4 jours)

Objectif : dashboards spécialisés par secteur avec le vocabulaire et les KPIs corrects.

### 3.1 Créer 4-5 skills industrie

```
skills/industry-finance/
├── SKILL.md                    ← KPIs finance, vocabulaire, best practices
└── references/
    ├── kpis.md                 ← EBITDA, cash flow, BFR, marge brute, ROE, ROA
    ├── charts.md               ← Waterfall pour P&L, stacked bar pour répartition charges
    └── vocabulary.md           ← Termes à utiliser, abréviations standard

skills/industry-marketing/
├── SKILL.md
└── references/
    ├── kpis.md                 ← CAC, LTV, ROAS, taux de conversion, funnel stages
    ├── charts.md               ← Funnel chart, attribution par canal
    └── vocabulary.md

skills/industry-hr/
├── SKILL.md
└── references/
    ├── kpis.md                 ← Turnover, NPS employés, time-to-hire, absentéisme
    ├── charts.md               ← Pyramide des âges, évolution effectifs
    └── vocabulary.md

skills/industry-retail/
├── SKILL.md
└── references/
    ├── kpis.md                 ← CA/m², panier moyen, taux de conversion, stock rotation
    ├── charts.md               ← Heatmap ventes par heure, comparaison magasins
    └── vocabulary.md

skills/industry-supply-chain/
├── SKILL.md
└── references/
    ├── kpis.md                 ← Taux de service, OTIF, lead time, stock coverage
    ├── charts.md               ← Gantt simplifié, stock vs demande
    └── vocabulary.md
```

### 3.2 UI Factory — Sélecteur d'industrie

- [ ] Ajouter un dropdown/chips "Secteur" dans le prompt container (entre le textarea et le bouton Generate)
- [ ] Options : Généraliste (défaut), Finance, Marketing, RH, Retail, Supply Chain
- [ ] Envoyer le choix au backend avec le prompt
- [ ] La Lambda charge le skill industrie correspondant en plus du dashboard-generator

### 3.3 Intégration Lambda

- [ ] Mapper industrie → skill_id
- [ ] Ajouter le skill industrie dynamiquement dans le container.skills[]
- [ ] Tester chaque industrie avec un jeu de données approprié

**Livrable** : 5 skills industrie, sélecteur UI, dashboards spécialisés
**Durée** : ~3-4 jours (1 jour UI + 0.5 jour par skill + 1 jour tests)
**Impact** : Feature différenciante majeure — dashboards professionnels par secteur

---

## Phase 4 — Exports Multi-Format (2-3 jours)

Objectif : exporter les données/dashboard en PPTX, XLSX, PDF via les Skills Anthropic.

### 4.1 Nouveaux boutons dans la bottom bar

```
[← Factory] [Export Code] [Export PDF] [Export PPTX] [Export XLSX] [Publish]
```

Chaque bouton d'export appelle le backend avec le skill Anthropic correspondant.

### 4.2 Nouvelle Lambda "export"

```
lambda-v2/export/index.mjs
```

Endpoint unique qui reçoit :

```json
{
  "format": "pptx",        // ou "xlsx" ou "pdf"
  "data": [...],             // les données du dashboard
  "dashboardName": "Ventes Q4",
  "kpis": [...],            // KPIs calculés (envoyés depuis le frontend)
  "chartConfigs": [...]     // descriptions des graphiques
}
```

La Lambda appelle Claude avec :

- Le skill Anthropic correspondant (`pptx`, `xlsx`, ou `pdf`)
- Un prompt décrivant ce qu'il faut générer
- Les données

Claude génère le fichier dans le container → on le récupère via la Files API → on le renvoie au frontend en base64 → download automatique.

### 4.3 Implémentation

- [ ] Créer la Lambda export avec les 3 skills Anthropic
- [ ] Ajouter l'endpoint dans template.yaml (API Gateway ou Function URL)
- [ ] Frontend : 3 boutons + appels API + download du fichier
- [ ] Tester chaque format avec des données réelles
- [ ] Vérifier que les PPTX/XLSX/PDF sont de qualité pro

**Livrable** : Export PDF, PPTX, XLSX fonctionnels
**Durée** : ~2-3 jours
**Impact** : Transforme l'outil de "dashboard viewer" en "plateforme analytique complète"

---

## Phase 5 — Review & Vision Skills (1-2 jours)

Objectif : transformer les prompts review/vision en skills aussi.

### 5.1 Skill "Dashboard Reviewer"

```
skills/dashboard-reviewer/
├── SKILL.md                    ← Checklist de review (labels, formatage, espacement, etc.)
└── scripts/
    └── check_code.py           ← Vérifie : imports présents, PieChart a Cell, fmt() défini
```

Le script `check_code.py` fait des vérifications statiques AVANT que Claude review :

- `import React` présent ?
- `import { ResponsiveContainer }` si graphiques ?
- PieChart a des `<Cell>` ?
- `fmt` / `fmtCur` / `fmtPct` définis ?
- Pas de `style={{ color:` quand une classe DS existe ?

Résultat : Claude reçoit un rapport de "linting" + fait sa review visuelle.

### 5.2 Skill "Vision Analyzer"

```
skills/vision-analyzer/
├── SKILL.md                    ← Checklist visuelle (layout, overlap, lisibilité, etc.)
└── references/
    └── common-issues.md        ← Patterns de bugs visuels fréquents et leurs fixes
```

### 5.3 Intégration

- [ ] Upload des 2 skills
- [ ] Modifier l'agent pipeline pour utiliser les skills au lieu des prompts hardcodés
- [ ] Tester le pipeline complet

**Livrable** : Review + Vision via skills, vérifications statiques automatiques
**Durée** : ~1-2 jours

---

## Phase 6 — Polish & Optimisation (1-2 jours)

### 6.1 Mise à jour documentation

- [ ] claude.md — ajouter toute la section Skills
- [ ] technical_documentation.md — architecture skills, API skills, flow mis à jour
- [ ] README pour chaque skill

### 6.2 Script de déploiement skills

- [ ] Intégrer l'upload des skills dans `deploy.ps1`
- [ ] Versioning : à chaque deploy, créer une nouvelle version du skill
- [ ] Rollback possible

### 6.3 Monitoring

- [ ] Logger quel skill est utilisé, combien de tokens consommés
- [ ] Comparer les métriques avant/après skills

### 6.4 Tests end-to-end

- [ ] Tester chaque combinaison : Excel + Finance + Export PPTX
- [ ] Tester : DB + Marketing + Review + Vision
- [ ] Tester : pas de données + Généraliste (prompt seul)

**Durée** : ~1-2 jours

---

## Timeline résumé

| Phase       | Quoi                       | Durée     | Dépendances                  |
| ----------- | -------------------------- | --------- | ---------------------------- |
| **Phase 0** | Setup API + script gestion | 1 jour    | Aucune                       |
| **Phase 1** | Skill Dashboard Generator  | 2-3 jours | Phase 0                      |
| **Phase 2** | Skill Data Analyzer        | 2 jours   | Phase 1                      |
| **Phase 3** | Skills Industrie (×5) + UI | 3-4 jours | Phase 1                      |
| **Phase 4** | Exports PPTX/XLSX/PDF      | 2-3 jours | Phase 0 (indépendant de 1-3) |
| **Phase 5** | Skills Review + Vision     | 1-2 jours | Phase 1                      |
| **Phase 6** | Polish, docs, tests        | 1-2 jours | Toutes                       |

**Total estimé : 12-17 jours** de travail

Phases 2 et 3 peuvent se faire en parallèle.
Phase 4 est indépendante des autres (sauf setup Phase 0).

---

## Priorisation recommandée

Si temps limité, faire dans cet ordre :

1. **Phase 0 + 1** (3-4 jours) — Le fondamental. Réduit les tokens, améliore la qualité.
2. **Phase 2** (2 jours) — Résout le problème #1 : données inventées.
3. **Phase 4** (2-3 jours) — Feature killer : exports multi-format.
4. **Phase 3** (3-4 jours) — Différenciateur : dashboards par industrie.
5. **Phase 5 + 6** (2-4 jours) — Optimisation et polish.

---

## Risques et mitigations

| Risque                                          | Impact                             | Mitigation                                                                  |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| Code Execution Tool change le format de réponse | Casse le pipeline actuel           | Garder l'ancien flow en fallback, migrer progressivement                    |
| Skills beta API instable                        | Bloque tout                        | Garder SYSTEM_PROMPT en backup, feature flag pour activer/désactiver skills |
| Latence accrue (skills loading)                 | UX plus lente                      | Mesurer, optimiser le nombre de skills par requête                          |
| Container network blocked                       | Scripts ne peuvent pas pip install | Vérifier les packages pré-installés, bundler les dépendances                |
| Max 8 skills par requête                        | Limite les combinaisons            | Merger certains skills si nécessaire                                        |
