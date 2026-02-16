# CLAUDE.md — App Factory (AI Agent Dashboard Builder)

## Résumé du Projet

**Nom** : `ai_agent_dashboard_builder`
**Objectif** : L'utilisateur upload ses données (CSV/Excel) ou connecte une BDD, écrit un prompt, et un agent IA génère un dashboard React complet en live avec preview.
**Contexte** : Outil interne SK pour générer des dashboards d'analyse professionnels.

## État Actuel

### Fait

- [x] Frontend React + Vite + WebContainer (preview live dans le browser)
- [x] Backend AWS Lambda (SAM) — génération, publish, rules, db proxy
- [x] Agent IA multi-phases : génération → compilation → review qualité → analyse visuelle
- [x] Upload fichiers CSV/Excel avec injection données
- [x] Connexion BDD (PostgreSQL/MySQL) via db proxy Lambda
- [x] Export .zip des apps générées (fichiers source complets)
- [x] Publication S3 des apps (build Vite → fichiers statiques)
- [x] Règles métier chargées depuis S3
- [x] Auth Cognito (login, signup, JWT, first-login password change)
- [x] Lambda JWT verification middleware
- [x] Deploy script auto (deploy.ps1 → auto-écrit frontend/.env)
- [x] Design system embarqué ds.css (pas de Tailwind, pas de CDN)
- [x] MatrixRain animation (écran de génération)
- [x] Points clés (key takeaways) en bas des dashboards
- [x] Drawer/hamburger menu (remplace sidebar fixe dans les apps générées)
- [x] KPIs riches avec sparklines et badges variation
- [x] Formatage automatique des nombres (K, M, EUR, %)
- [x] PieChart avec Cell colors obligatoires
- [x] Recharts ajouté au WebContainer (files-template.js)
- [x] Factory UI redesign (Motion.dev animations, FR/EN i18n, grid pattern, suggestion chips, logo/avatar)
- [x] Publish flow corrigé (build dans WebContainer → upload dist/ au lieu des sources)
- [x] Prompt : pages Rapports/Analyses obligent graphiques + filtres
- [x] Prompt : page Paramètres avec design imposé
- [x] Prompt : interdiction de chiffres inventés (zéro fabrication)
- [x] flattenFiles helper pour publish
- [x] Anthropic SDK updated to 0.74.0 (beta API support)
- [x] `callClaude()` wrapper + `extractResponseText()` (supports standard + beta skills API)
- [x] Agent Skills integration — dashboard-generator skill uploaded (skill_01XkRdUeca25kPFLF3DM4b2Y)
- [x] Skill files: SKILL.md + 11 reference files + validate_output.py
- [x] `manage-skills.mjs` CLI (list/get/upload/delete skills)
- [x] Feature flag `USE_BETA_API` + `DASHBOARD_SKILL_ID` in template.yaml
- [x] Integration test: `test-skill-generation.mjs` (23/24 checks pass)
- [x] Data Analyzer skill — pré-analyse Python des données avant génération (skill_01DAnrjyQM5eAJYiCvhMK7Du)
- [x] 4 scripts Python : analyze_columns, detect_periods, compute_stats, suggest_charts
- [x] `analyzeData()` function + two-call strategy (analyse → génération)
- [x] `callClaude()` paramètre `maxTokens` configurable
- [x] `DATA_ANALYZER_SKILL_ID` env var dans template.yaml
- [x] Integration test: `test-data-analyzer.mjs` (30/31 checks pass)
- [x] 4 Industry Skills — finance, ecommerce, saas, logistics (KPIs, charts, vocabulary FR)
- [x] Industry selector chips in frontend (5 options: Généraliste, Finance, E-commerce, SaaS, Logistique)
- [x] Lambda generate: `industry` parameter → injects industry skill dynamically
- [x] Export Lambda (XLSX, PPTX, PDF) via Anthropic pre-built skills + Files API
- [x] Frontend export buttons (3 formats) with base64 → Blob → download
- [x] ExportFunction in template.yaml (API Gateway POST /export, 120s timeout)
- [x] Cost optimization: prompt caching (`cache_control: ephemeral`) dans `callClaude()`
- [x] Cost optimization: toggle Haiku/Sonnet via env vars (REVIEW_MODEL, VISION_MODEL, EXPORT_MODEL)
- [x] Cost optimization: strip fichiers inutiles review/vision (n'envoyer que App.jsx)
- [x] Cost optimization: cache analyse données côté frontend (skip re-analyse même dataset)
- [x] Cost optimization: review conditionnelle (skip si prompt simple + petit dataset)
- [x] Dashboard quality v2: `data-intelligence.md` reference (règles BI: zéro IDs bruts, agrégation obligatoire, tableaux Top 10-15)
- [x] Dashboard quality v2: chart selection guide + axis rules dans `charts.md`
- [x] Dashboard quality v2: Key Takeaways OBLIGATOIRE + layout FIXE par page dans `pages.md`
- [x] Dashboard quality v2: filter styling enforcement dans `filters.md`
- [x] Dashboard quality v2: table content quality rules dans `tables.md`
- [x] Dashboard quality v2: system prompt enrichi (7 rappels critiques inline au lieu de 1 ligne)
- [x] Dashboard quality v2: `temperature: 0` dans `callClaude()` (reproductibilité)
- [x] Dashboard quality v2: KPI selection priority order (4 KPIs fixes) dans `kpis.md`
- [x] Dashboard quality v2: SKILL.md section "RÈGLES CRITIQUES" (7 règles)
- [x] `manage-skills.mjs` upload auto-replace (détecte + supprime ancien skill avant re-upload)
- [x] `manage-skills.mjs` upload prefix = skill name (API constraint: folder prefix must match SKILL.md name)
- [x] Skill renamed `dashboard-generator-v2` (API ne supporte pas delete versions → contournement)

### En cours / À faire

- [ ] Deploy tout (`cd lambda-v2 && .\deploy.ps1`)
- [ ] Tester industry selector avec chaque secteur
- [ ] Tester export buttons (XLSX, PPTX, PDF)
- [ ] Tester flow publish avec auth (build → S3)
- [ ] Tester flow DB Connect avec auth
- [ ] CloudFront pour le frontend (production)
- [ ] **Sécurité publish mode DB** — Les credentials DB sont dans le JS bundlé → risque si URL partagée (voir section Sécurité)
- [ ] Polling auto pour mode DB (refresh données toutes les 30s)

## Architecture

```
BROWSER DU CLIENT
┌──────────────────────────────────────────┐
│  React App (Factory UI)                  │
│  ┌────────────────────────────────────┐  │
│  │  WebContainer (Node.js in browser) │  │
│  │  • Vite build + hot reload         │  │
│  │  • Preview live du dashboard       │  │
│  │  • npm install recharts            │  │
│  └────────────────────────────────────┘  │
└───────────────┬──────────────────────────┘
                │ API calls (JWT)
┌───────────────┴──────────────────────────┐
│  AWS (eu-north-1)                        │
│                                          │
│  ┌─────────────┐  ┌──────────────────┐   │
│  │ Cognito     │  │ S3               │   │
│  │ User Pool   │  │ rules/           │   │
│  │ + Client    │  │ published apps/  │   │
│  └─────────────┘  └──────────────────┘   │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ Lambda Functions                    │ │
│  │ • generate (Function URL, 600s)     │ │
│  │ • publish (API Gateway)             │ │
│  │ • rules (API Gateway)               │ │
│  │ • db proxy (Function URL)           │ │
│  │ • export (API Gateway, 120s)        │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ API Gateway (HTTP)                  │ │
│  │ /prod/rules, /prod/publish,         │ │
│  │ /prod/db-schema, /prod/export       │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Stack Technique

| Composant  | Technologie                              |
| ---------- | ---------------------------------------- |
| Frontend   | React 18 + Vite 7                        |
| Preview    | @webcontainer/api (StackBlitz)           |
| Charts     | Recharts                                 |
| Animations | Motion.dev (motion/react)                |
| Auth       | AWS Cognito (amazon-cognito-identity-js) |
| Backend    | AWS Lambda (Node.js 20, SAM)             |
| IA         | Claude API (claude-sonnet-4) + Agent Skills beta |
| Storage    | S3                                       |
| Deploy     | SAM CLI + PowerShell script              |
| Export     | JSZip (zip) + Anthropic pre-built skills (XLSX, PPTX, PDF) |

## Structure du Projet

```
ai_agent_dashboard_builder/
├── frontend/
│   ├── .env
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── services/
│       │   ├── api.js
│       │   ├── auth.js
│       │   ├── export.js
│       │   └── files-template.js  ← ds.css embarqué
│       └── components/
│           ├── AuthProvider.jsx
│           ├── Login.jsx
│           ├── MatrixRain.jsx
│           ├── FileUpload.jsx
│           └── DbConnect.jsx
│
└── lambda-v2/
    ├── deploy.ps1
    ├── template.yaml
    ├── package.json              ← management scripts deps (SDK 0.74.0)
    ├── manage-skills.mjs         ← CLI: list/get/upload/delete skills
    ├── test-beta.mjs             ← Beta API verification tests
    ├── test-skill-generation.mjs ← Skill integration test (24 checks)
    ├── test-data-analyzer.mjs    ← Data analyzer test (31 checks)
    ├── shared/auth.mjs
    ├── generate/
    │   ├── index.mjs             ← system prompt + callClaude() + analyzeData() + generate + vision
    │   └── package.json          ← SDK 0.74.0
    ├── publish/index.mjs
    ├── rules/index.mjs
    ├── db/index.mjs
    ├── export/                   ← Export Lambda (XLSX, PPTX, PDF)
    │   ├── index.mjs             ← Anthropic pre-built skills + Files API
    │   ├── package.json          ← SDK 0.74.0
    │   └── auth.mjs              ← JWT verification (copy from shared/)
    └── skills/
        ├── dashboard-generator/  ← Agent Skill (uploaded to Anthropic)
        │   ├── SKILL.md          ← entry point (frontmatter + core rules)
        │   ├── references/       ← 11 reference files (design-system, charts, kpis, etc.)
        │   └── scripts/
        │       └── validate_output.py
        ├── data-analyzer/        ← Pré-analyse des données (Python scripts)
        │   ├── SKILL.md          ← instructions + output format
        │   ├── scripts/          ← 4 scripts Python (analyze_columns, detect_periods, compute_stats, suggest_charts)
        │   └── references/
        │       └── chart-selection-guide.md
        ├── industry-finance/     ← Secteur Finance/Comptabilité
        │   ├── SKILL.md
        │   └── references/       ← kpis.md, charts.md, vocabulary.md
        ├── industry-ecommerce/   ← Secteur E-commerce/Retail
        │   ├── SKILL.md
        │   └── references/
        ├── industry-saas/        ← Secteur SaaS/Tech
        │   ├── SKILL.md
        │   └── references/
        └── industry-logistics/   ← Secteur Logistique/Supply Chain
            ├── SKILL.md
            └── references/
```

## Design System — ds.css

CSS embarqué, pas de Tailwind, pas de CDN, pas de build step.
Tailwind v3 PostCSS ne build pas dans WebContainer, CDN bloqué par COEP/COOP.

**Palette** : #0B1120 (base), #111827 (cards), #06B6D4 (cyan), #EC4899 (magenta), #8B5CF6 (violet), #F59E0B (amber), #10B981 (up), #EF4444 (down)

**Styling** : className="" pour les patterns DS, style={{}} pour le dynamique.

## Prompt IA — Règles Clés

Deux modes : **Standard** (monolithique SYSTEM_PROMPT dans index.mjs) et **Skill** (Agent Skills beta, fichiers modulaires).
Le mode est contrôlé par `USE_BETA_API` + `DASHBOARD_SKILL_ID` + `DATA_ANALYZER_SKILL_ID` dans template.yaml.

- **Pages** : Vue d'ensemble (KPIs+charts), Analyses (graphiques+filtres obligatoires), Paramètres (design imposé)
- **Filtres** : select dynamiques, useState+useMemo, graphiques réactifs
- **Zéro chiffre inventé** : toute valeur calculée depuis les données réelles
- **PieChart** : toujours Cell avec COLORS
- **Sparklines** : height=40, couleurs différentes par KPI

### Agent Skill — dashboard-generator

- **Skill ID** : `skill_01XkRdUeca25kPFLF3DM4b2Y`
- **SDK** : `@anthropic-ai/sdk@^0.74.0`
- **Betas** : `code-execution-2025-08-25`, `skills-2025-10-02`
- **Gestion** : `node manage-skills.mjs list|upload|get|delete`
- **Test** : `DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs`
- **Rollback** : `USE_BETA_API: "false"` dans template.yaml → prompt standard

### Agent Skill — data-analyzer

- **Skill ID** : `skill_01DAnrjyQM5eAJYiCvhMK7Du`
- **Rôle** : Pré-analyse Python des données avant génération (types colonnes, périodes, stats, recommandations graphiques)
- **Flow** : Two-call strategy — Appel 1 (data-analyzer → analysis JSON) → Appel 2 (dashboard-generator + context analyse)
- **Scripts** : `analyze_columns.py`, `detect_periods.py`, `compute_stats.py`, `suggest_charts.py`
- **Test** : `DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs`
- **Rollback** : `DATA_ANALYZER_SKILL_ID: ""` dans template.yaml → pas de pré-analyse

### Agent Skills — Industry (x4)

4 skills injectant KPIs, vocabulaire FR, et recommandations graphiques par secteur.

| Secteur | Skill ID | KPIs exemples |
|---------|----------|---------------|
| Finance | `skill_013h9deHQb7CaA47xd59Uytd` | EBITDA, Marge brute, BFR, ROE, DSO |
| E-commerce | `skill_014PUPgrYoGE8BRDwiDhZDMP` | Panier moyen, Taux de conversion, Abandon panier, CAC |
| SaaS | `skill_01Ekuh6H7ZKBkA2qzdXYzr1y` | MRR, ARR, Churn rate, LTV/CAC, NPS |
| Logistique | `skill_011zy4TbPD7jcWEfiMKfi4jN` | OTIF, Lead time, Taux de rupture, Couverture stock |

- **Structure** : `SKILL.md` + `references/kpis.md` + `references/charts.md` + `references/vocabulary.md`
- **Frontend** : Chips de sélection secteur (Généraliste, Finance, E-commerce, SaaS, Logistique)
- **Lambda** : `industry` paramètre dans le body → skill ajouté dynamiquement à `skills[]`
- **Rollback** : `INDUSTRY_*_SKILL_ID: ""` dans template.yaml → pas de skill industrie

### Export Lambda (XLSX, PPTX, PDF)

- **Endpoint** : `POST /prod/export`
- **Anthropic pre-built skills** : `{ type: "anthropic", skill_id: "pptx", version: "latest" }`
- **Betas** : `code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`
- **Flow** : Claude génère le fichier dans un container → `file_id` extrait → download via Files API → base64 retourné au frontend
- **Frontend** : 3 boutons export (XLSX, PPTX, PDF) → base64 → Blob → download automatique
- **Timeout** : 120s
- **Coût** : ~$0.10-0.15 par export

## Publish & Export

- **Export Code** = zip sources (pour dev) → npm install && npm run dev
- **Export XLSX/PPTX/PDF** = Anthropic pre-built skills génèrent le fichier → Files API download → base64 → Blob → download
- **Publish** = build Vite dans WebContainer → dist/ → S3 (site statique)
- **Mode Excel** : snapshot figé
- **Mode DB** : live (fetch à chaque chargement) ⚠️ credentials dans le JS

## Sécurité

- Auth Cognito sur toutes les API
- S3 publish : URL publique non-indexée (OK pour usage interne)
- ⚠️ Mode DB + Publish : credentials dans le JS bundlé
- **TODO** : warning au publish DB, CloudFront+auth, API key par dashboard, queries pré-définies

## Commandes

```powershell
cd lambda-v2 && .\deploy.ps1     # Deploy backend
cd frontend && npm run dev         # Run frontend

# Skills management
cd lambda-v2
node manage-skills.mjs list                              # List skills
node manage-skills.mjs upload skills/dashboard-generator  # Upload skill
node manage-skills.mjs upload skills/data-analyzer        # Upload data-analyzer skill
node manage-skills.mjs upload skills/industry-finance     # Upload industry skill
node manage-skills.mjs upload skills/industry-ecommerce
node manage-skills.mjs upload skills/industry-saas
node manage-skills.mjs upload skills/industry-logistics
node manage-skills.mjs get <skill-id>                     # Get skill details

# Tests
node test-beta.mjs                                        # Verify beta API access
DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs  # Test skill generation
DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs  # Test data analysis
```

## Notes Dev

- vite.config.js : global: 'globalThis' pour Cognito
- files-template.js : recharts + ds.css complet
- Pas de Tailwind/PostCSS/CDN
- auth.mjs copié dans chaque Lambda
- GenerateFunction timeout : 600s
- handlePublish : npm run build → dist/ → S3
- SDK 0.74.0 : supporte beta skills + code execution
- `callClaude()` wrapper : switch auto entre standard et beta API, paramètre `maxTokens` + `model` configurables
- Prompt caching : `cache_control: { type: 'ephemeral' }` sur le system prompt (input tokens 90% moins cher)
- Toggle modèle review/vision/export via env vars : `REVIEW_MODEL`, `VISION_MODEL`, `EXPORT_MODEL`. **Haiku configuré pour test** (`claude-haiku-4-5-20251001`), **Sonnet pour la prod** (`claude-sonnet-4-20250514`, valeur par défaut si env var non définie). Changer dans la console Lambda AWS (effet immédiat) ou template.yaml (redeploy)
- Review conditionnelle : skip auto si prompt < 50 mots ET dataset < 100 lignes ET pas de mode DB
- Cache analyse données : frontend cache `_analysisResult` + hash dataset, skip `analyzeData()` si même data
- `stripToAppOnly()` : review/vision n'envoient que `src/App.jsx` (économie ~500-1000 tokens/appel)
- `analyzeData()` : pré-analyse avec data-analyzer skill, retourne null si skill non configuré (graceful degradation)
- Two-call strategy : analyse (maxTokens 8192) → génération (maxTokens 16384), +10-15s de latence
- Skill upload : filenames MUST include top-level dir prefix (e.g. `dashboard-generator/SKILL.md`)
- Skill upload : `display_title` must be unique, sinon erreur 400
- Skill mode : Claude doit être instruit de retourner le JSON en texte (pas dans le container)
- Industry skills : ajoutés dynamiquement via `INDUSTRY_SKILL_IDS[industry]`, max 3 skills par requête (dashboard + data-analyzer + industry)
- Export Lambda : Anthropic pre-built skills (`pptx`, `xlsx`, `pdf`) — pas de custom skill, type `"anthropic"`
- Files API : `files-api-2025-04-14` beta — download fichier généré via `client.beta.files.download(fileId)`
- Export timeout : 120s (génération fichier dans container peut prendre 30-60s)
