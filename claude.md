# CLAUDE.md — App Factory (AI App Builder)

## Resume du Projet

**Nom**: `ai_app_builder` / **App Factory**

**Objectif**: SaaS permettant aux clients de generer des applications React via prompt. L'app generee tourne directement dans le browser du client (WebContainers). Un agent IA autonome genere, corrige, et ameliore le code jusqu'a obtenir un resultat professionnel.

**Architecture**: WebContainers (browser) + AWS Lambda (backend) + Agent IA (boucle autonome)

**Design System**: SK Design System (vert #00765F, fond sombre #0F0F12)

---

## Etat Actuel du Projet

### Complete

- [x] Frontend React + Vite + Tailwind
- [x] WebContainer integration
- [x] Generation d'apps React via prompt (Claude API)
- [x] Interface App Factory (3 etats)
- [x] Upload fichiers Excel/CSV avec injection de donnees
- [x] Export .zip avec Dockerfile
- [x] Publication S3
- [x] SK Design System integre
- [x] Ecran de generation avec progress
- [x] Backend deploye sur AWS Lambda (SAM)
- [x] API Gateway + Function URLs
- [x] Rules stockees sur S3
- [x] Feedback loop (refine apps via prompt)
- [x] Data injection (Excel/CSV -> placeholder -> vraies donnees)
- [x] Connexion PostgreSQL (DB proxy via Lambda)

### En cours

- [ ] Agent IA Phase 1: Auto-fix erreurs de build
- [ ] Agent IA Phase 2: Review qualite du code
- [ ] Agent IA Phase 3: Vision (screenshot + analyse visuelle)

### A faire

- [ ] Tester connexion PostgreSQL end-to-end
- [ ] Multi-pages (routing React)
- [ ] Authentification users
- [ ] Sauvegarde des apps (DynamoDB)
- [ ] Support MySQL
- [ ] Templates marketplace

---

## Agent IA — Architecture

L'agent IA est le coeur de la plateforme. Contrairement a un simple generateur (1 prompt -> 1 reponse), l'agent fonctionne en boucle autonome jusqu'a obtenir un resultat satisfaisant.

### Principe

```
Prompt utilisateur
    |
    v
Claude genere V1
    |
    v
WebContainer compile
    | erreur ?
    v
Phase 1: Auto-fix (max 3 tentatives)
    - Capture l'erreur stderr
    - Renvoie code + erreur a Claude
    - Claude corrige, recompile
    |
    v compile OK
Phase 2: Review qualite
    - Envoie le code a Claude avec prompt de review
    - Claude ameliore labels, espacement, legendes, unites
    - Recompile le code ameliore
    |
    v
Phase 3: Vision
    - Capture screenshot du rendu (html2canvas)
    - Envoie screenshot + code a Claude (API vision)
    - Claude analyse visuellement (layout, chevauchements, lisibilite)
    - Corrige si necessaire, recompile
    |
    v
Affiche a l'utilisateur
```

### Comparaison

|                  | Generateur (avant)      | Agent IA (maintenant)       |
| ---------------- | ----------------------- | --------------------------- |
| Comportement     | 1 prompt -> 1 reponse   | Boucle autonome             |
| Erreurs          | Ecran blanc, fix manuel | Detection + correction auto |
| Qualite          | Variable                | Review systematique         |
| Visuel           | Pas de verification     | Screenshot + analyse vision |
| Appels Claude    | 1 par generation        | 3-4 par generation          |
| Temps            | ~40 secondes            | ~2 minutes                  |
| Taux de reussite | ~70%                    | ~95%                        |

### Implementation

- **Pas de MCP** : l'orchestration se fait dans App.jsx via des appels HTTP classiques
- **Claude = cerveau** : decide quoi corriger, comment ameliorer
- **App.jsx = corps** : execute les actions (compiler, capturer erreurs, screenshot)
- **Lambda = outils** : genere le code, proxy DB

---

## Architecture Technique

```
BROWSER DU CLIENT
+-------------------------------------------------------------------+
|  WEBCONTAINER (Node.js dans le browser)                           |
|  +-------------+ +-----------+ +------------+ +-----------+      |
|  | Filesystem  | |   Vite    | | Hot Reload | |  Preview  |      |
|  |   isole     | |   Build   | | instantane | |   live    |      |
|  +-------------+ +-----------+ +------------+ +-----------+      |
+-------------------------------------------------------------------+
         ^
         | Code genere + corrige par l'Agent IA
         |
AWS LAMBDA BACKEND (SAM deployed)
+-------------------------------------------------------------------+
|  +------------------+ +------------------+ +------------------+   |
|  | GenerateFunction | | DbFunction       | | RulesFunction    |   |
|  | (Function URL)   | | (Function URL)   | | (API Gateway)    |   |
|  | 120s timeout     | | 30s timeout      | | 30s timeout      |   |
|  | 512MB            | | 256MB            | | 256MB            |   |
|  |                  | |                  | |                  |   |
|  | - Generation     | | - /db/schema     | | - GET /rules     |   |
|  | - Auto-fix       | | - /db/query      | | - (reads S3)     |   |
|  | - Review qualite | | - SELECT only    | |                  |   |
|  | - Vision analyse | |                  | |                  |   |
|  +------------------+ +------------------+ +------------------+   |
|                                                                   |
|  +------------------+ +------------------+                        |
|  | PublishFunction  | | S3 Bucket        |                        |
|  | (API Gateway)    | | ai-app-builder-  |                        |
|  | 60s timeout      | | sk-2026          |                        |
|  | POST /publish    | | - rules/         |                        |
|  |                  | | - published apps |                        |
|  +------------------+ +------------------+                        |
+-------------------------------------------------------------------+
```

---

## Structure du Projet

```
ai_agent_dashboard_builder/
|
|-- frontend/
|   |-- src/
|   |   |-- App.jsx                    # Agent IA + 3 etats + feedback loop
|   |   |-- components/
|   |   |   |-- FileUpload.jsx         # Upload Excel/CSV (sample + fullData)
|   |   |   |-- DbConnect.jsx          # Connexion PostgreSQL
|   |   |-- services/
|   |   |   |-- api.js                 # Appels Lambda (generate, publish, db)
|   |   |   |-- files-template.js      # Template React de base
|   |   |   |-- export.js              # Export .zip
|   |   |-- index.css                  # Tailwind
|   |-- .env                           # VITE_API_URL, VITE_GENERATE_URL, VITE_DB_PROXY_URL
|   |-- vite.config.js
|   |-- tailwind.config.js
|   |-- package.json
|
|-- lambda-v2/
|   |-- template.yaml                  # SAM CloudFormation template
|   |-- deploy.ps1                     # PowerShell deployment script
|   |-- generate/
|   |   |-- index.mjs                  # Claude API + rules + data/DB + auto-fix + review + vision
|   |   |-- package.json
|   |-- rules/
|   |   |-- index.mjs
|   |   |-- package.json
|   |-- publish/
|   |   |-- index.mjs
|   |   |-- package.json
|   |-- db/
|       |-- index.mjs                  # PostgreSQL proxy (schema + query)
|       |-- package.json
|
|-- .gitignore
|-- CLAUDE.md                          # Ce fichier
|-- README.md
```

---

## AWS Configuration

### Stack: `app-factory`

### Region: `eu-north-1`

### Lambda Functions

| Function             | Trigger                    | Timeout | Memory | Role                                             |
| -------------------- | -------------------------- | ------- | ------ | ------------------------------------------------ |
| app-factory-generate | Function URL               | 120s    | 512MB  | Claude API, generation, auto-fix, review, vision |
| app-factory-db       | Function URL + API Gateway | 30s     | 256MB  | PostgreSQL proxy (SELECT only)                   |
| app-factory-rules    | API Gateway                | 30s     | 256MB  | Lecture rules S3                                 |
| app-factory-publish  | API Gateway                | 60s     | 512MB  | Publication S3                                   |

### URLs

```
API Gateway:    https://nj5zk7fxm7.execute-api.eu-north-1.amazonaws.com/prod
Generate URL:   https://th76hhkjxx4ikum5bq2kz6k3qu0eptvx.lambda-url.eu-north-1.on.aws/
DB Proxy URL:   (a recuperer apres deploy de DbFunction)
```

### S3 Buckets

```
ai-app-builder-sk-2026       -> rules/ + published apps
app-factory-deploy-artifacts  -> SAM deployment artifacts
```

---

## Frontend .env

```
VITE_API_URL=https://nj5zk7fxm7.execute-api.eu-north-1.amazonaws.com/prod
VITE_GENERATE_URL=https://th76hhkjxx4ikum5bq2kz6k3qu0eptvx.lambda-url.eu-north-1.on.aws/
VITE_DB_PROXY_URL=https://xxxxx.lambda-url.eu-north-1.on.aws/
```

Le fichier .env DOIT etre encode en UTF-8 (pas UTF-16). Creer via VS Code, pas PowerShell.

---

## Flux de Donnees

### Mode Excel/CSV (donnees injectees)

```
1. User uploade fichier -> FileUpload parse avec xlsx
   -> fullData (toutes les lignes) + sample (30 lignes)
2. api.js envoie sample a la Lambda (pas fullData)
3. Claude genere code avec placeholder: DATA = "__INJECT_DATA__"
4. Frontend remplace placeholder par JSON.stringify(fullData)
5. Agent IA verifie compilation + qualite + visuel
6. Dashboard affiche TOUTES les donnees
```

### Mode PostgreSQL (proxy queries)

```
1. User entre credentials -> /db/schema lit la structure
2. Claude genere code avec queryDb() pour chaque donnee
3. Frontend remplace "__DB_PROXY_URL__" et "__DB_CREDENTIALS__"
4. Agent IA verifie compilation + qualite + visuel
5. Dashboard query la vraie DB en temps reel
```

### Mode Refine (feedback loop)

```
1. Barre en bas: [input feedback] | Envoyer
2. Envoie code actuel (sans data.js/db.js) + instruction a Claude
3. Claude retourne code modifie
4. Agent IA re-verifie compilation + qualite
```

---

## Agent IA — Details Techniques

### Phase 1: Auto-fix erreurs

Source: stderr du WebContainer (npm run dev)
Detection: ecoute installProcess.exit code + stderr stream
Action: envoie code + erreur a Claude via generateApp() avec existingFiles
Limite: max 3 tentatives
Fallback: affiche erreur a l'utilisateur

### Phase 2: Review qualite

Trigger: compilation reussie
Prompt: system prompt specifique "review et ameliore ce code"
Focus: labels, legendes, unites, espacement, couleurs, responsive
Action: 1 appel Claude supplementaire
Resultat: code ameliore, recompile

### Phase 3: Vision

Trigger: rendu visible dans l'iframe
Outil: html2canvas injecte dans l'app generee
Transport: window.parent.postMessage({ type: 'screenshot', data: base64 })
Envoi: image base64 + code a Claude (API Messages avec content type image)
Focus: layout, chevauchements, taille texte, zones vides, coherence visuelle
Limite: max 2 iterations visuelles

---

## Commandes

### Deployer le backend

```powershell
cd lambda-v2
sam build
.\deploy.ps1
```

### Lancer le frontend

```powershell
cd frontend
npm run dev
```

### Voir les logs Lambda

```powershell
sam logs --stack-name app-factory --region eu-north-1 --name GenerateFunction
sam logs --stack-name app-factory --region eu-north-1 --name DbFunction
```

---

## Problemes Connus / Notes

- Function URLs gerent le CORS via template.yaml. NE PAS ajouter de headers CORS dans le code Lambda.
- esbuild doit etre installe globalement (npm install -g esbuild) pour sam build.
- Generate utilise 16384 max_tokens (le refine mode a besoin de plus de place).
- PowerShell .env: toujours creer via VS Code (UTF-8), jamais via PowerShell (UTF-16 BOM).
- Refine mode: ne renvoie pas data.js ni db.js dans existingFiles.
- Agent IA: 3-4 appels Claude par generation = cout plus eleve mais qualite nettement superieure.

---

## Roadmap

| Priorite | Tache                              | Status          |
| -------- | ---------------------------------- | --------------- |
| P0       | Generation d'apps via prompt       | Fait            |
| P0       | Upload Excel/CSV + injection       | Fait            |
| P0       | Backend serverless (Lambda)        | Fait            |
| P0       | Feedback loop (iterations)         | Fait            |
| P1       | Connexion PostgreSQL               | Fait (a tester) |
| P1       | Agent IA Phase 1: Auto-fix erreurs | En cours        |
| P1       | Agent IA Phase 2: Review qualite   | En cours        |
| P1       | Agent IA Phase 3: Vision           | En cours        |
| P2       | Support MySQL                      | Planifie        |
| P2       | Authentification utilisateurs      | Planifie        |
| P3       | Sauvegarde apps (DynamoDB)         | Planifie        |
| P3       | Templates marketplace              | Planifie        |

---

## Technologies

| Composant    | Techno                          |
| ------------ | ------------------------------- |
| Frontend     | React + Vite + Tailwind         |
| WebContainer | @webcontainer/api (StackBlitz)  |
| Backend      | AWS Lambda (SAM)                |
| IA           | Claude Sonnet 4 (Anthropic)     |
| Vision       | html2canvas + Claude Vision API |
| Storage      | Amazon S3                       |
| DB Proxy     | PostgreSQL via pg driver        |
| IaC          | SAM / CloudFormation            |
| Export       | JSZip                           |
| Excel/CSV    | xlsx (SheetJS)                  |
