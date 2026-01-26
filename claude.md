# 🧠 CLAUDE.md — AI Agent Dashboard Builder

## 📋 Résumé du Projet

**Nom**: `ai_agent_dashboard_builder`

**Objectif**: L'utilisateur upload sa BDD (CSV/Excel), écrit un prompt, et Claude génère **en live** des composants React pour créer un dashboard.

**Contexte**: POC pour impressionner Nicolas (nouveau partner). Démontrer l'expertise IA + Frontend.

---

## 🎯 Le Concept Core

```
User upload CSV + écrit "Montre-moi les ventes par région"
        ↓
Claude (via MCP) analyse le schema → query les données → génère composant React
        ↓
Composant .jsx écrit dans Docker (dossier du user)
        ↓
Frontend charge et affiche le dashboard
```

**Ce que NOUS codons**: Layout + Interface + Upload + Zone de rendu
**Ce que l'IA fait**: Génère des blocs React (charts, tables, KPIs)

---

## 🖼️ Interface Utilisateur (Mockup)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🎨 AI AGENT DASHBOARD BUILDER                             [Session: abc123] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  📁 UPLOAD YOUR DATA                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                                                                  │   │ │
│  │  │     Drag & drop your CSV/Excel file here                        │   │ │
│  │  │                  or click to browse                             │   │ │
│  │  │                                                                  │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │  ✅ sales_data.csv uploaded (1,245 rows × 8 columns)                   │ │
│  │  Tables détectées: sales, products, regions                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  💬 DESCRIBE YOUR DASHBOARD                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Montre-moi les top 10 produits par chiffre d'affaires et       │   │ │
│  │  │ l'évolution des ventes par mois en 2024                         │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                              [ 🚀 Générer Dashboard ]   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  📊 DASHBOARD OUTPUT                                                         │
│  ────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐     │
│  │ Top 10 Produits par CA        │  │ Évolution Ventes 2024          │     │
│  │ ┌────────────────────────────┐│  │                                │     │
│  │ │████████████████████ 45K   ││  │        ╭──────╮                │     │
│  │ │███████████████████  42K   ││  │       ╱        ╲    ╭──        │     │
│  │ │█████████████████    38K   ││  │      ╱          ╲  ╱           │     │
│  │ │███████████████      35K   ││  │ ────╱            ╲╱            │     │
│  │ │█████████████        31K   ││  │                                │     │
│  │ │███████████          28K   ││  │ J F M A M J J A S O N D       │     │
│  │ │█████████            24K   ││  │                                │     │
│  │ │███████              20K   ││  └────────────────────────────────┘     │
│  │ │█████                16K   ││                                         │
│  │ │███                  12K   ││  ┌────────────────────────────────┐     │
│  │ └────────────────────────────┘│  │ KPIs                          │     │
│  └────────────────────────────────┘  │  ┌──────┐ ┌──────┐ ┌──────┐ │     │
│                                       │  │ 1.2M │ │ +12% │ │ 847  │ │     │
│                                       │  │ CA   │ │ YoY  │ │ Cust │ │     │
│                                       │  └──────┘ └──────┘ └──────┘ │     │
│                                       └────────────────────────────────┘     │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────── │
│  [ 💾 Sauvegarder ] [ 🔄 Régénérer ] [ 📤 Exporter ]                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Diagrammes d'Architecture

### Architecture Globale (Simplifiée avec MCP Docker)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER ENVIRONMENT                             │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────┐ │
│  │             │      │             │      │                             │ │
│  │  FRONTEND   │◄────►│  BACKEND    │◄────►│      CLAUDE DESKTOP         │ │
│  │  (React)    │ HTTP │  (FastAPI)  │      │            +                │ │
│  │             │      │             │      │    MCP SERVERS (Docker)     │ │
│  │  - Upload   │      │  - /upload  │      │                             │ │
│  │  - Chat     │      │  - /generate│      │  ┌─────────┐ ┌───────────┐  │ │
│  │  - Render   │      │  - /session │      │  │ SQLite  │ │ Filesystem│  │ │
│  │             │      │             │      │  │  MCP    │ │    MCP    │  │ │
│  └──────▲──────┘      └──────┬──────┘      │  └────┬────┘ └─────┬─────┘  │ │
│         │                    │             │       │            │        │ │
│         │                    │             └───────┼────────────┼────────┘ │
│         │                    │                     │            │          │
│         │                    ▼                     ▼            ▼          │
│         │            ┌─────────────┐        ┌─────────────────────────┐   │
│         │            │   SQLite    │        │   /generated/           │   │
│         │            │   (temp)    │        │   session_123/          │   │
│         │            │             │        │   ├── SalesChart.jsx    │   │
│         │            │ /data/      │        │   └── TopProducts.jsx   │   │
│         │            │ session_123/│        │                         │   │
│         │            │ data.db     │        └────────────┬────────────┘   │
│         │            └─────────────┘                     │                 │
│         │                                                │                 │
│         └────────────────────────────────────────────────┘                 │
│                         (Frontend lit les composants)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Utilisateur

```
┌──────┐     ┌──────────┐     ┌─────────┐     ┌───────────────────────┐
│ USER │     │ FRONTEND │     │ BACKEND │     │ CLAUDE + MCP SERVERS  │
└──┬───┘     └────┬─────┘     └────┬────┘     └───────────┬───────────┘
   │              │                │                      │
   │ Upload CSV   │                │                      │
   │─────────────►│                │                      │
   │              │ POST /upload   │                      │
   │              │───────────────►│                      │
   │              │                │ Parse CSV            │
   │              │                │ Create SQLite        │
   │              │    session_id  │                      │
   │              │◄───────────────│                      │
   │              │                │                      │
   │   "Générer"  │                │                      │
   │─────────────►│                │                      │
   │              │ POST /generate │                      │
   │              │───────────────►│                      │
   │              │                │  Prompt + session_id │
   │              │                │─────────────────────►│
   │              │                │                      │
   │              │                │      SQLite MCP:     │
   │              │                │      - read schema   │
   │              │                │      - execute query │
   │              │                │                      │
   │              │                │      Filesystem MCP: │
   │              │                │      - write .jsx    │
   │              │                │                      │
   │              │                │◄─────────────────────│
   │              │   components   │                      │
   │              │◄───────────────│                      │
   │              │                │                      │
   │              │ Fetch .jsx files from /generated/     │
   │              │───────────────────────────────────────►
   │              │◄───────────────────────────────────────
   │  Dashboard!  │                │                      │
   │◄─────────────│                │                      │
```

### Structure des Sessions

```
/data/                          /generated/
├── session_abc123/             ├── session_abc123/
│   └── data.db (SQLite)        │   ├── SalesChart.jsx
│                               │   ├── TopProducts.jsx
├── session_xyz789/             │   └── KPICards.jsx
│   └── data.db                 │
│                               ├── session_xyz789/
└── session_user_jeremy/        │   └── RevenueChart.jsx
    └── data.db                 │
                                └── session_user_jeremy/
                                    ├── Dashboard1.jsx
                                    └── Dashboard2.jsx
```

---

## ✅ POC vs 🚀 PRODUCTION

| Feature              | POC                                      | Production                            |
| -------------------- | ---------------------------------------- | ------------------------------------- |
| **Upload**           | CSV uniquement                           | CSV, Excel, connexion BDD directe     |
| **Stockage BDD**     | SQLite temporaire                        | PostgreSQL ou connexion user          |
| **Sessions**         | ID aléatoire, temporaire                 | Auth + compte user persistant         |
| **Cache**            | En mémoire (dict Python)                 | Redis                                 |
| **Composants**       | Dossier par session, supprimé après      | Sauvegarde permanente, versioning     |
| **Sécurité**         | Validation basique du code               | Sandbox complet, rate limiting, audit |
| **MCP**              | Docker MCP Toolkit (SQLite + Filesystem) | Idem + monitoring                     |
| **Déploiement**      | Docker local                             | GCP Cloud Run + CDN                   |
| **Auth**             | ❌ Aucune                                | ✅ Login/OAuth                        |
| **Multi-user**       | ❌ 1 user à la fois                      | ✅ Concurrent users                   |
| **Données externes** | ❌ Non                                   | ✅ APIs météo, économie, etc.         |

---

## 🏗️ Architecture Technique

### Stack

| Composant | POC                | Production                     |
| --------- | ------------------ | ------------------------------ |
| Backend   | FastAPI            | FastAPI + Celery (async jobs)  |
| Frontend  | React + Vite       | React + Vite                   |
| Renderer  | react-live         | react-live + sandbox custom    |
| Charts    | recharts           | recharts                       |
| Style     | Tailwind           | Tailwind                       |
| IA        | Claude Desktop     | Claude API                     |
| MCP       | Docker MCP Toolkit | Docker MCP Toolkit + custom    |
| DB User   | SQLite temp        | PostgreSQL / connexion directe |
| Cache     | dict Python        | Redis                          |
| Infra     | Docker local       | Docker + GCP                   |

### Structure du Projet (Simplifiée)

```
ai_agent_dashboard_builder/
│
├── 📁 backend/
│   ├── main.py                 # FastAPI app
│   ├── routers/
│   │   ├── upload.py           # POST /upload (CSV → SQLite)
│   │   ├── generate.py         # POST /generate (prompt → Claude)
│   │   └── session.py          # GET /session/{id}
│   ├── services/
│   │   ├── claude_service.py   # Appels Claude Desktop
│   │   └── db_service.py       # Gestion SQLite temporaire
│   ├── Dockerfile
│   └── requirements.txt
│
├── 📁 frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadZone.jsx      # Drag & drop CSV
│   │   │   ├── PromptInput.jsx     # Zone de texte
│   │   │   ├── DashboardCanvas.jsx # Zone de rendu
│   │   │   └── DynamicRenderer.jsx # Exécute le code généré
│   │   └── services/
│   │       └── api.js
│   ├── Dockerfile
│   └── package.json
│
├── 📁 data/                    # Volume Docker - BDD temporaires
│   └── session_{id}/
│       └── data.db
│
├── 📁 generated/               # Volume Docker - Composants générés
│   └── session_{id}/
│       └── Component.jsx
│
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                   # Ce fichier
└── README.md
```

---

## 🔧 MCP Servers (Docker MCP Toolkit)

### Serveurs utilisés (pré-faits, pas de code custom!)

**1. SQLite MCP** (du catalogue Docker)

```
✅ Déjà fait - juste à configurer
- read_schema() → Retourne la structure des tables
- execute_query() → Exécute des SQL queries
- list_tables() → Liste les tables disponibles
```

**2. Filesystem MCP** (du catalogue Docker)

```
✅ Déjà fait - juste à configurer
- write_file() → Écrit les composants .jsx
- read_file() → Lit les fichiers
- list_directory() → Liste les composants générés
```

### Configuration dans Docker Desktop

```
MCP Toolkit → Catalog → Ajouter:
1. "Filesystem (Reference)" - modelcontextprotocol
2. "SQLite" - neverinfamous

Puis configurer les paths autorisés:
- /data/ (pour SQLite)
- /generated/ (pour les composants)
```

---

## 📄 Extraction Automatique du Schema

Quand l'utilisateur upload un CSV, on extrait automatiquement la structure :

```python
import pandas as pd

def extract_schema(file_path: str) -> dict:
    df = pd.read_csv(file_path)

    return {
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "row_count": len(df),
        "sample": df.head(3).to_dict()
    }
```

**Exemple :**

```
User upload: sales.csv

product,region,amount,date
iPhone,Paris,999,2024-01-15
MacBook,Lyon,1299,2024-01-16
...
```

**Schema extrait :**

```json
{
  "columns": ["product", "region", "amount", "date"],
  "dtypes": {
    "product": "object",
    "region": "object",
    "amount": "int64",
    "date": "object"
  },
  "row_count": 1245,
  "sample": {
    "product": { "0": "iPhone", "1": "MacBook" },
    "region": { "0": "Paris", "1": "Lyon" },
    "amount": { "0": 999, "1": 1299 },
    "date": { "0": "2024-01-15", "1": "2024-01-16" }
  }
}
```

Ce schema est envoyé à Claude pour qu'il comprenne la structure et génère des SQL queries adaptées.

---

## 🔄 Flow Complet Détaillé

```
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: UPLOAD                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User upload "sales.csv"                                       │
│           │                                                     │
│           ▼                                                     │
│   Frontend envoie POST /upload                                  │
│           │                                                     │
│           ▼                                                     │
│   Backend:                                                      │
│     1. Génère session_id = "abc123"                            │
│     2. Parse le CSV avec pandas                                │
│     3. Crée /data/abc123/data.db (SQLite)                      │
│     4. Retourne { session_id, schema }                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: GÉNÉRATION                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User écrit: "Top 10 produits par CA"                         │
│           │                                                     │
│           ▼                                                     │
│   Frontend envoie POST /generate { session_id, prompt }        │
│           │                                                     │
│           ▼                                                     │
│   Backend envoie à Claude Desktop:                             │
│     - System prompt (règles de génération)                     │
│     - Chemin vers la BDD: /data/abc123/data.db                 │
│     - Chemin output: /generated/abc123/                        │
│     - Prompt user                                               │
│           │                                                     │
│           ▼                                                     │
│   Claude utilise les MCP Servers:                              │
│     1. SQLite MCP → lit le schema, exécute query               │
│     2. Filesystem MCP → écrit le composant .jsx                │
│           │                                                     │
│           ▼                                                     │
│   Fichier créé: /generated/abc123/TopProducts.jsx              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: AFFICHAGE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Backend retourne { components: ["TopProducts.jsx"] }         │
│           │                                                     │
│           ▼                                                     │
│   Frontend:                                                     │
│     1. Fetch /generated/abc123/TopProducts.jsx                 │
│     2. react-live compile et render                            │
│           │                                                     │
│           ▼                                                     │
│   Dashboard affiché! 🎉                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Guidelines pour Claude

```
SYSTEM PROMPT:

Tu es un générateur de composants React pour dashboards.

Tu as accès à:
- SQLite MCP: pour lire le schema et exécuter des queries
- Filesystem MCP: pour écrire les composants .jsx

## RÈGLES STRICTES

1. LIBRAIRIES AUTORISÉES:
   - recharts (BarChart, LineChart, PieChart, AreaChart)
   - tailwindcss (classes utilitaires)
   - Aucune autre librairie

2. STRUCTURE DU COMPOSANT:
   export default function ComponentName({ data }) {
     if (!data || data.length === 0) {
       return <div>Pas de données</div>;
     }
     return (
       // Ton code ici
     );
   }

3. WORKFLOW:
   a) Utilise SQLite MCP pour lire le schema de la BDD
   b) Génère une SQL query appropriée
   c) Exécute la query pour obtenir les données
   d) Génère le code React du composant
   e) Utilise Filesystem MCP pour écrire le fichier .jsx

4. TYPES DE VIZ:
   - Comparaisons → BarChart
   - Tendances temporelles → LineChart
   - Proportions → PieChart
   - Détails → Table
   - Métriques clés → KPI Cards

5. REPRODUCTIBILITÉ:
   - Jamais de Math.random()
   - Toujours trier les données (ORDER BY dans SQL)
   - Couleurs fixes, pas dynamiques

6. STYLING:
   - Utilise Tailwind
   - Responsive (flex, grid)
   - Couleurs sobres et pro
```

---

## 🔒 Sécurité

### POC (Minimum viable)

```python
def validate_component(code: str) -> bool:
    dangerous = [
        'import os', 'import fs', 'require(',
        'eval(', 'exec(', 'fetch(', 'axios',
        'localStorage', 'sessionStorage', 'document.',
        'window.', 'process.'
    ]
    return not any(d in code for d in dangerous)
```

### Production (Complet)

- Sandbox avec VM isolée
- Rate limiting par user
- Audit log de toutes les générations
- Timeout sur les queries SQL
- Taille max des fichiers uploadés

---

## 🔁 Reproductibilité

```python
import hashlib

def get_cache_key(session_id: str, prompt: str) -> str:
    """Même session + même prompt = même résultat"""
    content = f"{session_id}:{prompt}"
    return hashlib.sha256(content.encode()).hexdigest()

# POC: cache en mémoire
cache = {}

async def generate_dashboard(session_id: str, prompt: str):
    key = get_cache_key(session_id, prompt)

    if key in cache:
        return cache[key]

    result = await call_claude(session_id, prompt)
    cache[key] = result
    return result
```

---

## 📅 Planning

### POC (3-4 jours) ⚡ Accéléré grâce aux MCP Servers Docker

| Jour   | Matin                                            | Après-midi                |
| ------ | ------------------------------------------------ | ------------------------- |
| **J1** | Setup Docker + MCP Servers (SQLite, Filesystem)  | Backend: endpoint /upload |
| **J2** | Backend: endpoint /generate + intégration Claude | Test Claude + MCP         |
| **J3** | Frontend: Upload + Prompt + DynamicRenderer      | Tests E2E                 |
| **J4** | Polish + exemples démo                           | Documentation             |

### Ce qu'on ne code PAS (grâce aux MCP Servers Docker)

- ❌ MCP Server custom
- ❌ Tools get_schema, execute_sql
- ❌ Tools write_component, list_components
- ✅ On utilise SQLite MCP + Filesystem MCP du catalogue Docker!

### Production (estimé 2-3 semaines après POC)

- Semaine 1: Auth + persistence + Redis
- Semaine 2: Sécurité + données externes + UI polish
- Semaine 3: Tests + déploiement GCP + documentation

---

## 🛠️ Setup Initial

### 1. Docker Desktop

```bash
# Déjà installé ✅
# WSL mis à jour ✅
```

### 2. MCP Servers à activer dans Docker Desktop

```
MCP Toolkit → Catalog → Ajouter:
☑️ Filesystem (Reference) - modelcontextprotocol - 100K+ downloads
☑️ SQLite - neverinfamous - 3.6K downloads
```

### 3. Connecter Claude Desktop

```
MCP Toolkit → Clients → Claude Desktop → Connect ✅
```

### 4. Créer le projet

```bash
mkdir ai_agent_dashboard_builder
cd ai_agent_dashboard_builder
# Structure à créer...
```

---

## ❓ Questions Ouvertes

### POC

- [x] Upload fichier ou BDD existante ? → **Upload fichier (CSV)**
- [x] Sessions liées à un compte ? → **Non pour POC, oui pour prod**
- [x] Coder MCP Server custom ? → **Non, on utilise Docker MCP Toolkit**
- [ ] Polling ou WebSocket pour détecter nouveaux composants ?
- [ ] Formats supportés ? (CSV seul ou aussi Excel ?)

### Production

- [ ] Quels APIs externes intégrer ? (météo, économie...)
- [ ] Limite de taille des fichiers ?
- [ ] Durée de vie des sessions temporaires ?
- [ ] Pricing model ?

---

## 🔗 Ressources

- [Docker MCP Toolkit](https://docs.docker.com/desktop/features/mcp-toolkit/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)
- [react-live](https://github.com/FormidableLabs/react-live)
- [recharts](https://recharts.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📝 Notes de Dev

```
[Date] - Note
──────────────
- Docker Desktop installé
- WSL mis à jour
- Claude Desktop connecté au MCP Toolkit
- MCP Servers à ajouter: Filesystem + SQLite
```
