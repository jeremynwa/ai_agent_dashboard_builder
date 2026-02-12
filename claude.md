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
- [x] Export .zip des apps générées
- [x] Publication S3 des apps
- [x] Règles métier chargées depuis S3
- [x] Auth Cognito (login, signup, JWT, first-login password change)
- [x] Lambda JWT verification middleware
- [x] Deploy script auto (deploy.ps1 → auto-écrit frontend/.env)
- [x] Design system premium navy/cyan (dashboards générés)
- [x] MatrixRain animation (écran de génération)
- [x] Points clés (key takeaways) en bas des dashboards
- [x] Drawer/hamburger menu (remplace sidebar fixe dans les apps générées)
- [x] KPIs riches avec sparklines, CY vs PY, badges variation
- [x] Formatage automatique des nombres (K, M, EUR, %)
- [x] PieChart avec Cell colors obligatoires
- [x] Recharts ajouté au WebContainer (files-template.js)

### En cours / À faire

- [ ] Bug : timeout vision phase (Lambda 300s parfois insuffisant → augmenter à 600s)
- [ ] Aligner UI Factory (login, sidebar) sur le thème navy/cyan
- [ ] Tester flow publish avec auth
- [ ] Tester flow DB Connect avec auth
- [ ] Animations/transitions dans la Factory UI
- [ ] CloudFront pour le frontend (production)

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

| Composant | Technologie                              |
| --------- | ---------------------------------------- |
| Frontend  | React 18 + Vite 7                        |
| Preview   | @webcontainer/api (StackBlitz)           |
| Charts    | Recharts                                 |
| Auth      | AWS Cognito (amazon-cognito-identity-js) |
| Backend   | AWS Lambda (Node.js 20, SAM)             |
| IA        | Claude API (claude-sonnet-4)             |
| Storage   | S3                                       |
| Deploy    | SAM CLI + PowerShell script              |
| Export    | JSZip                                    |

## Structure du Projet

```
ai_agent_dashboard_builder/
├── frontend/
│   ├── .env                    ← Auto-écrit par deploy.ps1
│   ├── .env.example
│   ├── vite.config.js          ← global: 'globalThis' pour Cognito
│   └── src/
│       ├── App.jsx             ← ~1040 lignes, auth wrapper + Factory
│       ├── services/
│       │   ├── api.js          ← JWT injection sur tous les appels
│       │   ├── auth.js         ← Cognito service (login, signup, etc.)
│       │   ├── export.js       ← Export zip
│       │   └── files-template.js ← Base files WebContainer (incl. recharts)
│       └── components/
│           ├── AuthProvider.jsx ← React Context auth
│           ├── Login.jsx       ← Page login (dark theme)
│           ├── MatrixRain.jsx  ← Animation génération (chinese chars)
│           ├── FileUpload.jsx  ← Upload CSV/Excel
│           └── DbConnect.jsx   ← Connexion BDD
│
└── lambda-v2/
    ├── deploy.ps1              ← Auto .env + user creation prompt
    ├── template.yaml           ← SAM (Cognito + Lambdas + API GW)
    ├── shared/
    │   └── auth.mjs            ← JWT verification (copié dans chaque fn)
    ├── generate/
    │   ├── index.mjs           ← Agent IA (system prompt + generate + vision)
    │   └── auth.mjs
    ├── publish/
    │   ├── index.mjs
    │   └── auth.mjs
    ├── rules/
    │   └── index.mjs
    └── db/
        └── index.mjs           ← DB proxy (PostgreSQL/MySQL)
```

## Flow de Génération (Agent IA)

1. **Génération** — Claude génère le code React depuis le prompt + données
2. **Compilation** — WebContainer : npm install → npm run dev → attend server-ready
3. **Review qualité** — Claude review et améliore le code (labels, formatage, layout)
4. **Analyse visuelle** — Screenshot via html2canvas → Claude analyse et corrige le rendu
5. **Finalisation** — Affichage plein écran avec barre de feedback

Si erreur de compilation → auto-fix (max 3 tentatives).
Si review/vision casse le code → version précédente gardée.

## Design System (Dashboards Générés)

**Palette Navy/Cyan Premium :**

- Backgrounds : #0B1120 (base), #111827 (cards), #1A2332 (hover)
- Accents : #06B6D4 (cyan), #EC4899 (magenta), #8B5CF6 (violet), #F59E0B (ambre)
- Status : #10B981 (positif), #EF4444 (négatif)

**Composants obligatoires :**

- KPIs riches (sparklines, CY vs PY, badges variation)
- Drawer/hamburger (pas de sidebar fixe)
- Graphiques Recharts avec labels, tooltips, légendes
- PieChart avec Cell colors
- Points clés en bas de la page Synopsis
- Formatage auto (fmt, fmtCur, fmtPct)

## Cognito Auth

- User Pool : eu-north-1_ydkpTfIdO
- Client ID : 76kjpidgqhtba39kjdj9epftj0
- Free tier : 50,000 MAU
- Flow : email/password → JWT → Authorization header → Lambda vérifie JWKS

## Commandes

```powershell
# Deploy backend
cd lambda-v2
.\deploy.ps1

# Run frontend
cd frontend
npm install amazon-cognito-identity-js
npm run dev

# Créer un user Cognito
aws cognito-idp admin-create-user --user-pool-id eu-north-1_ydkpTfIdO --username email@example.com --temporary-password TempPass1! --user-attributes Name=email,Value=email@example.com --region eu-north-1

# Voir les logs Lambda
aws logs tail /aws/lambda/app-factory-generate --region eu-north-1 --since 5m --format short
```

## Coûts Estimés

| Service     | Coût                       |
| ----------- | -------------------------- |
| Lambda      | ~$5/mois                   |
| S3          | ~$1/mois                   |
| Cognito     | $0 (free tier < 50K users) |
| API Gateway | ~$1/mois                   |
| Claude API  | Selon usage                |
| **Total**   | **~$10-20/mois**           |

## Notes Dev

- `vite.config.js` doit avoir `global: 'globalThis'` pour amazon-cognito-identity-js
- `files-template.js` doit inclure `recharts: "^2.12.0"` dans dependencies
- Les CORS sont gérés par template.yaml (Function URL config) — PAS dans le code Lambda
- `auth.mjs` doit être copié dans chaque dossier Lambda (SAM build isolation)
- Imports dans les Lambdas : `./auth.mjs` (pas `../shared/auth.mjs`)
- GenerateFunction timeout : 600s (phase vision peut prendre 100s+)
