# CLAUDE.md — App Factory (AI Agent Dashboard Builder)

## Résumé du Projet

**Nom** : `ai_agent_dashboard_builder`
**Objectif** : Outil interne SK avec 3 flows : (1) générer un dashboard React depuis données/prompt, (2) uploader une app existante → review agents → déploiement GitLab, (3) voir "Mes Apps".
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
- [x] Dashboard Reviewer skill — vérifications statiques Python (`check_code.py`) + review qualité IA (skill_01G3LJaHUFQn9WTbcrmTFCrB)
- [x] Vision Analyzer skill — détection problèmes visuels depuis screenshots (skill_016hJRgXdpBiDrcbknvQYQLW)
- [x] Review pipeline skill-based dans generate Lambda (fallback standard si skill non configuré)
- [x] Vision pipeline converti vers `callClaude()` avec skill + fallback direct API
- [x] Monitoring structuré : logs JSON dans `callClaude()` (tokens, latence, skill, modèle)
- [x] Skill upload automation dans `deploy.ps1` (prompt optionnel post-deploy)
- [x] Integration test: `test-review-vision.mjs` (review bad/good code + vision)
- [x] **GitLab + VM flow** — 3 nouveaux workflows : generate→deploy, upload→review→deploy, My Apps
- [x] AI Intake Chat (`IntakeChat.jsx`) — Claude route l'utilisateur : upload ou generate
- [x] Upload & Review flow (`UploadCode.jsx` + `ReviewResults.jsx`) — ZIP drop, parse, web-app-reviewer agents, score gate ≥ 70
- [x] `web-app-reviewer` skill — 15 checks statiques Python (XSS, secrets, eval, console.log...) + review qualité IA
- [x] Lambda `intake` — POST /intake, routing IA, 15s
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

### En cours / À faire

- [x] Deploy backend (SAM via AWS CloudShell) — fait
- [x] Corriger `GITLAB_URL` dans template.yaml → `https://git.simon-kucher.com` — corrigé
- [ ] **🔴 BUG EN COURS — Generate silencieux** : generate échoue après ~15s et revient sans message d'erreur
  - Cause probable : `VITE_GENERATE_URL` (et autres `VITE_*`) non configurés dans Azure Static Web Apps Application Settings → fallback sur `http://localhost:3001/generate` qui timeout
  - Fix code déjà appliqué : `lastGenerateError` state dans `App.jsx` — l'erreur sera maintenant visible en rouge sous le bouton Generate après l'échec
  - Fix Azure nécessaire : Azure Portal → Static Web App → Configuration → Application Settings → ajouter `VITE_API_URL`, `VITE_GENERATE_URL`, `VITE_DB_PROXY_URL`, `VITE_REVIEW_CODE_URL`, `VITE_GIT_PUSH_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` (valeurs depuis CloudFormation Outputs → stack `app-factory`)
- [ ] Uploader `web-app-reviewer` skill → récupérer skill ID → mettre dans `WEB_APP_REVIEWER_SKILL_ID`
- [ ] Tester flow GitLab push (create repo + commit + collaborators)
- [ ] Configurer `TEAMS_WEBHOOK_URL` pour notifications data team
- [ ] Tester industry selector avec chaque secteur
- [ ] Tester export buttons (XLSX, PPTX, PDF)
- [ ] Tester flow publish avec auth (build → S3)
- [ ] CloudFront pour le frontend (production)
- [ ] **Sécurité publish mode DB** — credentials dans JS bundlé → risque si URL partagée
- [ ] Service Desk integration (`SERVICEDESK_URL`) — déféré

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
│  │ Lambda Functions (10 total)         │ │
│  │ • generate (Function URL, 600s)     │ │
│  │ • publish (API Gateway)             │ │
│  │ • rules (API Gateway)               │ │
│  │ • db proxy (Function URL)           │ │
│  │ • export (API Gateway, 120s)        │ │
│  │ • intake (API Gateway, 15s)         │ │
│  │ • review-code (Function URL, 120s)  │ │
│  │ • git-push (Function URL, 30s)      │ │
│  │ • vm-request (API Gateway, 60s)     │ │
│  │ • apps (API Gateway, 15s)           │ │
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
│  │ /prod/db-schema, /prod/export,      │ │
│  │ /prod/intake, /prod/vm-request,     │ │
│  │ /prod/apps                          │ │
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
| Storage    | S3                                                         |
| Deploy     | SAM CLI + PowerShell script                                |
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
│           ├── DbConnect.jsx
│           ├── IntakeChat.jsx    ← AI routing chat (upload vs generate)
│           ├── UploadCode.jsx    ← ZIP drop + file tree + review button
│           ├── ReviewResults.jsx ← score badge + issues + apply fixes
│           ├── DeployForm.jsx    ← GitLab repo + VM request form
│           └── MyApps.jsx        ← historique apps par user (DynamoDB)
│
└── lambda-v2/
    ├── deploy.ps1
    ├── template.yaml
    ├── package.json              ← management scripts deps (SDK 0.74.0)
    ├── manage-skills.mjs         ← CLI: list/get/upload/delete skills
    ├── test-beta.mjs             ← Beta API verification tests
    ├── test-skill-generation.mjs ← Skill integration test (24 checks)
    ├── test-data-analyzer.mjs    ← Data analyzer test (31 checks)
    ├── test-review-vision.mjs    ← Review + Vision skills test
    ├── shared/auth.mjs
    ├── generate/
    │   ├── index.mjs             ← system prompt + callClaude() + analyzeData() + generate + vision
    │   └── package.json          ← SDK 0.74.0
    ├── publish/index.mjs
    ├── rules/index.mjs
    ├── db/index.mjs
    ├── intake/index.mjs          ← AI routing (upload vs generate), Haiku, 15s
    ├── review-code/index.mjs     ← web-app-reviewer skill, score gate ≥ 70, 120s
    ├── git-push/index.mjs        ← GitLab API v4, CI/CD YAML gen, add members, 30s
    ├── vm-request/index.mjs      ← Claude VM spec + Teams webhook (best-effort), 60s
    ├── apps/index.mjs            ← DynamoDB AppRegistry CRUD, 15s
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
        ├── dashboard-reviewer/   ← Review qualité code (Python checks + IA)
        │   ├── SKILL.md
        │   ├── scripts/
        │   │   └── check_code.py    ← 15 vérifications statiques JSX
        │   └── references/
        │       └── checklist.md
        ├── vision-analyzer/      ← Analyse visuelle screenshots
        │   ├── SKILL.md
        │   └── references/
        │       └── common-issues.md ← 12 patterns bugs visuels + fixes
        ├── industry-logistics/   ← Secteur Logistique/Supply Chain
        │   ├── SKILL.md
        │   └── references/
        └── web-app-reviewer/     ← Review qualité généraliste (toute app web)
            ├── SKILL.md
            ├── scripts/
            │   └── check_web_app.py  ← 15 checks (XSS, secrets, eval, console.log...)
            └── references/
                └── web-quality-checklist.md
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

| Secteur    | Skill ID                         | KPIs exemples                                         |
| ---------- | -------------------------------- | ----------------------------------------------------- |
| Finance    | `skill_013h9deHQb7CaA47xd59Uytd` | EBITDA, Marge brute, BFR, ROE, DSO                    |
| E-commerce | `skill_014PUPgrYoGE8BRDwiDhZDMP` | Panier moyen, Taux de conversion, Abandon panier, CAC |
| SaaS       | `skill_01Ekuh6H7ZKBkA2qzdXYzr1y` | MRR, ARR, Churn rate, LTV/CAC, NPS                    |
| Logistique | `skill_011zy4TbPD7jcWEfiMKfi4jN` | OTIF, Lead time, Taux de rupture, Couverture stock    |

- **Structure** : `SKILL.md` + `references/kpis.md` + `references/charts.md` + `references/vocabulary.md`
- **Frontend** : Chips de sélection secteur (Généraliste, Finance, E-commerce, SaaS, Logistique)
- **Lambda** : `industry` paramètre dans le body → skill ajouté dynamiquement à `skills[]`
- **Rollback** : `INDUSTRY_*_SKILL_ID: ""` dans template.yaml → pas de skill industrie

### Agent Skills — Review & Vision

| Skill              | Skill ID                                   | Rôle                                                         |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| Dashboard Reviewer | `skill_01G3LJaHUFQn9WTbcrmTFCrB`           | Vérifications statiques (check_code.py) + review qualité IA  |
| Vision Analyzer    | `skill_016hJRgXdpBiDrcbknvQYQLW`           | Analyse screenshots, détecte problèmes visuels, corrige code |
| Web App Reviewer   | `WEB_APP_REVIEWER_SKILL_ID` (à configurer) | Review généraliste toute app web (XSS, secrets, perf, a11y)  |

- **Review** : `check_code.py` (15 checks : imports, PieChart+Cell, COLORS, emojis, gradient IDs, insights, filtres, IDs bruts)
- **Vision** : `common-issues.md` (12 patterns : overlaps, espaces vides, texte illisible, PieChart gris, filtres cassés)
- **Pipeline** : Generate → Compile → Review (conditional) → Vision → Final Compile
- **Fallback** : si `REVIEWER_SKILL_ID=""` → review via path generate standard ; si `VISION_SKILL_ID=""` → vision via API directe
- **Test** : `REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs`

### Export Lambda (XLSX, PPTX, PDF)

- **Endpoint** : `POST /prod/export`
- **Anthropic pre-built skills** : `{ type: "anthropic", skill_id: "pptx", version: "latest" }`
- **Betas** : `code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`
- **Flow** : Claude génère le fichier dans un container → `file_id` extrait → download via Files API → base64 retourné au frontend
- **Frontend** : 3 boutons export (XLSX, PPTX, PDF) → base64 → Blob → download automatique
- **Timeout** : 120s
- **Coût** : ~$0.10-0.15 par export

## GitLab + VM Deployment Flow

### 3 Workflows

1. **Generate & Deploy** : prompt + data → generate dashboard → (optionnel) review → Deploy button → GitLab repo + VM request
2. **Upload & Review** : drop ZIP → parse → web-app-reviewer agents → score ≥ 70 → Deploy → GitLab repo + VM request
3. **My Apps** : liste des apps déployées par user (DynamoDB AppRegistry)

### Routing — IntakeChat

Claude Haiku reçoit le message de l'utilisateur → retourne `{ route: "upload|generate|clarify" }`.

- `upload` → flow Upload & Review
- `generate` → factory existante (prompt + données)
- `clarify` → question de suivi

### GitLab — git-push Lambda

- **URL base** : `https://git.simon-kucher.com` (`GITLAB_URL`)
- **Groupe** : `elevate-paris-apps` (ID `1658`, `GITLAB_GROUP_ID`)
- **Token** : service account, scope `api` (`GITLAB_TOKEN` via deploy.ps1)
- **Membres auto** : `GITLAB_TEAM_MEMBERS` — ajoutés comme Developer à chaque nouveau repo
- **CI/CD** : checkbox dans DeployForm → génère `.gitlab-ci.yml` + `azure-pipelines.yml` selon stack détectée
- **Stack detection** : package.json deps → next/nuxt/sveltekit/angular/vue/react/vite
- **Dist dirs** : next→`out/`, nuxt→`.output/public`, sveltekit→`build/`, angular→`dist/`, autres→`dist/`

### VM Request — vm-request Lambda

- Claude Haiku génère un VM spec structuré (size, cost estimate)
- Teams webhook (best-effort) → `TEAMS_WEBHOOK_URL`
- Service Desk (best-effort) → `SERVICEDESK_URL` (déféré)
- Si `SERVICEDESK_URL` vide → retourne le payload pour soumission manuelle

### Env Vars GitLab/VM (template.yaml)

```
GITLAB_URL            = "https://git.simon-kucher.com"
GITLAB_TOKEN          = !Ref GitLabToken (param deploy.ps1)
GITLAB_GROUP_ID       = "1658"
GITLAB_TEAM_MEMBERS   = "user1, user2, user3"
TEAMS_WEBHOOK_URL     = "" (à configurer)
SERVICEDESK_URL       = "" (déféré)
SERVICEDESK_TOKEN     = !Ref ServiceDeskToken
WEB_APP_REVIEWER_SKILL_ID = "" (à remplir après upload du skill)
REVIEW_PASS_THRESHOLD = "70"
APP_REGISTRY_TABLE    = "AppRegistry"
```

Frontend `.env` (auto-écrit par deploy.ps1) :

```
VITE_REVIEW_CODE_URL  = <ReviewCodeFunction URL>
VITE_GIT_PUSH_URL     = <GitPushFunction URL>
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
# Ajouter au PATH si pas trouvé :
$env:PATH += ";$env:APPDATA\Python\Python313\Scripts"
# Vérifier :
sam --version
```

### Node.js (si `npm` / `node` not found)
```powershell
# 1. Télécharger le zip portable (pas MSI)
curl -L -o "$HOME\Downloads\node-v20.18.0-win-x64.zip" "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"

# 2. Extraire
Expand-Archive "$HOME\Downloads\node-v20.18.0-win-x64.zip" -DestinationPath "C:\Users\13287\nodejs"

# 3. Ajouter au PATH (permanent, une seule fois)
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Users\13287\nodejs\node-v20.18.0-win-x64", "User")

# 4. Ajouter au PATH (session courante)
$env:PATH += ";C:\Users\13287\nodejs\node-v20.18.0-win-x64"

# 5. Vérifier
node --version   # v20.18.0
npm --version    # 10.8.2
```

### AWS CLI (si `aws` not found)
```powershell
pip install awscli
$env:PATH += ";$env:APPDATA\Python\Python313\Scripts"
aws --version
```

### Execution Policy (si .ps1 bloqué)
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Commandes

**IMPORTANT** : les chemins contiennent des espaces → toujours utiliser des guillemets `"..."`.

```powershell
# ⚡ DEPLOY RAPIDE (copier-coller dans PowerShell)
# 1. PATH (obligatoire si nouvelle session PowerShell)
$env:PATH += ";C:\Users\13287\nodejs\node-v20.18.0-win-x64;$env:APPDATA\Python\Python313\Scripts"
# 2. Deploy backend (SAM)
cd "C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\ai_agent_dashboard_builder\lambda-v2"
.\deploy.ps1
# 3. Run frontend (dev local)
cd "C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\ai_agent_dashboard_builder\frontend"
npm run dev

# Skills management
cd lambda-v2
node manage-skills.mjs list                              # List skills
node manage-skills.mjs upload skills/dashboard-generator  # Upload skill
node manage-skills.mjs upload skills/data-analyzer        # Upload data-analyzer skill
node manage-skills.mjs upload skills/industry-finance     # Upload industry skill
node manage-skills.mjs upload skills/industry-ecommerce
node manage-skills.mjs upload skills/industry-saas
node manage-skills.mjs upload skills/industry-logistics
node manage-skills.mjs upload skills/dashboard-reviewer    # Upload reviewer skill
node manage-skills.mjs upload skills/vision-analyzer       # Upload vision skill
node manage-skills.mjs upload skills/web-app-reviewer      # Upload web app reviewer skill
node manage-skills.mjs get <skill-id>                     # Get skill details

# Tests
node test-beta.mjs                                        # Verify beta API access
DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs  # Test skill generation
DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs  # Test data analysis
REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs  # Test review + vision
```

## Bugs Connus

Voir **[potential_bugs.md](potential_bugs.md)** pour la liste des bugs rencontrés et leurs fixes.
Quand un bug est corrigé et pourrait revenir, le documenter dans ce fichier (symptome, cause, fix).

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
- `REVIEWER_SKILL_ID` + `VISION_SKILL_ID` : env vars pour activer review/vision via skills (vides = fallback)
- Review skill-based : `check_code.py` vérifie 15 points (imports, PieChart+Cell, COLORS, emojis, gradient IDs, insights, filtres, IDs bruts) → Claude corrige
- Vision skill-based : utilise `callClaude()` avec `common-issues.md` comme référence, fallback vers API directe si skill non configuré
- Monitoring : `callClaude()` log JSON structuré (event, label, model, skills, tokens, elapsed_ms, stop_reason) → CloudWatch Logs Insights
- `deploy.ps1` : prompt optionnel "Upload/update Agent Skills?" après SAM deploy, boucle sur les 9 dossiers skills (+ web-app-reviewer)
- GitLab token : scope `api` uniquement (couvre create project, push commit, add members)
- `git-push` Lambda : slug collision → fallback avec suffix timestamp (ex: `mon-app-k3f2a`)
- `git-push` Lambda : `generateCI: true` → injecte `.gitlab-ci.yml` + `azure-pipelines.yml` dans le commit
- `review-code` Lambda : fallback system prompt si `WEB_APP_REVIEWER_SKILL_ID` vide (graceful degradation)
- `vm-request` Lambda : Teams + ServiceDesk tous deux best-effort (non-fatal si échoue)
- `apps` Lambda : DynamoDB QueryCommand par userId, triés par createdAt DESC
- AWS CloudShell : alternative à SAM CLI local (SAM pré-installé, accessible depuis la console AWS)
