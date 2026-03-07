# CLAUDE.md — App Factory (AI Agent Dashboard Builder)

## Résumé du Projet

**Nom** : `ai_agent_dashboard_builder`
**Objectif** : Outil interne SK avec 3 flows : (1) générer un dashboard React depuis données/prompt, (2) uploader une app existante → review agents → déploiement GitLab, (3) voir "Mes Apps". Fonctionnalités étendues : Automation Builder, Review Research (Google Maps).
**Contexte** : Consultants SK uploadent données ou code, un agent IA génère/review, puis déploie automatiquement sur GitLab + demande une VM Azure.

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
- [x] Anthropic SDK updated to 0.78.0 (beta API support)
- [x] `callClaude()` wrapper + `extractResponseText()` (supports standard + beta skills API)
- [x] Agent Skills integration — dashboard-generator skill (skill_01RPpTMLicWFr96R3kLV3YDW)
- [x] Skill files: SKILL.md + 11 reference files + validate_output.py
- [x] `manage-skills.mjs` CLI (list/get/upload/delete skills)
- [x] Feature flag `USE_BETA_API` + `DASHBOARD_SKILL_ID` in template.yaml
- [x] Integration test: `test-skill-generation.mjs` (23/24 checks pass)
- [x] Data Analyzer skill — pré-analyse Python des données avant génération (skill_01TJ4sKM6v5aWiBfUCpE7aaM)
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
- [x] ExportFunction in template.yaml (Function URL, 120s timeout)
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
- [x] Dashboard Reviewer skill (skill_01ABSnPFjpR2wUZuoKobc5vs) — check_code.py (15 vérifications statiques) + review qualité IA
- [x] Vision Analyzer skill (skill_0167k41XCVLbcSksQvPsqTfi) — détection problèmes visuels depuis screenshots
- [x] Review pipeline skill-based dans generate Lambda (fallback standard si skill non configuré)
- [x] Vision pipeline converti vers `callClaude()` avec skill + fallback direct API
- [x] Monitoring structuré : logs JSON dans `callClaude()` (tokens, latence, skill, modèle)
- [x] Skill upload automation dans `deploy.ps1` (prompt optionnel post-deploy)
- [x] Integration test: `test-review-vision.mjs` (review bad/good code + vision)
- [x] **GitLab + VM flow** — 3 nouveaux workflows : generate→deploy, upload→review→deploy, My Apps
- [x] AI Intake Chat (`IntakeChat.jsx`) — Claude route l'utilisateur : upload ou generate
- [x] Upload & Review flow (`UploadCode.jsx` + `ReviewResults.jsx`) — ZIP drop, parse, web-app-reviewer agents, score gate ≥ 70
- [x] `web-app-reviewer` skill (skill_01NGUU66Q3PCWWX5RgAbD7bz) — 15 checks statiques Python (XSS, secrets, eval, console.log...) + review qualité IA
- [x] Lambda `intake` — POST /intake, routing IA + mode clarify, 15s
- [x] Lambda `review-code` — Function URL, 120s, web-app-reviewer skill
- [x] Lambda `git-push` — Function URL, 30s, GitLab API v4 (create repo + commit + add members + CI/CD YAML)
- [x] Lambda `vm-request` — POST /vm-request, 60s, Claude génère VM spec + Teams webhook (best-effort)
- [x] Lambda `apps` — GET+POST /apps, 15s, DynamoDB AppRegistry par user
- [x] `DeployForm.jsx` — GitLab project name + CI/CD toggle + VM request form
- [x] `MyApps.jsx` — historique apps par user (DynamoDB)
- [x] DynamoDB `AppRegistry` (PK: userId, SK: appId, PAY_PER_REQUEST)
- [x] CI/CD YAML generation dans `git-push` — `.gitlab-ci.yml` + `azure-pipelines.yml` auto selon stack détectée
- [x] `detectStack()` dans git-push — package.json deps → next/nuxt/svelte/angular/vue/react/vite
- [x] 6 nouvelles fonctions API dans `api.js` — routeIntake, reviewCode, pushToGitLab, requestVm, getMyApps, saveApp
- [x] `deploy.ps1` mis à jour — GitLabToken param, REVIEW_CODE_URL + GIT_PUSH_URL dans frontend/.env
- [x] **Navigation 2 niveaux** — `landing` (APP vs AUTOMATION) → `app-hub` (Build Idea / Upload App / Review Research)
- [x] **5 types d'app** dans la factory — dashboard, scraping, newsletter, reviewResearch, other
- [x] **`ClarificationChat.jsx`** — 2-3 questions IA avant génération pour enrichir le prompt
- [x] `clarifyPrompt()` dans api.js — POST /intake avec `mode: 'clarify'`
- [x] **`ReviewResearch.jsx`** — analyse avis Google Maps (Outscraper API + Claude)
  - 4 industries : restaurant, hotel, saas, retail
  - Critères d'évaluation configurables par secteur
  - Scrape GMaps (Outscraper) ou upload CSV/Excel
  - Job-based asynchrone (start → poll status → get results)
- [x] Lambda `review-research` — Function URL, 300s, 512MB
  - Endpoints : `/start`, `/status/:jobId`, `/results/:jobId`, `/estimate`
  - Stockage jobs en S3 (`review-research/jobs/<jobId>.json`)
  - Outscraper API + Claude pour analyse des avis
- [x] Lambda `estimate-cost` — POST /estimate-cost, 5s, 128MB (calcul pur, sans Claude)
- [x] **Automation flow** — `AutomationChat.jsx` → `generateAutomation()` → `AutomationBuilder.jsx`
- [x] `AutomationChat.jsx`, `AutomationBuilder.jsx`, `AutomationStep.jsx` components
- [x] `generateAutomation()`, `listAutomationTemplates()`, `saveAutomationTemplate()` dans api.js
- [x] **Scraper Generator skill** (skill_015tnYwBrkp8e4sYevkvqsWX) — génère du code Python de scraping
- [x] `SCRAPER_SKILL_ID` env var dans GenerateFunction
- [x] `VITE_EXPORT_URL`, `VITE_REVIEW_RESEARCH_URL` dans frontend/.env (auto-écrit par deploy.ps1)
- [x] `OUTSCRAPER_API_KEY` param SAM (optionnel) → ReviewResearchFunction
- [x] App.jsx 2956 lignes — sidebar avec Upload & Review, Review Research, Automations, My Apps

### En cours / À faire

- [ ] Tester flow GitLab push (create repo + commit + collaborators)
- [ ] Configurer `TEAMS_WEBHOOK_URL` pour notifications data team
- [ ] Tester industry selector avec chaque secteur
- [ ] Tester export buttons (XLSX, PPTX, PDF)
- [ ] Tester flow publish avec auth (build → S3)
- [ ] CloudFront pour le frontend (production)
- [ ] **Sécurité publish mode DB** — credentials dans JS bundlé → risque si URL partagée
- [ ] Service Desk integration (`SERVICEDESK_URL`) — déféré
- [ ] Tester Review Research end-to-end (GMaps scraping + analyse Claude)
- [ ] Tester Automation flow (generateAutomation + builder)
- [ ] Configurer `VITE_AUTOMATION_URL` (Lambda automation à créer ou router via generate?)

## Architecture

```
BROWSER DU CLIENT
┌──────────────────────────────────────────┐
│  React App (Factory UI) — 2956 lignes    │
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
│  └─────────────┘  │ review-research/ │   │
│                   └──────────────────┘   │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ Lambda Functions (12 total)         │ │
│  │ • generate        (Fn URL, 600s)    │ │
│  │ • publish         (API Gateway)     │ │
│  │ • rules           (API Gateway)     │ │
│  │ • db proxy        (Fn URL)          │ │
│  │ • export          (Fn URL, 120s)    │ │
│  │ • intake          (API GW, 15s)     │ │
│  │ • review-code     (Fn URL, 120s)    │ │
│  │ • git-push        (Fn URL, 30s)     │ │
│  │ • vm-request      (API GW, 60s)     │ │
│  │ • apps            (API GW, 15s)     │ │
│  │ • estimate-cost   (API GW, 5s)      │ │
│  │ • review-research (Fn URL, 300s)    │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ DynamoDB                            │ │
│  │ • AppRegistry (userId + appId)      │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ API Gateway (HTTP)                  │ │
│  │ /prod/rules, /prod/publish,         │ │
│  │ /prod/db-schema, /prod/intake,      │ │
│  │ /prod/vm-request, /prod/apps,       │ │
│  │ /prod/estimate-cost                 │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ GitLab (git.simon-kucher.com)       │ │
│  │ • group elevate-paris-apps (ID 1658)│ │
│  │ • auto-create repos per app         │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Stack Technique

| Composant  | Technologie                                                |
| ---------- | ---------------------------------------------------------- |
| Frontend   | React 18 + Vite 7                                          |
| Preview    | @webcontainer/api (StackBlitz)                             |
| Charts     | Recharts                                                   |
| Animations | Motion.dev (motion/react)                                  |
| Auth       | AWS Cognito (amazon-cognito-identity-js)                   |
| Backend    | AWS Lambda (Node.js 20, SAM)                               |
| IA         | Claude API (claude-sonnet-4) + Agent Skills beta           |
| Storage    | S3 + DynamoDB                                              |
| Deploy     | SAM CLI + PowerShell script                                |
| Export     | JSZip (zip) + Anthropic pre-built skills (XLSX, PPTX, PDF)|
| Scraping   | Outscraper API (Google Maps reviews)                       |

## Structure du Projet

```
ai_agent_dashboard_builder/
├── frontend/
│   ├── .env
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                   ← 2956 lignes — orchestration complète
│       ├── services/
│       │   ├── api.js                ← 20+ fonctions API (JWT injection)
│       │   ├── auth.js
│       │   ├── export.js
│       │   └── files-template.js     ← ds.css embarqué
│       └── components/
│           ├── AuthProvider.jsx
│           ├── Login.jsx
│           ├── MatrixRain.jsx
│           ├── FileUpload.jsx
│           ├── DbConnect.jsx
│           ├── IntakeChat.jsx        ← AI routing chat (upload vs generate)
│           ├── ClarificationChat.jsx ← 2-3 questions IA avant génération
│           ├── UploadCode.jsx        ← ZIP drop + file tree + review button
│           ├── ReviewResults.jsx     ← score badge + issues + apply fixes
│           ├── DeployForm.jsx        ← GitLab repo + VM request form
│           ├── MyApps.jsx            ← historique apps par user (DynamoDB)
│           ├── ReviewResearch.jsx    ← analyse avis GMaps (Outscraper + Claude)
│           ├── AutomationChat.jsx    ← chat pour décrire l'automation
│           ├── AutomationBuilder.jsx ← édition pas-à-pas + save template
│           └── AutomationStep.jsx    ← composant step individuel
│
└── lambda-v2/
    ├── deploy.ps1
    ├── template.yaml
    ├── package.json                  ← SDK 0.78.0
    ├── manage-skills.mjs             ← CLI: list/get/upload/delete skills
    ├── test-beta.mjs
    ├── test-skill-generation.mjs
    ├── test-data-analyzer.mjs
    ├── test-review-vision.mjs
    ├── shared/auth.mjs
    ├── generate/index.mjs            ← system prompt + callClaude() + analyzeData()
    ├── publish/index.mjs
    ├── rules/index.mjs
    ├── db/index.mjs
    ├── export/index.mjs              ← XLSX/PPTX/PDF via Anthropic pre-built skills
    ├── intake/index.mjs              ← routing + mode clarify
    ├── review-code/index.mjs         ← web-app-reviewer skill, score gate ≥ 70
    ├── git-push/index.mjs            ← GitLab API v4, CI/CD YAML, add members
    ├── vm-request/index.mjs          ← Claude VM spec + Teams webhook
    ├── apps/index.mjs                ← DynamoDB AppRegistry CRUD
    ├── estimate-cost/index.mjs       ← calcul coût tokens (pur, sans Claude)
    ├── review-research/index.mjs     ← Outscraper GMaps + Claude analyse avis
    └── skills/
        ├── dashboard-generator/      ← SKILL.md + 11 reference files + validate_output.py
        ├── data-analyzer/            ← SKILL.md + 4 scripts Python
        ├── industry-finance/         ← SKILL.md + kpis.md + charts.md + vocabulary.md
        ├── industry-ecommerce/
        ├── industry-saas/
        ├── industry-logistics/
        ├── dashboard-reviewer/       ← SKILL.md + check_code.py + checklist.md
        ├── vision-analyzer/          ← SKILL.md + common-issues.md
        ├── web-app-reviewer/         ← SKILL.md + check_web_app.py + web-quality-checklist.md
        └── scraper-generator/        ← SKILL.md — génère du code Python scraping
```

## Design System — ds.css

CSS embarqué, pas de Tailwind, pas de CDN, pas de build step.
Tailwind v3 PostCSS ne build pas dans WebContainer, CDN bloqué par COEP/COOP.

**Palette DS (dashboards générés)** : #0B1120 (base), #111827 (cards), #06B6D4 (cyan), #EC4899 (magenta), #8B5CF6 (violet), #F59E0B (amber), #10B981 (up), #EF4444 (down)

**Palette Factory UI** : #C80041 (ruby/primary), #06B6D4 (aqua), #10B981 (signalGreen), #FFC666 (signalYellow), #E45444 (signalRed), #111827 (bgPrimary), #0B1120 (bgSecondary)

**Styling** : className="" pour les patterns DS, style={{}} pour le dynamique.

## Navigation Frontend

L'app a 2 niveaux de navigation :
1. **`landing`** — choix top-level : APP vs AUTOMATION
2. **`app-hub`** — choix secondaire : Build Idea (generate) / Upload App (review) / Review Research

États `appView` : `'landing' | 'app-hub' | 'factory' | 'upload-review' | 'my-apps' | 'review-research' | 'automation'`

**5 types d'app** dans la factory : `dashboard` | `scraping` | `newsletter` | `reviewResearch` | `other`
- `dashboard` : preview WebContainer + industry selector
- `scraping` / `newsletter` : code-only, pas de preview, zip download uniquement
- `reviewResearch` : redirige vers ReviewResearch component
- `other` : générique

## Prompt IA — Règles Clés

Deux modes : **Standard** (monolithique SYSTEM_PROMPT dans index.mjs) et **Skill** (Agent Skills beta, fichiers modulaires).
Le mode est contrôlé par `USE_BETA_API` + `DASHBOARD_SKILL_ID` + `DATA_ANALYZER_SKILL_ID` dans template.yaml.

- **Pages** : Vue d'ensemble (KPIs+charts), Analyses (graphiques+filtres obligatoires), Paramètres (design imposé)
- **Filtres** : select dynamiques, useState+useMemo, graphiques réactifs
- **Zéro chiffre inventé** : toute valeur calculée depuis les données réelles
- **PieChart** : toujours Cell avec COLORS
- **Sparklines** : height=40, couleurs différentes par KPI

### Agent Skill — dashboard-generator

- **Skill ID** : `skill_01RPpTMLicWFr96R3kLV3YDW`
- **SDK** : `@anthropic-ai/sdk@^0.78.0`
- **Betas** : `code-execution-2025-08-25`, `skills-2025-10-02`
- **Gestion** : `node manage-skills.mjs list|upload|get|delete`
- **Rollback** : `USE_BETA_API: "false"` dans template.yaml → prompt standard

### Agent Skill — data-analyzer

- **Skill ID** : `skill_01TJ4sKM6v5aWiBfUCpE7aaM`
- **Rôle** : Pré-analyse Python des données avant génération (types colonnes, périodes, stats, recommandations graphiques)
- **Flow** : Two-call strategy — Appel 1 (data-analyzer → analysis JSON) → Appel 2 (dashboard-generator + context analyse)
- **Scripts** : `analyze_columns.py`, `detect_periods.py`, `compute_stats.py`, `suggest_charts.py`
- **Rollback** : `DATA_ANALYZER_SKILL_ID: ""` dans template.yaml → pas de pré-analyse

### Agent Skills — Industry (x4)

4 skills injectant KPIs, vocabulaire FR, et recommandations graphiques par secteur.

| Secteur    | Skill ID                          | KPIs exemples                                         |
| ---------- | --------------------------------- | ----------------------------------------------------- |
| Finance    | `skill_01XhrMpqBzw5CoeqGp9dLYTy`  | EBITDA, Marge brute, BFR, ROE, DSO                    |
| E-commerce | `skill_01BdUH8nfrq5o3PhtL4jmrXv`  | Panier moyen, Taux de conversion, Abandon panier, CAC |
| SaaS       | `skill_01KSiWWfDMqT619dvHe9bwLR`  | MRR, ARR, Churn rate, LTV/CAC, NPS                    |
| Logistique | `skill_01J4e3c46T3wrdtuRBRcRyGU`  | OTIF, Lead time, Taux de rupture, Couverture stock    |

- **Structure** : `SKILL.md` + `references/kpis.md` + `references/charts.md` + `references/vocabulary.md`
- **Frontend** : Chips de sélection secteur (Généraliste, Finance, E-commerce, SaaS, Logistique)
- **Lambda** : `industry` paramètre dans le body → skill ajouté dynamiquement à `skills[]`
- **Rollback** : `INDUSTRY_*_SKILL_ID: ""` dans template.yaml → pas de skill industrie

### Agent Skills — Review, Vision, Web, Scraper

| Skill              | Skill ID                          | Rôle                                                         |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| Dashboard Reviewer | `skill_01ABSnPFjpR2wUZuoKobc5vs`  | check_code.py (15 checks) + review qualité IA                |
| Vision Analyzer    | `skill_0167k41XCVLbcSksQvPsqTfi`  | Analyse screenshots, détecte problèmes visuels, corrige code |
| Web App Reviewer   | `skill_01NGUU66Q3PCWWX5RgAbD7bz`  | Review généraliste toute app web (XSS, secrets, perf, a11y)  |
| Scraper Generator  | `skill_015tnYwBrkp8e4sYevkvqsWX`  | Génère du code Python de scraping (web scraper)              |

- **Review** : `check_code.py` (15 checks : imports, PieChart+Cell, COLORS, emojis, gradient IDs, insights, filtres, IDs bruts)
- **Vision** : `common-issues.md` (12 patterns : overlaps, espaces vides, texte illisible, PieChart gris, filtres cassés)
- **Pipeline** : Generate → Compile → Review (conditional) → Vision → Final Compile
- **Fallback** : si skill ID vide → graceful degradation vers prompts standards
- **Test** : `REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs`

### Export Lambda (XLSX, PPTX, PDF)

- **Endpoint** : Function URL (VITE_EXPORT_URL)
- **Anthropic pre-built skills** : `{ type: "anthropic", skill_id: "pptx|xlsx|pdf", version: "latest" }`
- **Betas** : `code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`
- **Flow** : Claude génère le fichier dans un container → `file_id` extrait → download via Files API → base64 retourné au frontend
- **Timeout** : 120s | **Coût** : ~$0.10-0.15 par export

### Review Research Lambda

- **Endpoint** : Function URL (VITE_REVIEW_RESEARCH_URL)
- **Timeout** : 300s | **Memory** : 512MB
- **Dépendances** : Outscraper API (`OUTSCRAPER_API_KEY`) + Claude Sonnet
- **Endpoints internes** : `/start` → `/status/:jobId` → `/results/:jobId` + `/estimate`
- **Stockage** : S3 (`review-research/jobs/<jobId>.json`)
- **Flow** : config (industry, brands, criteria, scale) → scrape GMaps → analyse par Claude → scores par critère
- **Industries** : restaurant, hotel, saas, retail

### Estimate Cost Lambda

- **Endpoint** : POST /estimate-cost (API Gateway)
- **Timeout** : 5s | **Memory** : 128MB | **Fonction** : calcul pur (pas de Claude)
- **Pricing** : Sonnet ($3/$15 input/output MTok) | Haiku ($0.80/$4 input/output MTok)
- **Output** : `{ total, breakdown: { generation, analysis, review, vision }, currency }`

## GitLab + VM Deployment Flow

### 3 Workflows

1. **Generate & Deploy** : prompt + data → generate dashboard → (optionnel) review → Deploy button → GitLab repo + VM request
2. **Upload & Review** : drop ZIP → parse → web-app-reviewer agents → score ≥ 70 → Deploy → GitLab repo + VM request
3. **My Apps** : liste des apps déployées par user (DynamoDB AppRegistry)

### Routing — IntakeChat + ClarificationChat

Claude Haiku reçoit le message de l'utilisateur → retourne `{ route: "upload|generate|clarify" }`.
Mode `clarify` → **ClarificationChat** pose 2-3 questions → enrichit le prompt avant génération.

### GitLab — git-push Lambda

- **URL base** : `https://git.simon-kucher.com` (`GITLAB_URL`)
- **Groupe** : `elevate-paris-apps` (ID `1658`, `GITLAB_GROUP_ID`)
- **Token** : service account, scope `api` (`GITLAB_TOKEN` via deploy.ps1)
- **Membres auto** : `GITLAB_TEAM_MEMBERS` — `antoinesauauvageSKE2, marwanlenenE2, jeremygarneauSKE2, victoradrienguillermSKE2`
- **CI/CD** : checkbox dans DeployForm → génère `.gitlab-ci.yml` + `azure-pipelines.yml` selon stack détectée
- **Stack detection** : package.json deps → next/nuxt/sveltekit/angular/vue/react/vite
- **Dist dirs** : next→`out/`, nuxt→`.output/public`, sveltekit→`build/`, angular→`dist/`, autres→`dist/`

### VM Request — vm-request Lambda

- Claude Haiku génère un VM spec structuré (size, cost estimate)
- Sizing guide : B1ms (prototype), B2s (internal tool), D2s_v3 (team), D4s_v3 (production)
- Teams webhook (best-effort) → `TEAMS_WEBHOOK_URL`
- Service Desk (best-effort) → `SERVICEDESK_URL` (déféré)

### Env Vars GitLab/VM (template.yaml)

```
GITLAB_URL                = "https://git.simon-kucher.com"
GITLAB_TOKEN              = !Ref GitLabToken (param deploy.ps1)
GITLAB_GROUP_ID           = "1658"
GITLAB_TEAM_MEMBERS       = "antoinesauauvageSKE2, marwanlenenE2, jeremygarneauSKE2, victoradrienguillermSKE2"
TEAMS_WEBHOOK_URL         = "" (à configurer)
SERVICEDESK_URL           = "" (déféré)
SERVICEDESK_TOKEN         = !Ref ServiceDeskToken
WEB_APP_REVIEWER_SKILL_ID = "skill_01NGUU66Q3PCWWX5RgAbD7bz"
SCRAPER_SKILL_ID          = "skill_015tnYwBrkp8e4sYevkvqsWX"
REVIEW_PASS_THRESHOLD     = "70"
APP_REGISTRY_TABLE        = "AppRegistry"
OUTSCRAPER_API_KEY        = !Ref OutscraperApiKey (param optionnel)
```

Frontend `.env` (auto-écrit par deploy.ps1) :

```
VITE_API_URL              = <API Gateway URL>
VITE_GENERATE_URL         = <GenerateFunction URL>
VITE_DB_PROXY_URL         = <DbFunction URL>
VITE_EXPORT_URL           = <ExportFunction URL>
VITE_REVIEW_CODE_URL      = <ReviewCodeFunction URL>
VITE_GIT_PUSH_URL         = <GitPushFunction URL>
VITE_REVIEW_RESEARCH_URL  = <ReviewResearchFunction URL>
VITE_COGNITO_USER_POOL_ID = <pool-id>
VITE_COGNITO_CLIENT_ID    = <client-id>
```

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

## Prérequis Machine (si deploy échoue)

L'IT bloque les installateurs classiques (winget, MSI). Utiliser les installations portables :

### SAM CLI (si `sam` not found)
```powershell
pip install aws-sam-cli
$env:PATH += ";$env:APPDATA\Python\Python313\Scripts"
sam --version
```

### Node.js (si `npm` / `node` not found)
```powershell
curl -L -o "$HOME\Downloads\node-v20.18.0-win-x64.zip" "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
Expand-Archive "$HOME\Downloads\node-v20.18.0-win-x64.zip" -DestinationPath "C:\Users\13287\nodejs"
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Users\13287\nodejs\node-v20.18.0-win-x64", "User")
$env:PATH += ";C:\Users\13287\nodejs\node-v20.18.0-win-x64"
node --version
```

### AWS CLI
```powershell
pip install awscli
$env:PATH += ";$env:APPDATA\Python\Python313\Scripts"
aws --version
```

### Execution Policy
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Commandes

**IMPORTANT** : les chemins contiennent des espaces → toujours utiliser des guillemets `"..."`.

```powershell
# PATH (obligatoire si nouvelle session PowerShell)
$env:PATH += ";C:\Users\13287\nodejs\node-v20.18.0-win-x64;$env:APPDATA\Python\Python313\Scripts"

# Deploy backend (SAM)
cd "C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\ai_agent_dashboard_builder\lambda-v2"
.\deploy.ps1

# Run frontend (dev local)
cd "C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\ai_agent_dashboard_builder\frontend"
npm run dev

# Skills management
cd lambda-v2
node manage-skills.mjs list
node manage-skills.mjs upload skills/dashboard-generator
node manage-skills.mjs upload skills/data-analyzer
node manage-skills.mjs upload skills/industry-finance
node manage-skills.mjs upload skills/industry-ecommerce
node manage-skills.mjs upload skills/industry-saas
node manage-skills.mjs upload skills/industry-logistics
node manage-skills.mjs upload skills/dashboard-reviewer
node manage-skills.mjs upload skills/vision-analyzer
node manage-skills.mjs upload skills/web-app-reviewer
node manage-skills.mjs upload skills/scraper-generator
node manage-skills.mjs get <skill-id>

# Tests
node test-beta.mjs
DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs
DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs
REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs
```

## Bugs Connus

Voir **[potential_bugs.md](potential_bugs.md)** pour la liste des bugs rencontrés et leurs fixes.
Quand un bug est corrigé et pourrait revenir, le documenter dans ce fichier (symptome, cause, fix).

## Notes Dev

- vite.config.js : global: 'globalThis' pour Cognito
- files-template.js : recharts + ds.css complet
- Pas de Tailwind/PostCSS/CDN dans les apps générées
- auth.mjs copié dans chaque Lambda (SAM build par CodeUri séparé)
- GenerateFunction timeout : 600s (vision phase peut dépasser 100s)
- handlePublish : npm run build → dist/ → S3
- SDK 0.78.0 : supporte beta skills + code execution + files API
- `callClaude()` wrapper : switch auto entre standard et beta API, paramètre `maxTokens` + `model` configurables
- Prompt caching : `cache_control: { type: 'ephemeral' }` sur le system prompt (input tokens 90% moins cher)
- Toggle modèle review/vision/export via env vars : `REVIEW_MODEL`, `VISION_MODEL`, `EXPORT_MODEL`. Haiku pour test, Sonnet pour prod.
- Review conditionnelle : skip auto si prompt < 50 mots ET dataset < 100 lignes ET pas de mode DB
- Cache analyse données : frontend cache `_analysisResult` + hash dataset, skip `analyzeData()` si même data
- `stripToAppOnly()` : review/vision n'envoient que `src/App.jsx` (~500-1000 tokens économisés)
- `analyzeData()` : pré-analyse avec data-analyzer skill, retourne null si skill non configuré (graceful degradation)
- Two-call strategy : analyse (maxTokens 8192) → génération (maxTokens 16384), +10-15s de latence
- Skill upload : filenames MUST include top-level dir prefix (e.g. `dashboard-generator/SKILL.md`)
- Skill upload : `display_title` must be unique → auto-delete avant re-upload
- Skill mode : Claude doit être instruit de retourner le JSON en texte (pas dans le container)
- Industry skills : ajoutés dynamiquement via `INDUSTRY_SKILL_IDS[industry]`, max 3 skills par requête
- Export Lambda : Anthropic pre-built skills (`pptx`, `xlsx`, `pdf`) — pas de custom skill, type `"anthropic"`
- Files API : `files-api-2025-04-14` beta — download fichier généré via `client.beta.files.download(fileId)`
- Monitoring : `callClaude()` log JSON structuré (event, label, model, skills, tokens, elapsed_ms, stop_reason) → CloudWatch Logs Insights
- `deploy.ps1` : prompt optionnel "Upload/update Agent Skills?" après SAM deploy, boucle sur 10 dossiers skills
- GitLab token : scope `api` uniquement
- `git-push` Lambda : slug collision → fallback avec suffix timestamp
- `git-push` Lambda : `generateCI: true` → injecte `.gitlab-ci.yml` + `azure-pipelines.yml`
- `review-code` Lambda : fallback system prompt si `WEB_APP_REVIEWER_SKILL_ID` vide
- `vm-request` Lambda : Teams + ServiceDesk tous deux best-effort (non-fatal si échoue)
- `apps` Lambda : DynamoDB QueryCommand par userId, triés par createdAt DESC
- `estimate-cost` Lambda : calcul pur côté serveur, sans Claude, retourne breakdown par phase
- `review-research` Lambda : job-based asynchrone, S3 pour persistence jobs, Outscraper pour GMaps
- `ClarificationChat.jsx` : 2-3 questions IA, construit `enrichedPrompt` = original + Q&A, skip possible
- `ReviewResearch.jsx` : 4 steps (scope → criteria → source → confirm) puis polling résultats
- App.jsx `agentGenerate()` : gestion spéciale scraping/newsletter (code-only, skip preview WebContainer)
- `trimDataToFit()` dans api.js : binary search pour limiter payload à 4.5MB (Lambda Function URL limit 6MB)
- AWS CloudShell : alternative à SAM CLI local (SAM pré-installé, accessible depuis la console AWS)
