# 🧠 CLAUDE.md — AI App Builder

## 📋 Résumé du Projet

**Nom**: `ai_app_builder`

**Objectif**: SaaS permettant aux clients de générer des applications React via prompt. L'app générée tourne directement dans le browser du client (WebContainers).

**Architecture**: WebContainers (browser) + AWS minimal (backend)

---

## 🎯 Le Concept Core

```
┌─────────────────────────────────────────────────────────────────┐
│                       AI APP BUILDER                            │
│                                                                 │
│   Client écrit: "Ajouter un module CRM"                        │
│                          │                                      │
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                 BROWSER DU CLIENT                        │  │
│   │                                                          │  │
│   │   ┌──────────────────────────────────────────────────┐  │  │
│   │   │            WEBCONTAINER                          │  │  │
│   │   │                                                  │  │  │
│   │   │  • Node.js dans le browser                      │  │  │
│   │   │  • Filesystem isolé (ce user seulement)         │  │  │
│   │   │  • Build React (Vite)                           │  │  │
│   │   │  • Hot reload instantané                        │  │  │
│   │   │  • Preview live                                 │  │  │
│   │   │                                                  │  │  │
│   │   │  L'app générée TOURNE ICI                       │  │  │
│   │   └──────────────────────────────────────────────────┘  │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

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
│  │  │             │  │             │  │             │  │             │  │ │
│  │  │ /src/       │  │ Compile     │  │ Auto-refresh│  │ localhost   │  │ │
│  │  │ /api/       │  │ React       │  │ on change   │  │ :3000       │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  SQLite (DB locale par user)                                    │  │ │
│  │  │  • Données de l'app générée                                     │  │ │
│  │  │  • Isolé par user automatiquement                              │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│         ▲                                                                   │
│         │ Claude envoie le code généré                                     │
│         │                                                                   │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          │
┌─────────┴───────────────────────────────────────────────────────────────────┐
│  AWS (Minimal)                                                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda (Backend léger)                                             │   │
│  │                                                                      │   │
│  │  • POST /generate → appelle Claude → retourne code                  │   │
│  │  • POST /publish → build + upload S3 → retourne URL                 │   │
│  │  • GET /rules → lit S3                                              │   │
│  │  • GET /apps → liste apps publiées                                  │   │
│  │  • DELETE /apps/{id} → supprime app                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│         ┌────────────────┼────────────────┐                                │
│         ▼                ▼                ▼                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │     S3      │  │ Claude API  │  │  DynamoDB   │  │ CloudFront  │  │
│  │             │  │             │  │             │  │             │  │
│  │ • rules/    │  │ Génère le   │  │ • Users     │  │ CDN pour    │  │
│  │ • templates/│  │ code React  │  │ • Apps      │  │ apps        │  │
│  │ • apps/     │  │             │  │   publiées  │  │ publiées    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 UX Consultant (Interface)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🌐 AI App Builder - ton-app.com                                    [─][□][×]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │                             │  │                                     │  │
│  │  📝 PROMPT                  │  │  👁️ PREVIEW (WebContainer)          │  │
│  │                             │  │                                     │  │
│  │  ┌───────────────────────┐  │  │  ┌─────────────────────────────┐   │  │
│  │  │                       │  │  │  │                             │   │  │
│  │  │ "Créer un calculateur │  │  │  │   Calculateur d'Élasticité  │   │  │
│  │  │  d'élasticité des     │  │  │  │                             │   │  │
│  │  │  prix avec les champs │  │  │  │   Prix initial: [____]      │   │  │
│  │  │  prix initial, prix   │  │  │  │   Prix final:   [____]      │   │  │
│  │  │  final, quantité..."  │  │  │  │   Quantité:     [____]      │   │  │
│  │  │                       │  │  │  │                             │   │  │
│  │  └───────────────────────┘  │  │  │   [Calculer]                │   │  │
│  │                             │  │  │                             │   │  │
│  │  [🚀 Générer]               │  │  │   Résultat: -1.5 (élastique)│   │  │
│  │                             │  │  │                             │   │  │
│  └─────────────────────────────┘  │  └─────────────────────────────┘   │  │
│                                   │                                     │  │
│  ┌─────────────────────────────┐  │  L'app tourne EN LIVE ici          │  │
│  │                             │  │  (WebContainer = localhost:3000)   │  │
│  │  📁 FICHIERS GÉNÉRÉS        │  │                                     │  │
│  │                             │  └─────────────────────────────────────┘  │
│  │  📂 src/                    │                                           │
│  │    📄 App.jsx               │  ┌─────────────────────────────────────┐  │
│  │    📄 Calculator.jsx        │  │                                     │  │
│  │    📄 api/pricing.js        │  │  🖥️ TERMINAL                        │  │
│  │  📄 package.json            │  │                                     │  │
│  │                             │  │  $ vite                             │  │
│  │                             │  │  ✓ ready in 300ms                   │  │
│  │                             │  │  ➜ Local: http://localhost:3000    │  │
│  │                             │  │                                     │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                             │
│  [📤 Exporter .zip]  [🚀 Publier]  [💾 Sauvegarder]                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Consultant

| Étape | Action            | Résultat                                  |
| ----- | ----------------- | ----------------------------------------- |
| 1     | Ouvre ton-app.com | Interface vide                            |
| 2     | Écrit son prompt  | Zone de texte                             |
| 3     | Clique "Générer"  | Loading...                                |
| 4     | Attend ~5-10 sec  | Fichiers apparaissent                     |
| 5     |                   | Preview se charge                         |
| 6     | Voit l'app live   | Peut tester dans la preview               |
| 7     | Pas satisfait ?   | Nouveau prompt "Change le bouton en bleu" |
| 8     | Satisfait ?       | Clique "Publier" ou "Exporter"            |

---

## 📤 Options Output

### 2 façons de livrer l'app au client :

| Action               | Ce qui est donné    | Client peut modifier ? | Use case                   |
| -------------------- | ------------------- | ---------------------- | -------------------------- |
| **🚀 Publier**       | App compilée (URL)  | ❌ Non, juste utiliser | Client veut utiliser l'app |
| **📤 Exporter .zip** | Code source complet | ✅ Oui, tout le code   | Client veut le code        |

### Publier → App sur S3

```
/dist/                    ← Fichiers compilés
  index.html
  assets/
    main-abc123.js        ← Code minifié
    style-xyz789.css

→ Hébergé sur S3 + CloudFront
→ URL: apps.ton-saas.com/calculateur-abc123
```

### Exporter → Code source .zip (avec Docker)

```
export.zip
│
├── src/                      ← Code source lisible
│   ├── App.jsx
│   └── components/
│       ├── Calculator.jsx
│       └── PriceInput.jsx
├── package.json
├── vite.config.js
├── Dockerfile                ← Inclus par défaut
├── docker-compose.yml        ← Inclus par défaut
└── README.md                 ← Instructions

→ Téléchargé en .zip
→ Client peut run avec Docker OU Node.js
```

**README.md inclus :**

```markdown
# Mon App

## Option 1: Avec Docker (recommandé)

docker-compose up
→ Ouvre http://localhost:3000

## Option 2: Sans Docker

npm install
npm run dev
→ Ouvre http://localhost:3000
```

---

## 🚀 Flow Publication

```
CONSULTANT                    BACKEND (Lambda)              S3 + CloudFront
    │                              │                              │
    │  Clique "Publier"            │                              │
    ├─────────────────────────────►│                              │
    │                              │                              │
    │                              │  Récupère code WebContainer  │
    │                              │  npm run build               │
    │                              │                              │
    │                              │  Upload /dist vers S3        │
    │                              ├─────────────────────────────►│
    │                              │                              │
    │                              │  Configure CloudFront        │
    │                              ├─────────────────────────────►│
    │                              │                              │
    │  URL générée:                │                              │
    │  apps.ton-saas.com/abc123    │                              │
    │◄─────────────────────────────┤                              │
    │                              │                              │
    │                              │                              │
    │  ┌────────────────────────┐  │                              │
    │  │ ✅ App publiée!        │  │                              │
    │  │                        │  │                              │
    │  │ 🔗 apps.ton-saas.com/  │  │                              │
    │  │    calculateur-abc123  │  │                              │
    │  │                        │  │                              │
    │  │ [📋 Copier] [📧 Envoyer]│  │                              │
    │  └────────────────────────┘  │                              │
```

---

## 👁️ Ce que le CLIENT FINAL voit

Quand le client ouvre l'URL partagée :

```
┌─────────────────────────────────────────────────────────────────┐
│  🌐 https://apps.ton-saas.com/calculateur-abc123        [─][□][×]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│              Calculateur d'Élasticité des Prix                  │
│              ─────────────────────────────────                  │
│                                                                 │
│              Prix initial ($):  [________]                      │
│                                                                 │
│              Prix final ($):    [________]                      │
│                                                                 │
│              Quantité initiale: [________]                      │
│                                                                 │
│              Quantité finale:   [________]                      │
│                                                                 │
│                      [Calculer]                                 │
│                                                                 │
│              ┌─────────────────────────────┐                   │
│              │  Élasticité: -1.5           │                   │
│              │  → Demande ÉLASTIQUE        │                   │
│              └─────────────────────────────┘                   │
│                                                                 │
│                                    Powered by ConsultingCo      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Le client voit JUSTE l'app.** Pas d'éditeur, pas de code, pas de prompt.

---

## 💰 Coûts Apps Publiées (S3)

| Nombre d'apps | Coût ~mensuel |
| ------------- | ------------- |
| 10 apps       | ~$0.50        |
| 100 apps      | ~$2-3         |
| 1000 apps     | ~$10-15       |

Très peu cher = fichiers statiques.

---

## 🔧 MCP Servers

### Stack MCP selon Gemini (optimisée)

| MCP                | Rôle             | Pourquoi                               |
| ------------------ | ---------------- | -------------------------------------- |
| **Filesystem MCP** | Code Writer      | Écrire les fichiers React générés      |
| **SQLite MCP**     | Schema Architect | Créer tables pour l'app (données user) |
| **Terminal MCP**   | Error Catcher    | Vérifier build, auto-corriger erreurs  |

### MCP par source

| MCP            | Source        | Usage                          |
| -------------- | ------------- | ------------------------------ |
| Filesystem MCP | Anthropic     | Écrire code dans WebContainer  |
| SQLite MCP     | Anthropic     | DB locale par user             |
| PostgreSQL MCP | Anthropic/AWS | DB persistante (si sauvegarde) |
| GitHub MCP     | Anthropic     | Versionner les apps            |

### Ce qu'on enlève

| MCP               | Pourquoi on enlève                  |
| ----------------- | ----------------------------------- |
| ~~Puppeteer MCP~~ | L'utilisateur EST le testeur        |
| ~~ECS MCP~~       | Pas besoin, app tourne dans browser |
| ~~CDK MCP~~       | Infra minimale, pas besoin          |

---

## 🔄 Flow Complet

### Flow Génération (WebContainer)

```
1. Consultant ouvre ton-app.com
   → Frontend charge + WebContainer s'initialise

2. Consultant écrit: "Créer un calculateur d'élasticité"

3. Frontend → Lambda:
   → Lambda lit rules/templates depuis S3
   → Lambda appelle Claude API

4. Claude génère le code React

5. Lambda retourne le code au Frontend

6. Frontend → WebContainer:
   → Écrit les fichiers (App.jsx, etc.)
   → Vite build + hot reload

7. Terminal vérifie le build:
   → ❌ Erreur? Claude corrige automatiquement
   → ✅ Success? App se rafraîchit

8. Consultant voit l'app live dans la preview! 🎉
```

### Flow Publication (S3)

```
9. Consultant satisfait → clique "Publier"

10. Frontend → Lambda /publish:
    → Lambda récupère le code
    → npm run build
    → Upload /dist vers S3
    → Configure CloudFront

11. Lambda retourne URL → Consultant

12. Consultant partage URL avec son client

13. Client ouvre l'URL → voit l'app (sans éditeur)
```

### Flow Export

```
9. Consultant veut le code → clique "Exporter"

10. Frontend:
    → Zippe les fichiers du WebContainer
    → Ajoute Dockerfile + docker-compose.yml
    → Ajoute README.md

11. Téléchargement .zip côté client

12. Consultant envoie le .zip à son client

13. Client:
    → unzip export.zip
    → docker-compose up
    → App tourne sur localhost:3000
```

---

## 📊 Comparaison avec architecture précédente

| Aspect           | Avant (100% AWS)     | Maintenant (WebContainers)   |
| ---------------- | -------------------- | ---------------------------- |
| Où tourne l'app  | Serveur AWS          | Browser du client            |
| Filesystem       | S3                   | WebContainer (local)         |
| DB de l'app      | RDS PostgreSQL       | SQLite (WebContainer)        |
| Build/Hot reload | Serveur              | Browser                      |
| Isolation users  | À gérer côté serveur | Automatique (chaque browser) |
| Coût compute     | ~$20-30/mois         | ~$5/mois                     |
| Latence          | Requêtes réseau      | Instantané                   |

---

## 💰 Coûts AWS (Minimal)

| Service        | Usage                             | Coût            |
| -------------- | --------------------------------- | --------------- |
| **S3**         | Rules + templates + apps publiées | ~$1-5/mois      |
| **CloudFront** | CDN frontend + apps publiées      | ~$1-2/mois      |
| **Lambda**     | API calls                         | ~$0-5/mois      |
| **DynamoDB**   | Users + metadata apps             | ~$0-1/mois      |
| **Total**      |                                   | **~$5-15/mois** |

---

## 📦 Structure S3

```
s3://ai-app-builder/
│
├── rules/                      # Règles métier (JSON)
│   ├── pricing.json
│   ├── finance.json
│   └── design.json
│
├── templates/                  # Templates React de base
│   ├── calculator.jsx
│   ├── dashboard.jsx
│   └── crm.jsx
│
├── apps/                       # Apps publiées (build compilé)
│   ├── abc123/                 # app_id
│   │   ├── index.html
│   │   └── assets/
│   │       ├── main.js
│   │       └── style.css
│   └── xyz789/
│       └── ...
│
└── saved/                      # Apps sauvegardées (code source, optionnel)
    └── user_123/
        └── my-crm-app.zip
```

---

## 📁 Structure du Projet

```
ai_app_builder/
│
├── 📁 frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PromptInput.jsx
│   │   │   ├── AppPreview.jsx       # Affiche le WebContainer
│   │   │   ├── FileExplorer.jsx     # Montre les fichiers générés
│   │   │   ├── Terminal.jsx         # Logs/erreurs
│   │   │   └── PublishModal.jsx     # Popup publication
│   │   ├── services/
│   │   │   ├── api.js               # Appels Lambda
│   │   │   ├── webcontainer.js      # Init WebContainer
│   │   │   └── export.js            # Export .zip
│   │   ├── webcontainer/
│   │   │   └── template/            # Template de base pour WebContainer
│   │   └── export-templates/        # Fichiers ajoutés à l'export
│   │       ├── Dockerfile
│   │       ├── docker-compose.yml
│   │       └── README.md
│   └── package.json
│
├── 📁 backend/
│   ├── lambda/
│   │   ├── generate/
│   │   │   ├── handler.py           # POST /generate
│   │   │   └── requirements.txt
│   │   └── publish/
│   │       ├── handler.py           # POST /publish
│   │       └── requirements.txt
│   ├── services/
│   │   ├── claude_service.py
│   │   ├── s3_service.py
│   │   └── cloudfront_service.py
│   └── serverless.yml               # Déploiement Lambda
│
├── 📁 rules/                        # À uploader vers S3
│   ├── pricing.json
│   ├── finance.json
│   └── design.json
│
├── 📁 templates/                    # À uploader vers S3
│   ├── calculator.jsx
│   ├── dashboard.jsx
│   └── crm.jsx
│
├── CLAUDE.md
└── README.md
```

---

## 🛠️ Technologies

| Composant      | Techno                         |
| -------------- | ------------------------------ |
| Frontend       | React + Vite                   |
| WebContainer   | @webcontainer/api (StackBlitz) |
| Backend        | AWS Lambda (Python)            |
| Storage        | S3                             |
| IA             | Claude API                     |
| DB locale      | SQLite (dans WebContainer)     |
| DB persistante | DynamoDB ou RDS (optionnel)    |

---

## 📅 Planning

| Phase       | Durée     | Focus                             |
| ----------- | --------- | --------------------------------- |
| **Phase 1** | 2-3 jours | Setup WebContainer + Frontend     |
| **Phase 2** | 2-3 jours | Lambda + Claude API integration   |
| **Phase 3** | 2-3 jours | Rules/Templates + Flow génération |
| **Phase 4** | 2-3 jours | Publication S3 + Export .zip      |
| **Phase 5** | 1-2 jours | Polish + Deploy                   |

---

## 🛠️ Plan de Dev Détaillé

### Phase 1: Frontend + WebContainer (2-3 jours)

**Étape 1.1: Setup projet React**

```
- Créer projet Vite + React
- Installer dependencies (Tailwind, etc.)
- Structure des dossiers
```

**Étape 1.2: Intégrer WebContainer**

```
- npm install @webcontainer/api
- Initialiser WebContainer au chargement
- Créer template de base (package.json, vite.config.js)
```

⚠️ **DOCU À FOURNIR**: WebContainer API (peut avoir changé)

**Étape 1.3: Composants UI**

```
- PromptInput.jsx (zone de texte)
- AppPreview.jsx (iframe WebContainer)
- FileExplorer.jsx (voir fichiers générés)
- Terminal.jsx (voir logs/erreurs)
```

**Livrables Phase 1:**

- [ ] WebContainer qui boot dans le browser
- [ ] UI de base fonctionnelle
- [ ] Peut écrire/lire fichiers dans WebContainer

---

### Phase 2: Backend Lambda + Claude (2-3 jours)

**Étape 2.1: Setup Lambda**

```
- Créer fonction Lambda (Python)
- Configurer API Gateway
- Setup S3 bucket (rules, templates)
```

**Étape 2.2: Intégrer Claude API**

```
- Service claude_service.py
- System prompt pour génération React
- Gérer les réponses (code généré)
```

⚠️ **DOCU À FOURNIR**: Claude API (latest version, peut avoir changé)

**Étape 2.3: Endpoints**

```
- POST /generate → prompt + context → code
- GET /rules → liste des règles dispo
- GET /templates → liste des templates
```

**Livrables Phase 2:**

- [ ] Lambda déployée
- [ ] Claude génère du code React
- [ ] Frontend peut appeler le backend

---

### Phase 3: Rules + Templates + Flow (2-3 jours)

**Étape 3.1: Créer les règles JSON**

```
- pricing.json (élasticité, marge, markup)
- finance.json (ROI, NPV)
- design.json (couleurs, fonts)
```

**Étape 3.2: Créer les templates**

```
- calculator.jsx (template de base)
- dashboard.jsx
- crm.jsx
```

**Étape 3.3: Flow complet génération**

```
- User écrit prompt
- Backend lit règles + appelle Claude
- Claude génère code
- Frontend écrit dans WebContainer
- App se build + hot reload
```

**Étape 3.4: Error handling**

```
- Terminal MCP vérifie build
- Si erreur → Claude corrige
- Loop jusqu'à success
```

⚠️ **DOCU À FOURNIR**: MCP Servers (Filesystem, SQLite, Terminal) - très récent

**Livrables Phase 3:**

- [ ] Règles JSON uploadées dans S3
- [ ] Templates fonctionnels
- [ ] Flow génération end-to-end marche

---

### Phase 4: Publication + Export (2-3 jours)

**Étape 4.1: Exporter .zip (avec Docker)**

```
- Bouton "Exporter" dans UI
- Zipper les fichiers du WebContainer
- Ajouter Dockerfile + docker-compose.yml
- Ajouter README.md avec instructions
- Télécharger côté client
```

**Étape 4.2: Publier sur S3**

```
- Bouton "Publier" dans UI
- Backend récupère le code
- npm run build (compile React)
- Upload /dist vers S3
- Configure CloudFront
- Retourne URL
```

**Étape 4.3: Gestion des apps publiées**

```
- Stocker metadata dans DynamoDB (app_id, url, user_id, date)
- Page "Mes apps" pour voir les apps publiées
- Option supprimer une app
```

**Livrables Phase 4:**

- [ ] Export .zip fonctionne
- [ ] Publication S3 fonctionne
- [ ] URL partageable générée

---

### Phase 5: Polish + Deploy (1-2 jours)

**Étape 5.1: UX**

```
- Loading states
- Error messages clairs
- Responsive design
```

**Étape 5.2: Tests**

```
- Tester différents prompts
- Tester edge cases
- Fix bugs
```

**Étape 5.3: Deploy**

```
- Frontend sur S3 + CloudFront
- Lambda en prod
- Tester avec vrais users
```

**Livrables Phase 5:**

- [ ] App déployée et accessible
- [ ] Fonctionne sans bugs majeurs
- [ ] Prêt pour démo

---

## 📚 Documentation à Fournir (Ma connaissance date de ~6 mois)

Ces technologies sont récentes ou changent souvent. Fournis la doc à jour quand on travaille dessus :

| Technologie           | Pourquoi                          | Quand fournir |
| --------------------- | --------------------------------- | ------------- |
| **WebContainer API**  | API peut avoir changé             | Phase 1       |
| **Claude API**        | Nouveaux modèles, nouveaux params | Phase 2       |
| **MCP Servers**       | Très récent, évolue vite          | Phase 3       |
| **AWS Lambda Python** | Runtime versions                  | Phase 2       |
| **Vite config**       | Peut avoir changé                 | Phase 1       |

**Comment fournir la doc:**

1. Va sur le site officiel
2. Copie la section pertinente
3. Colle dans le chat

---

## 🚀 Comment Utiliser ce Document

### Pour commencer un nouveau chat :

```
"Voici mon CLAUDE.md avec l'architecture de mon projet AI App Builder.
[COLLE LE CLAUDE.MD]

Commence par [PHASE X, ÉTAPE Y]."
```

### Tips :

1. **Une étape à la fois** — ne demande pas tout d'un coup
2. **Teste avant de continuer** — vérifie que ça marche
3. **Fournis la doc** — quand demandé (voir section ci-dessus)
4. **Donne le contexte** — si erreur, colle l'erreur complète
5. **Itère** — si le code marche pas, dis pourquoi

### Exemple de prompts :

| Phase | Prompt exemple                                     |
| ----- | -------------------------------------------------- |
| 1.1   | "Setup le projet React avec Vite et Tailwind"      |
| 1.2   | "Intègre WebContainer, voici la doc: [DOC]"        |
| 2.1   | "Crée la Lambda Python avec API Gateway"           |
| 2.2   | "Intègre Claude API, voici la doc: [DOC]"          |
| 3.1   | "Crée le fichier pricing.json avec les formules"   |
| 4.1   | "Ajoute le bouton Exporter qui télécharge un .zip" |
| 4.2   | "Crée le endpoint /publish qui déploie sur S3"     |
| 5.1   | "Ajoute des loading states et error handling"      |

---

## ⚠️ Limitations WebContainers

| Device/Browser     | Support        |
| ------------------ | -------------- |
| Chrome/Edge récent | ✅             |
| Firefox récent     | ✅             |
| Safari             | ⚠️ Limité      |
| Mobile             | ⚠️ Lourd       |
| Vieux PC           | ⚠️ Peut lagger |

**Audience cible**: Devs/consultants/business users sur desktop/laptop moderne.

---

## 🚀 Améliorations Futures

| Amélioration              | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| **Bedrock KB**            | Recherche sémantique dans les règles                                              |
| **GitHub sync**           | Sauvegarder l'app dans un repo                                                    |
| **Templates marketplace** | Partager des templates                                                            |
| **Collaboration**         | Plusieurs users sur une app                                                       |
| **Export**                | Télécharger l'app en .zip                                                         |
| **html2canvas**           | Screenshots de l'app (alternative légère à Puppeteer, fonctionne dans le browser) |

---

## 🔗 Ressources

### WebContainers

- [WebContainer API](https://webcontainers.io/)
- [StackBlitz](https://stackblitz.com/)

### MCP (Anthropic)

- [Filesystem MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [SQLite MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite)
- [GitHub MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/github)

### AWS

- [AWS Lambda](https://aws.amazon.com/lambda/)
- [S3](https://aws.amazon.com/s3/)

---

## 📝 Notes

```
[Date] - Note
──────────────
- Architecture: WebContainers + AWS minimal
- App tourne dans le browser du client (pas sur serveur)
- Coûts réduits (~$5-20/mois vs ~$30-40)
- Puppeteer enlevé (user = testeur)
- SQLite pour DB locale par user
- Compte AWS ($100 crédits, expire 27 Jul 2026)
```
