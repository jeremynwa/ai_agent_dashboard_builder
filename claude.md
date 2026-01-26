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
│  🎨 AGENTIC DASHBOARD CREATOR                              [Session: abc123] │
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

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER ENVIRONMENT                             │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────┐ │
│  │             │      │             │      │                             │ │
│  │  FRONTEND   │◄────►│  BACKEND    │◄────►│  CLAUDE API + MCP SERVER    │ │
│  │  (React)    │ HTTP │  (FastAPI)  │      │                             │ │
│  │             │      │             │      │  Tools:                     │ │
│  │  - Upload   │      │  - /upload  │      │  - get_db_schema()          │ │
│  │  - Chat     │      │  - /generate│      │  - execute_sql()            │ │
│  │  - Render   │      │  - /session │      │  - write_component()        │ │
│  │             │      │             │      │                             │ │
│  └──────▲──────┘      └──────┬──────┘      └──────────────┬──────────────┘ │
│         │                    │                            │                 │
│         │                    ▼                            ▼                 │
│         │            ┌─────────────┐             ┌─────────────┐           │
│         │            │   SQLite    │             │  GENERATED  │           │
│         │            │   (temp)    │             │  COMPONENTS │           │
│         │            │             │             │             │           │
│         │            │ /data/      │             │ /generated/ │           │
│         │            │ session_123/│             │ session_123/│           │
│         │            │ data.db     │             │ Chart.jsx   │           │
│         │            └─────────────┘             └──────┬──────┘           │
│         │                                               │                   │
│         └───────────────────────────────────────────────┘                   │
│                         (Frontend lit les composants)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Utilisateur

```
┌──────┐     ┌──────────┐     ┌─────────┐     ┌───────┐     ┌──────────┐
│ USER │     │ FRONTEND │     │ BACKEND │     │ CLAUDE│     │FILESYSTEM│
└──┬───┘     └────┬─────┘     └────┬────┘     └───┬───┘     └────┬─────┘
   │              │                │              │               │
   │ Upload CSV   │                │              │               │
   │─────────────►│                │              │               │
   │              │ POST /upload   │              │               │
   │              │───────────────►│              │               │
   │              │                │ Parse & Store│               │
   │              │                │─────────────────────────────►│
   │              │    session_id  │              │               │
   │              │◄───────────────│              │               │
   │   "Générer"  │                │              │               │
   │─────────────►│                │              │               │
   │              │ POST /generate │              │               │
   │              │───────────────►│              │               │
   │              │                │  MCP Call    │               │
   │              │                │─────────────►│               │
   │              │                │              │ get_schema()  │
   │              │                │              │──────────────►│
   │              │                │              │◄──────────────│
   │              │                │              │ execute_sql() │
   │              │                │              │──────────────►│
   │              │                │              │◄──────────────│
   │              │                │              │write_component│
   │              │                │              │──────────────►│
   │              │                │◄─────────────│               │
   │              │   component_id │              │               │
   │              │◄───────────────│              │               │
   │              │                │              │               │
   │              │ GET /generated/session_123/Chart.jsx         │
   │              │───────────────────────────────────────────────►
   │              │◄───────────────────────────────────────────────
   │  Dashboard!  │                │              │               │
   │◄─────────────│                │              │               │
   │              │                │              │               │
```

### Structure des Sessions

```
/data/                          /generated/
├── session_abc123/             ├── session_abc123/
│   ├── data.db (SQLite)        │   ├── SalesChart.jsx
│   └── schema.json             │   ├── TopProducts.jsx
│                               │   └── KPICards.jsx
├── session_xyz789/             │
│   ├── data.db                 ├── session_xyz789/
│   └── schema.json             │   └── RevenueChart.jsx
│                               │
└── session_user_jeremy/        └── session_user_jeremy/    ← (avec auth)
    ├── data.db                     ├── Dashboard1.jsx
    └── schema.json                 └── Dashboard2.jsx
```

---

## ✅ POC vs 🚀 PRODUCTION

| Feature | POC | Production |
|---------|-----|------------|
| **Upload** | CSV uniquement | CSV, Excel, connexion BDD directe |
| **Stockage BDD** | SQLite temporaire | PostgreSQL ou connexion user |
| **Sessions** | ID aléatoire, temporaire | Auth + compte user persistant |
| **Cache** | En mémoire (dict Python) | Redis |
| **Composants** | Dossier par session, supprimé après | Sauvegarde permanente, versioning |
| **Sécurité** | Validation basique du code | Sandbox complet, rate limiting, audit |
| **MCP** | Claude API + MCP | MCP Server dédié avec monitoring |
| **Déploiement** | Docker local | GCP Cloud Run + CDN |
| **Auth** | ❌ Aucune | ✅ Login/OAuth |
| **Multi-user** | ❌ 1 user à la fois | ✅ Concurrent users |
| **Données externes** | ❌ Non | ✅ APIs météo, économie, etc. |

---

## 🏗️ Architecture Technique

### Stack

| Composant | POC | Production |
|-----------|-----|------------|
| Backend | FastAPI | FastAPI + Celery (async jobs) |
| Frontend | React + Vite | React + Vite |
| Renderer | react-live | react-live + sandbox custom |
| Charts | recharts | recharts |
| Style | Tailwind | Tailwind |
| IA | Claude API + MCP | Claude API + MCP Server dédié |
| DB User | SQLite temp | PostgreSQL / connexion directe |
| Cache | dict Python | Redis |
| Infra | Docker local | Docker + GCP |

### Structure du Projet

```
ai_agent_dashboard_builder/
│
├── 📁 backend/
│   ├── main.py                 # FastAPI app
│   ├── routers/
│   │   ├── upload.py           # POST /upload (CSV → SQLite)
│   │   ├── generate.py         # POST /generate (prompt → dashboard)
│   │   └── session.py          # GET /session/{id}
│   ├── services/
│   │   ├── claude_service.py   # Appels Claude + MCP
│   │   ├── db_service.py       # Gestion SQLite temporaire
│   │   └── cache_service.py    # Reproductibilité (POC: dict)
│   ├── mcp/
│   │   ├── server.py           # MCP Server
│   │   └── tools/
│   │       ├── db_tools.py     # get_schema, execute_sql
│   │       └── fs_tools.py     # write_component, list_components
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

## 🔧 MCP Tools

### POC - 4 Tools essentiels

```python
# 1. Lire le schema
@tool
def get_db_schema(session_id: str) -> dict:
    """Retourne la structure des tables uploadées"""
    # → {"sales": ["id", "product", "amount", "date"], ...}

# 2. Exécuter SQL
@tool
def execute_sql(session_id: str, query: str) -> list[dict]:
    """Exécute une query sur la BDD de la session"""
    # → [{"product": "iPhone", "total": 45000}, ...]

# 3. Écrire un composant
@tool
def write_component(session_id: str, name: str, code: str) -> str:
    """Écrit un fichier .jsx dans /generated/{session_id}/"""
    # → "Component written: /generated/abc123/SalesChart.jsx"

# 4. Lister les composants
@tool
def list_components(session_id: str) -> list[str]:
    """Liste les composants générés"""
    # → ["SalesChart.jsx", "TopProducts.jsx"]
```

### PRODUCTION - Tools additionnels

```python
# 5. Données externes
@tool
def fetch_external_data(source: str, params: dict) -> dict:
    """Récupère données météo, économie, etc."""

# 6. Update composant
@tool
def update_component(session_id: str, name: str, code: str) -> str:
    """Met à jour un composant existant"""

# 7. Delete composant
@tool
def delete_component(session_id: str, name: str) -> bool:
    """Supprime un composant"""
```

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
│     4. Sauvegarde schema.json                                   │
│     5. Retourne { session_id, tables, columns }                │
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
│   Backend:                                                      │
│     1. Check cache (reproductibilité)                          │
│     2. Si pas en cache → appelle Claude avec MCP               │
│           │                                                     │
│           ▼                                                     │
│   Claude reçoit:                                                │
│     - System prompt (règles de génération)                     │
│     - Schema de la BDD                                          │
│     - Prompt user                                               │
│     - Accès aux MCP tools                                       │
│           │                                                     │
│           ▼                                                     │
│   Claude:                                                       │
│     1. get_db_schema("abc123") → comprend la structure         │
│     2. execute_sql("abc123", "SELECT...") → récupère data      │
│     3. Génère le code React                                     │
│     4. write_component("abc123", "TopProducts", code)          │
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
│   Backend retourne { component_id: "TopProducts" }             │
│           │                                                     │
│           ▼                                                     │
│   Frontend:                                                     │
│     1. Fetch /generated/abc123/TopProducts.jsx                 │
│     2. Fetch data associée                                      │
│     3. react-live compile et render                            │
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

3. TYPES DE VIZ:
   - Comparaisons → BarChart
   - Tendances temporelles → LineChart
   - Proportions → PieChart
   - Détails → Table
   - Métriques clés → KPI Cards

4. REPRODUCTIBILITÉ:
   - Jamais de Math.random()
   - Toujours trier les données (ORDER BY dans SQL)
   - Couleurs fixes, pas dynamiques

5. STYLING:
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
import json

def get_cache_key(session_id: str, prompt: str) -> str:
    """Même session + même prompt = même résultat"""
    content = f"{session_id}:{prompt}"
    return hashlib.sha256(content.encode()).hexdigest()

# POC: cache en mémoire
cache = {}

async def generate_dashboard(session_id: str, prompt: str):
    key = get_cache_key(session_id, prompt)
    
    if key in cache:
        return cache[key]  # Retourne résultat précédent
    
    result = await call_claude_mcp(session_id, prompt)
    cache[key] = result
    return result
```

---

## 📅 Planning

### POC (5 jours)

| Jour | Matin | Après-midi |
|------|-------|------------|
| **J1** | Setup Docker + structure projet | Backend: endpoint /upload |
| **J2** | Backend: endpoint /generate | MCP: tools get_schema + execute_sql |
| **J3** | MCP: tool write_component | Test intégration Claude + MCP |
| **J4** | Frontend: Upload + Prompt | Frontend: DynamicRenderer |
| **J5** | Tests E2E | Polish + exemples démo |

### Production (estimé 2-3 semaines après POC)

- Semaine 1: Auth + persistence + Redis
- Semaine 2: Sécurité + données externes + UI polish
- Semaine 3: Tests + déploiement GCP + documentation

---

## ❓ Questions Ouvertes

### POC
- [x] Upload fichier ou BDD existante ? → **Upload fichier (CSV)**
- [x] Sessions liées à un compte ? → **Non pour POC, oui pour prod**
- [ ] Polling ou WebSocket pour détecter nouveaux composants ?
- [ ] Formats de fichiers supportés ? (CSV seul ou aussi Excel ?)

### Production
- [ ] Quels APIs externes intégrer ? (météo, économie...)
- [ ] Limite de taille des fichiers ?
- [ ] Durée de vie des sessions temporaires ?
- [ ] Pricing model ?

---

## 🔗 Ressources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude API Docs](https://docs.anthropic.com/)
- [react-live](https://github.com/FormidableLabs/react-live)
- [recharts](https://recharts.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📝 Notes de Dev

```
[Date] - Note
──────────────
...
```