# 🧠 CLAUDE.md — POC MCP Dashboard

## 📋 Résumé du Projet

**Nom**: `agentic_dashboard_creator` (ou autre nom choisi)

**Objectif**: Créer un système où l'utilisateur exprime un besoin en langage naturel et l'IA (Claude) génère **en live** des composants React qui affichent les données demandées.

**Contexte**: POC pour impressionner Nicolas (nouveau partner). Démontrer l'expertise IA + Frontend, pas que Data.

---

## 🎯 Le Concept Core

```
User: "Montre-moi les top 10 produits par CA en 2024"
        ↓
Claude (via MCP) analyse → génère SQL → récupère data → génère composant React
        ↓
Composant .jsx écrit dans Docker
        ↓
Frontend charge et affiche le composant dynamiquement
```

**Ce que NOUS codons**: Layout + Interface + ChatBox + Zone de rendu
**Ce que l'IA fait**: Génère des blocs React (charts, tables, KPIs) injectés dans notre zone

---

## 🏗️ Architecture Technique

### Stack

| Composant          | Techno                  |
| ------------------ | ----------------------- |
| Backend            | FastAPI                 |
| Frontend           | React + Vite            |
| Renderer dynamique | react-live              |
| Charts             | recharts                |
| Style              | Tailwind                |
| IA                 | Claude API + MCP        |
| DB                 | SQLite (mock pour POC)  |
| Infra              | Docker + Docker Compose |

### Structure du Projet

```
agentic_dashboard_creator/
├── mcp-server/                 # Serveur MCP (tools pour Claude)
│   ├── server.py
│   ├── tools/
│   │   ├── db_tools.py         # read_schema, execute_query
│   │   └── component_tools.py  # write_component, list_components
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatInput.jsx
│   │   │   ├── DashboardCanvas.jsx
│   │   │   └── DynamicRenderer.jsx
│   │   └── services/
│   │       └── api.js
│   ├── generated/              # ← VOLUME DOCKER où Claude écrit les composants
│   ├── Dockerfile
│   └── package.json
│
├── backend/
│   ├── main.py                 # FastAPI - orchestration
│   ├── services/
│   │   ├── claude_service.py   # Client Claude + MCP
│   │   └── cache_service.py    # Reproductibilité
│   ├── database/
│   │   ├── mock_data.py
│   │   └── schema.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── data/
│   └── mock.db                 # SQLite avec données fictives
│
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                   # Ce fichier
└── README.md
```

---

## 🔧 MCP Server — Les Tools

Claude aura accès à ces tools via MCP:

### 1. `get_db_schema()`

Retourne le schema de la base de données pour que Claude comprenne la structure.

```python
→ Output: {
    "products": ["id", "name", "category", "price"],
    "sales": ["id", "product_id", "date", "amount"],
    ...
}
```

### 2. `execute_sql(query: str)`

Exécute une query SQL et retourne les résultats.

```python
→ Input: "SELECT category, SUM(amount) FROM sales GROUP BY category"
→ Output: [{"category": "Electronics", "total": 15000}, ...]
```

### 3. `write_component(component_name, component_code, session_id)`

**LE TOOL CLÉ** — Écrit un composant React dans le volume Docker partagé.

```python
→ Input: ("SalesChart", "export default function...", "abc123")
→ Output: "Component written to /app/generated/abc123/SalesChart.jsx"
```

### 4. `list_components(session_id)`

Liste les composants générés pour une session.

```python
→ Input: "abc123"
→ Output: ["SalesChart.jsx", "TopProducts.jsx"]
```

---

## 🐳 Docker — Volume Partagé

Le point critique: un volume Docker partagé entre MCP Server et Frontend.

```yaml
volumes:
  generated_components:
    # MCP Server écrit ici (rw)
    # Frontend lit ici (ro)
```

```
mcp-server ──(écrit)──► /app/generated/{session_id}/Component.jsx
                              │
frontend ◄──(lit)─────────────┘
```

---

## 🔄 Flow Complet

```
1. USER
   │ "Montre-moi les ventes par catégorie"
   ▼
2. FRONTEND
   │ POST /api/generate { prompt, session_id }
   ▼
3. BACKEND (FastAPI)
   │ Vérifie cache (reproductibilité)
   │ Si pas en cache → appelle Claude
   ▼
4. CLAUDE + MCP
   │ a) get_db_schema() → comprend la structure
   │ b) execute_sql("SELECT...") → récupère data
   │ c) Génère le code React
   │ d) write_component("SalesChart", code, session_id)
   ▼
5. FICHIER CRÉÉ
   │ /app/generated/{session_id}/SalesChart.jsx
   ▼
6. FRONTEND
   │ Polling ou WebSocket détecte nouveau fichier
   │ Charge le code
   │ react-live render le composant
   ▼
7. DASHBOARD AFFICHÉ
```

---

## 📊 Mock Data (POC)

### Tables

```python
tables = {
    'dim_products': ['product_id', 'name', 'category', 'price', 'stock'],
    'dim_pos': ['pos_id', 'location', 'region', 'type'],
    'fact_sales': ['sale_id', 'product_id', 'pos_id', 'date', 'quantity', 'amount'],
    'dim_time': ['date_id', 'date', 'month', 'quarter', 'year'],
    'dim_customers': ['customer_id', 'segment', 'loyalty_tier']
}
```

### Volume de données

- ~100-500 lignes par table pour le POC
- Données cohérentes avec relations FK

---

## 🎨 Guidelines pour Claude (Génération de Composants)

```
RÈGLES STRICTES:
1. Utilise uniquement ces bibliothèques:
   - recharts (graphiques)
   - tailwindcss (styling)

2. Structure du composant:
   - Export default function
   - Props: { data }
   - Gestion d'erreurs intégrée
   - Responsive design

3. Types de visualisations:
   - BarChart (comparaisons)
   - LineChart (tendances temporelles)
   - PieChart (proportions)
   - Table (données détaillées)
   - KPI Cards (métriques clés)

4. Reproductibilité:
   - Pas de Math.random()
   - Même query → même output
   - Tri déterministe des données
```

---

## 🔒 Sécurité

### Validation du code généré

```python
def validate_component(code: str) -> bool:
    checks = [
        has_default_export(code),
        no_dangerous_imports(code),  # pas de fs, child_process, etc.
        no_eval_or_exec(code),
        no_fetch_or_axios(code),     # pas d'appels réseau
        no_localstorage(code),       # pas d'accès browser APIs
    ]
    return all(checks)
```

### Sandbox Frontend

- react-live avec scope limité
- Whitelist d'imports (recharts uniquement)
- Pas d'accès à window, document, etc.

---

## 🔁 Reproductibilité

**Exigence**: Même prompt → Même dashboard exact

### Implémentation

```python
import hashlib

def get_cache_key(prompt: str, filters: dict) -> str:
    content = f"{prompt}:{json.dumps(filters, sort_keys=True)}"
    return hashlib.md5(content.encode()).hexdigest()

# Cache en mémoire pour POC, Redis pour prod
cache = {}

async def generate(prompt, filters, session_id):
    key = get_cache_key(prompt, filters)
    if key in cache:
        return cache[key]

    result = await claude_generate(prompt, filters, session_id)
    cache[key] = result
    return result
```

---

## 📅 Planning POC (4-5 jours)

| Jour   | Focus                             | Livrable                                 |
| ------ | --------------------------------- | ---------------------------------------- |
| **J1** | Setup Docker + MCP Server basique | Container qui tourne, 1 tool fonctionnel |
| **J2** | Tools complets MCP                | get_schema, execute_sql, write_component |
| **J3** | Intégration Claude API + MCP      | Claude peut appeler les tools            |
| **J4** | Frontend + chargement dynamique   | Composants s'affichent                   |
| **J5** | Tests E2E + polish démo           | 3-4 exemples qui marchent                |

---

## ❓ Questions Ouvertes

### À clarifier avec Marwan

- [ ] Quelle DB réelle utiliser ? Ou mock data suffit ?
- [ ] Docker déjà setup côté client ? Ou on fournit tout ?
- [ ] Format de la démo pour Nicolas ? (live, vidéo, slides)
- [ ] Victor peut aider sur quoi ?

### Décisions techniques à prendre

- [ ] Polling vs WebSocket pour détecter nouveaux composants ?
- [ ] Cache en mémoire vs Redis ?
- [ ] Auth/sessions pour le POC ou pas ?

---

## 🔗 Ressources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude API Docs](https://docs.anthropic.com/)
- [react-live](https://github.com/FormidableLabs/react-live)
- [recharts](https://recharts.org/)

---

## 📝 Notes de Dev

_Espace pour notes au fil du développement_

```
- ...
```
