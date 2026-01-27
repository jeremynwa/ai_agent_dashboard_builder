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
│  │  • Reçoit prompt du client                                          │   │
│  │  • Lit règles/templates depuis S3                                   │   │
│  │  • Appelle Claude API                                               │   │
│  │  • Retourne le code généré au client                               │   │
│  │  • Vérifie les erreurs de build (via logs)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│         ┌────────────────┼────────────────┐                                │
│         ▼                ▼                ▼                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │     S3      │  │ Claude API  │  │ RDS/DynamoDB│                        │
│  │             │  │             │  │ (optionnel) │                        │
│  │ • rules/    │  │ Génère le   │  │             │                        │
│  │ • templates/│  │ code React  │  │ • Users     │                        │
│  │             │  │             │  │ • Apps      │                        │
│  │             │  │             │  │   sauvées   │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 MCP Servers

### Stack MCP selon Gemini (optimisée)

| MCP | Rôle | Pourquoi |
|-----|------|----------|
| **Filesystem MCP** | Code Writer | Écrire les fichiers React générés |
| **SQLite MCP** | Schema Architect | Créer tables pour l'app (données user) |
| **Terminal MCP** | Error Catcher | Vérifier build, auto-corriger erreurs |

### MCP par source

| MCP | Source | Usage |
|-----|--------|-------|
| Filesystem MCP | Anthropic | Écrire code dans WebContainer |
| SQLite MCP | Anthropic | DB locale par user |
| PostgreSQL MCP | Anthropic/AWS | DB persistante (si sauvegarde) |
| GitHub MCP | Anthropic | Versionner les apps |

### Ce qu'on enlève

| MCP | Pourquoi on enlève |
|-----|-------------------|
| ~~Puppeteer MCP~~ | L'utilisateur EST le testeur |
| ~~ECS MCP~~ | Pas besoin, app tourne dans browser |
| ~~CDK MCP~~ | Infra minimale, pas besoin |

---

## 🔄 Flow Complet

```
1. Client ouvre ton-app.com
   → Frontend charge + WebContainer s'initialise

2. Client upload son CSV (optionnel)
   → Données chargées dans SQLite du WebContainer

3. Client écrit: "Ajouter un module CRM avec table clients"

4. Frontend → Lambda (AWS):
   → Lambda lit rules/templates depuis S3
   → Lambda appelle Claude API

5. Claude génère:
   → CustomerList.tsx
   → api/customers.ts
   → SQL: CREATE TABLE customers...

6. Lambda retourne le code au Frontend

7. Frontend → WebContainer:
   → Filesystem MCP écrit les fichiers
   → SQLite MCP crée la table
   → Vite build + hot reload

8. Terminal MCP vérifie le build:
   → ❌ Erreur? Claude corrige automatiquement
   → ✅ Success? App se rafraîchit

9. Client voit le nouveau module CRM apparaître live! 🎉
```

---

## 📊 Comparaison avec architecture précédente

| Aspect | Avant (100% AWS) | Maintenant (WebContainers) |
|--------|------------------|----------------------------|
| Où tourne l'app | Serveur AWS | Browser du client |
| Filesystem | S3 | WebContainer (local) |
| DB de l'app | RDS PostgreSQL | SQLite (WebContainer) |
| Build/Hot reload | Serveur | Browser |
| Isolation users | À gérer côté serveur | Automatique (chaque browser) |
| Coût compute | ~$20-30/mois | ~$5/mois |
| Latence | Requêtes réseau | Instantané |

---

## 💰 Coûts AWS (Minimal)

| Service | Usage | Coût |
|---------|-------|------|
| **S3** | Rules + templates | ~$1/mois |
| **Lambda** | API calls | ~$0-5/mois |
| **RDS** (optionnel) | Sauvegarde apps | ~$15/mois ou $0 |
| **CloudFront** | CDN frontend | ~$1/mois |
| **Total** | | **~$5-20/mois** |

---

## 📦 Structure S3 (Minimal)

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
└── saved-apps/                 # Apps sauvegardées (optionnel)
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
│   │   │   └── FileExplorer.jsx     # Montre les fichiers générés
│   │   ├── services/
│   │   │   ├── api.js               # Appels Lambda
│   │   │   └── webcontainer.js      # Init WebContainer
│   │   └── webcontainer/
│   │       └── template/            # Template de base pour WebContainer
│   └── package.json
│
├── 📁 backend/
│   ├── lambda/
│   │   └── generate/
│   │       ├── handler.py           # Lambda function
│   │       └── requirements.txt
│   ├── services/
│   │   ├── claude_service.py
│   │   └── s3_service.py
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

| Composant | Techno |
|-----------|--------|
| Frontend | React + Vite |
| WebContainer | @webcontainer/api (StackBlitz) |
| Backend | AWS Lambda (Python) |
| Storage | S3 |
| IA | Claude API |
| DB locale | SQLite (dans WebContainer) |
| DB persistante | DynamoDB ou RDS (optionnel) |

---

## 📅 Planning

| Phase | Durée | Focus |
|-------|-------|-------|
| **Phase 1** | 2-3 jours | Setup WebContainer + Frontend |
| **Phase 2** | 2-3 jours | Lambda + Claude API integration |
| **Phase 3** | 2-3 jours | Rules/Templates + Flow complet |
| **Phase 4** | 1-2 jours | Error handling + Polish |

---

## ⚠️ Limitations WebContainers

| Device/Browser | Support |
|----------------|---------|
| Chrome/Edge récent | ✅ |
| Firefox récent | ✅ |
| Safari | ⚠️ Limité |
| Mobile | ⚠️ Lourd |
| Vieux PC | ⚠️ Peut lagger |

**Audience cible**: Devs/consultants/business users sur desktop/laptop moderne.

---

## 🚀 Améliorations Futures

| Amélioration | Description |
|--------------|-------------|
| **Bedrock KB** | Recherche sémantique dans les règles |
| **GitHub sync** | Sauvegarder l'app dans un repo |
| **Templates marketplace** | Partager des templates |
| **Collaboration** | Plusieurs users sur une app |
| **Export** | Télécharger l'app en .zip |

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