# 🧠 CLAUDE.md — App Factory (AI App Builder)

## 📋 Résumé du Projet

**Nom**: `ai_app_builder` / **App Factory**

**Objectif**: SaaS permettant aux clients de générer des applications React via prompt. L'app générée tourne directement dans le browser du client (WebContainers).

**Architecture**: WebContainers (browser) + AWS Lambda (backend) + S3 (storage)

**Design System**: SK Design System (vert #00765F, fond sombre #0F0F12)

---

## ✅ État Actuel du Projet

### Complété

- [x] Frontend React + Vite + Tailwind
- [x] WebContainer intégration
- [x] Génération d'apps React via prompt (Claude API)
- [x] Interface App Factory (3 états)
- [x] Upload fichiers Excel/CSV avec injection de données
- [x] Export .zip avec Dockerfile
- [x] Publication S3
- [x] SK Design System intégré
- [x] Écran de génération avec progress
- [x] Backend déployé sur AWS Lambda (SAM)
- [x] API Gateway + Function URLs
- [x] Rules stockées sur S3
- [x] Feedback loop (refine apps via prompt)
- [x] Data injection (Excel/CSV → placeholder → vraies données)
- [x] Connexion PostgreSQL (DB proxy via Lambda)

### En cours / À faire

- [ ] Tester connexion PostgreSQL end-to-end
- [ ] Auto-fix erreurs de build (Terminal MCP)
- [ ] Multi-pages (routing React)
- [ ] Améliorer qualité du code généré (prompt engineering)
- [ ] Authentification users
- [ ] Sauvegarde des apps (DynamoDB)
- [ ] Templates marketplace
- [ ] Support MySQL

---

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER DU CLIENT                                                          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         WEBCONTAINER                                   │ │
│  │                   (Node.js dans le browser)                           │ │
│  │                                                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │ Filesystem  │  │    Vite     │  │ Hot Reload  │  │   Preview   │  │ │
│  │  │   isolé     │  │   Build     │  │  instantané │  │    live     │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│         ▲                                                                   │
│         │ Code généré par Claude                                           │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────────┐
│  AWS LAMBDA BACKEND (SAM deployed)                                          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  GenerateFunction │  │  DbFunction      │  │  RulesFunction   │         │
│  │  (Function URL)   │  │  (Function URL)  │  │  (API Gateway)   │         │
│  │  120s timeout     │  │  30s timeout     │  │  30s timeout     │         │
│  │  512MB            │  │  256MB           │  │  256MB           │         │
│  │                   │  │                  │  │                   │         │
│  │  Claude API call  │  │  /db/schema      │  │  GET /rules      │         │
│  │  + rules from S3  │  │  /db/query       │  │  (reads S3)      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                                │
│  │  PublishFunction  │  │  S3 Bucket       │                                │
│  │  (API Gateway)    │  │  ai-app-builder- │                                │
│  │  60s timeout      │  │  sk-2026         │                                │
│  │  POST /publish    │  │  - rules/        │                                │
│  │                   │  │  - published apps │                                │
│  └──────────────────┘  └──────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet

```
ai_agent_dashboard_builder/
│
├── 📁 frontend/
│   ├── src/
│   │   ├── App.jsx                    # App principale (3 états + feedback loop)
│   │   ├── components/
│   │   │   ├── FileUpload.jsx         # Upload Excel/CSV (sample + fullData)
│   │   │   └── DbConnect.jsx          # Connexion PostgreSQL
│   │   ├── services/
│   │   │   ├── api.js                 # Appels Lambda (generate, publish, db)
│   │   │   ├── files-template.js      # Template React de base
│   │   │   └── export.js              # Export .zip
│   │   └── index.css                  # Tailwind
│   ├── .env                           # VITE_API_URL, VITE_GENERATE_URL, VITE_DB_PROXY_URL
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── 📁 lambda-v2/
│   ├── template.yaml                  # SAM CloudFormation template
│   ├── deploy.ps1                     # PowerShell deployment script
│   ├── generate/
│   │   ├── index.mjs                  # Claude API + rules + data/DB context
│   │   └── package.json               # @anthropic-ai/sdk, @aws-sdk/client-s3
│   ├── rules/
│   │   ├── index.mjs                  # S3 rules reader
│   │   └── package.json
│   ├── publish/
│   │   ├── index.mjs                  # S3 file uploader
│   │   └── package.json
│   └── db/
│       ├── index.mjs                  # PostgreSQL proxy (schema + query)
│       └── package.json               # pg driver
│
├── 📁 backend/                        # (legacy - remplacé par lambda-v2)
│   ├── server.mjs
│   └── rules/
│
├── .gitignore
├── CLAUDE.md                          # Ce fichier
└── README.md
```

---

## ☁️ AWS Configuration

### Stack: `app-factory`

### Region: `eu-north-1`

### Lambda Functions

| Function             | Trigger                    | Timeout | Memory | Rôle                         |
| -------------------- | -------------------------- | ------- | ------ | ---------------------------- |
| app-factory-generate | Function URL               | 120s    | 512MB  | Claude API + génération code |
| app-factory-db       | Function URL + API Gateway | 30s     | 256MB  | PostgreSQL proxy             |
| app-factory-rules    | API Gateway                | 30s     | 256MB  | Lecture rules S3             |
| app-factory-publish  | API Gateway                | 60s     | 512MB  | Publication S3               |

### URLs

```
API Gateway:    https://nj5zk7fxm7.execute-api.eu-north-1.amazonaws.com/prod
Generate URL:   https://th76hhkjxx4ikum5bq2kz6k3qu0eptvx.lambda-url.eu-north-1.on.aws/
DB Proxy URL:   (à récupérer après deploy de DbFunction)
```

### S3 Buckets

```
ai-app-builder-sk-2026       → rules/ + published apps
app-factory-deploy-artifacts  → SAM deployment artifacts
```

### IAM User: `jeremynwa`

Policies: AWSCloudFormationFullAccess, AWSLambda_FullAccess, AmazonAPIGatewayAdministrator, IAMFullAccess, AmazonS3FullAccess

---

## 🔧 Frontend .env

```
VITE_API_URL=https://nj5zk7fxm7.execute-api.eu-north-1.amazonaws.com/prod
VITE_GENERATE_URL=https://th76hhkjxx4ikum5bq2kz6k3qu0eptvx.lambda-url.eu-north-1.on.aws/
VITE_DB_PROXY_URL=https://xxxxx.lambda-url.eu-north-1.on.aws/
```

⚠️ Le fichier .env DOIT être encodé en UTF-8 (pas UTF-16). Créer via VS Code, pas PowerShell.

---

## 🔄 Flow Génération

### Mode Excel/CSV (données injectées)

```
1. User uploade un fichier Excel/CSV
   → FileUpload parse avec xlsx
   → Garde fullData (toutes les lignes) + sample (30 lignes)

2. User écrit son prompt + clique "Générer"
   → api.js envoie sample (30 lignes) à la Lambda (pas fullData)
   → Lambda envoie sample + schema à Claude
   → Claude génère du code avec placeholder: DATA = "__INJECT_DATA__"

3. Frontend reçoit le code
   → Remplace "__INJECT_DATA__" par JSON.stringify(fullData)
   → Monte dans WebContainer
   → Dashboard affiche TOUTES les données
```

### Mode PostgreSQL (proxy queries)

```
1. User entre ses credentials PostgreSQL
   → DbConnect appelle /db/schema
   → Lambda se connecte, lit le schema + samples
   → Retourne la structure à l'interface

2. User écrit son prompt + clique "Générer"
   → Lambda envoie schema + samples à Claude
   → Claude génère du code avec queryDb() pour chaque donnée
   → Chaque KPI/graphique fait une requête SQL via le proxy

3. Frontend reçoit le code
   → Remplace "__DB_PROXY_URL__" et "__DB_CREDENTIALS__" par les vrais
   → Monte dans WebContainer
   → Dashboard query la vraie DB en temps réel
```

### Mode Refine (feedback loop)

```
1. App générée affichée en plein écran
   → Barre en bas: Factory | Exporter | Publier | [input feedback] | Envoyer

2. User tape une modification
   → Envoie le code actuel (sans data.js/db.js) + instruction à Claude
   → Claude retourne le code modifié (tous les fichiers)
   → Frontend re-injecte les données et remonte dans WebContainer
```

---

## 🎨 SK Design System

### Couleurs

```javascript
colors: {
  // Surfaces
  'surface-base': '#0F0F12',
  'surface-raised': '#16161A',
  'surface-overlay': '#1C1C21',
  'surface-subtle': '#232329',
  'surface-border': '#2E2E36',

  // Texte
  'text-primary': '#FFFFFF',
  'text-secondary': '#A1A1AA',
  'text-tertiary': '#71717A',
  'text-muted': '#52525B',

  // Accent principal (vert SK)
  'sk-green': '#00765F',
  'sk-green-hover': '#00A382',

  // Status
  'status-success': '#34D399',
  'status-warning': '#F59E0B',
  'status-error': '#EF4444',
}
```

### Règles Design

- JAMAIS d'emojis dans les apps générées
- JAMAIS d'icônes unicode
- Hover states sur tous les éléments cliquables
- Transitions: `all 0.2s ease`
- Border radius: 8px (boutons), 16px (cards)

---

## 🚀 Commandes

### Déployer le backend

```powershell
cd lambda-v2
sam build
.\deploy.ps1
```

### Lancer le frontend

```powershell
cd frontend
npm run dev
# → http://localhost:5173
```

### Voir les logs Lambda

```powershell
sam logs --stack-name app-factory --region eu-north-1 --name GenerateFunction
sam logs --stack-name app-factory --region eu-north-1 --name DbFunction
```

### Tester les endpoints

```powershell
# Generate
Invoke-RestMethod -Uri "https://th76hhkjxx4ikum5bq2kz6k3qu0eptvx.lambda-url.eu-north-1.on.aws/" -Method POST -ContentType "application/json" -Body '{"prompt":"test","useRules":false}'

# Rules
Invoke-RestMethod -Uri "https://nj5zk7fxm7.execute-api.eu-north-1.amazonaws.com/prod/rules"
```

---

## ⚠️ Problèmes Connus / Notes

- **Function URL vs API Gateway**: Generate et DB utilisent des Function URLs (pas de limite 30s). Rules et Publish utilisent API Gateway.
- **CORS**: Les Function URLs gèrent le CORS via template.yaml. NE PAS ajouter de headers CORS dans le code Lambda pour les Function URLs (double header = erreur).
- **esbuild**: Doit être installé globalement (`npm install -g esbuild`) pour `sam build`.
- **max_tokens**: Generate utilise 16384 tokens (le refine mode a besoin de plus de place).
- **PowerShell .env**: Toujours créer les .env via VS Code (UTF-8), jamais via PowerShell (UTF-16 avec BOM).
- **Refine mode**: Ne renvoie pas data.js ni db.js dans existingFiles pour éviter d'exploser le contexte.

---

## 📅 Roadmap

| Priorité | Tâche                        | Status |
| -------- | ---------------------------- | ------ |
| 1        | Tester PostgreSQL end-to-end | ⏳     |
| 2        | Auto-fix erreurs de build    | ⏳     |
| 3        | Multi-pages (routing)        | ⏳     |
| 4        | Améliorer prompt engineering | ⏳     |
| 5        | Auth + Users                 | ⏳     |
| 6        | Sauvegarde apps (DynamoDB)   | ⏳     |
| 7        | Support MySQL                | ⏳     |
| 8        | Templates marketplace        | ⏳     |

---

## 🛠️ Technologies

| Composant    | Techno                         |
| ------------ | ------------------------------ |
| Frontend     | React + Vite + Tailwind        |
| WebContainer | @webcontainer/api (StackBlitz) |
| Backend      | AWS Lambda (SAM)               |
| Storage      | S3                             |
| IA           | Claude API (claude-sonnet-4)   |
| DB Proxy     | PostgreSQL via pg driver       |
| Export       | JSZip                          |
| Excel/CSV    | xlsx                           |
| IaC          | SAM (CloudFormation)           |
| Deploy       | esbuild + SAM CLI              |
