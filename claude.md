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

### En cours / À faire

- [ ] Bug : timeout vision phase (Lambda 300s parfois insuffisant → augmenter à 600s)
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
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ API Gateway (HTTP)                  │ │
│  │ /prod/rules, /prod/publish,         │ │
│  │ /prod/db-schema                     │ │
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
| IA         | Claude API (claude-sonnet-4)             |
| Storage    | S3                                       |
| Deploy     | SAM CLI + PowerShell script              |
| Export     | JSZip                                    |

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
    ├── shared/auth.mjs
    ├── generate/index.mjs  ← system prompt + generate + vision
    ├── publish/index.mjs
    ├── rules/index.mjs
    └── db/index.mjs
```

## Design System — ds.css

CSS embarqué, pas de Tailwind, pas de CDN, pas de build step.
Tailwind v3 PostCSS ne build pas dans WebContainer, CDN bloqué par COEP/COOP.

**Palette** : #0B1120 (base), #111827 (cards), #06B6D4 (cyan), #EC4899 (magenta), #8B5CF6 (violet), #F59E0B (amber), #10B981 (up), #EF4444 (down)

**Styling** : className="" pour les patterns DS, style={{}} pour le dynamique.

## Prompt IA — Règles Clés

- **Pages** : Vue d'ensemble (KPIs+charts), Analyses (graphiques+filtres obligatoires), Paramètres (design imposé)
- **Filtres** : select dynamiques, useState+useMemo, graphiques réactifs
- **Zéro chiffre inventé** : toute valeur calculée depuis les données réelles
- **PieChart** : toujours Cell avec COLORS
- **Sparklines** : height=40, couleurs différentes par KPI

## Publish & Export

- **Export** = zip sources (pour dev) → npm install && npm run dev
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
```

## Notes Dev

- vite.config.js : global: 'globalThis' pour Cognito
- files-template.js : recharts + ds.css complet
- Pas de Tailwind/PostCSS/CDN
- auth.mjs copié dans chaque Lambda
- GenerateFunction timeout : 600s
- handlePublish : npm run build → dist/ → S3
