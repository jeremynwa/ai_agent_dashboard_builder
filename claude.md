# 🧠 CLAUDE.md — AI App Builder

## 📋 Résumé du Projet

**Nom**: `ai_app_builder`

**Objectif**: Générer des applications React à partir d'un prompt, en respectant les règles métier de la compagnie et en utilisant les données du client.

**Contexte**: POC pour impressionner Nicolas (nouveau partner). Démontrer l'expertise IA + Frontend.

---

## 🎯 Le Concept Core

```
┌─────────────────────────────────────────────────────────────────┐
│                       AI APP BUILDER                            │
│                                                                 │
│   INPUTS                           OUTPUT                       │
│   ──────                           ──────                       │
│   ┌─────────────┐                                               │
│   │   Prompt    │ "Créer un calculateur                        │
│   │   User      │  d'élasticité des prix"                      │
│   └──────┬──────┘                                               │
│          │                                                      │
│   ┌──────┴──────┐                  ┌─────────────────────────┐ │
│   │   Règles    │                  │                         │ │
│   │   JSON      │ ──── CLAUDE ───► │   APP REACT GÉNÉRÉE     │ │
│   │  (logique,  │    + MCP         │                         │ │
│   │  formats)   │                  │   - Respecte vos règles │ │
│   └──────┬──────┘                  │   - Utilise vos données │ │
│          │                         │   - Style compagnie     │ │
│   ┌──────┴──────┐                  │                         │ │
│   │    BDD      │                  └─────────────────────────┘ │
│   │   Client    │                                               │
│   │  (CSV/SQL)  │                                               │
│   └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Types d'Apps Générables

| Type | Description | Exemple |
|------|-------------|---------|
| **Dashboards** | Visualisation de données, KPIs, charts | Sales dashboard, Marketing metrics |
| **Calculateurs** | Outils de calcul métier | ROI calculator, Price elasticity, Margin calculator |
| **Formulaires** | Collecte de données structurées | Lead capture, Survey, Onboarding |
| **Landing Pages** | Pages marketing/produit | Product launch, Event registration |
| **Outils internes** | Apps métier spécifiques | Inventory manager, Quote generator |

---

## 📊 Architecture Complète

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  👤 CLIENT (navigateur)                                                     │
│       │                                                                     │
│       │ HTTP                                                                │
│       ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🖥️ FRONTEND (React)                                                 │  │
│  │                                                                       │  │
│  │  - Upload CSV                                                        │  │
│  │  - Input prompt                                                      │  │
│  │  - Affiche apps générées                                             │  │
│  │                                                                       │  │
│  │  Hébergé sur: S3 (static hosting)                                    │  │
│  └───────────────────────────┬──────────────────────────────────────────┘  │
│                              │                                              │
│                              │ HTTP                                         │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🖥️ BACKEND (FastAPI)                                                │  │
│  │                                                                       │  │
│  │  - POST /upload → reçoit CSV → stocke dans PostgreSQL                │  │
│  │  - POST /generate → appelle Claude API                               │  │
│  │  - GET /apps/{session} → liste apps générées                         │  │
│  │                                                                       │  │
│  │  Hébergé sur: EC2 ou Lambda (free tier)                              │  │
│  └───────────────────────────┬──────────────────────────────────────────┘  │
│                              │                                              │
│                              │ Appelle Claude API                           │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🧠 CLAUDE API                                                        │  │
│  │                                                                       │  │
│  │  Claude reçoit le prompt + accès aux MCP servers                     │  │
│  │                                                                       │  │
│  │  Hébergé par: Anthropic                                              │  │
│  └───────────────────────────┬──────────────────────────────────────────┘  │
│                              │                                              │
│                              │ Appelle les MCP tools                        │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        MCP SERVERS                                    │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐    ┌─────────────────────────────────┐  │  │
│  │  │  🔧 CUSTOM MCP          │    │  📊 AURORA POSTGRESQL MCP       │  │  │
│  │  │     (toi)               │    │        (AWS)                    │  │  │
│  │  │                         │    │                                 │  │  │
│  │  │  📖 LIRE S3:            │    │  • execute_query(sql)           │  │  │
│  │  │  • get_rules(type)      │    │  • get_schema()                 │  │  │
│  │  │  • get_template(type)   │    │  • list_tables()                │  │  │
│  │  │  • list_rules()         │    │                                 │  │  │
│  │  │                         │    │  Hébergé par: AWS (managed)     │  │  │
│  │  │  ✏️ ÉCRIRE S3:          │    │                                 │  │  │
│  │  │  • save_app(...)        │    └─────────────────────────────────┘  │  │
│  │  │  • list_apps(session)   │                                         │  │
│  │  │                         │                                         │  │
│  │  │  Hébergé sur:           │                                         │  │
│  │  │  AGENTCORE RUNTIME      │                                         │  │
│  │  └─────────────────────────┘                                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│         ┌────────────────────┴────────────────────┐                        │
│         │                                         │                        │
│         ▼                                         ▼                        │
│  ┌────────────────┐                      ┌─────────────────┐               │
│  │      S3        │                      │ RDS POSTGRESQL  │               │
│  │                │                      │                 │               │
│  │  /rules/       │                      │ data_{session}  │               │
│  │    pricing.json│                      │   (CSV data)    │               │
│  │    design.json │                      │                 │               │
│  │  /templates/   │                      │ sessions        │               │
│  │    calculator. │                      │                 │               │
│  │  /generated/   │                      └─────────────────┘               │
│  │    session_123/│                                                        │
│  │      App.jsx   │                                                        │
│  └────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 MCP Servers - Tableau Récapitulatif

| Fonction | Qui fait | MCP | Stockage |
|----------|----------|-----|----------|
| Lire règles métier (JSON) | Toi | Custom MCP | S3 |
| Lire design system (JSON) | Toi | Custom MCP | S3 |
| Lire templates (JSX) | Toi | Custom MCP | S3 |
| Lire données client | AWS | Aurora PostgreSQL MCP | RDS PostgreSQL |
| Query données client | AWS | Aurora PostgreSQL MCP | RDS PostgreSQL |
| Écrire apps générées | Toi | Custom MCP | S3 |
| Lister apps générées | Toi | Custom MCP | S3 |

---

## 🔧 Custom MCP - Code

```python
# mcp_server/server.py (~80 lignes)

import json
import boto3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP(name="ai-app-builder", host="0.0.0.0", stateless_http=True)
s3 = boto3.client('s3')
BUCKET = "ai-app-builder"

# ============ LIRE S3 ============

@mcp.tool()
def get_rules(rule_type: str) -> dict:
    """Lit les règles métier (pricing, finance, marketing)"""
    obj = s3.get_object(Bucket=BUCKET, Key=f'rules/{rule_type}.json')
    return json.loads(obj['Body'].read())

@mcp.tool()
def get_template(app_type: str) -> str:
    """Lit un template React (calculator, dashboard, form)"""
    obj = s3.get_object(Bucket=BUCKET, Key=f'templates/{app_type}.jsx')
    return obj['Body'].read().decode('utf-8')

@mcp.tool()
def list_rules() -> list:
    """Liste toutes les règles disponibles"""
    response = s3.list_objects_v2(Bucket=BUCKET, Prefix='rules/')
    return [obj['Key'] for obj in response.get('Contents', [])]

# ============ ÉCRIRE S3 ============

@mcp.tool()
def save_app(session_id: str, filename: str, code: str) -> dict:
    """Sauvegarde l'app React générée dans S3"""
    key = f'generated/{session_id}/{filename}'
    s3.put_object(Bucket=BUCKET, Key=key, Body=code, ContentType='text/jsx')
    return {"status": "success", "path": f"s3://{BUCKET}/{key}"}

@mcp.tool()
def list_apps(session_id: str) -> list:
    """Liste les apps générées pour cette session"""
    response = s3.list_objects_v2(Bucket=BUCKET, Prefix=f'generated/{session_id}/')
    return [obj['Key'] for obj in response.get('Contents', [])]

# ============ RUN ============

def main():
    mcp.run(transport="streamable-http")

if __name__ == "__main__":
    main()
```

**Déploiement sur AgentCore (2 commandes) :**
```bash
agentcore configure --entrypoint server.py --protocol MCP --name ai-app-builder
agentcore launch
```

---

## 📦 Structure S3

```
s3://ai-app-builder/
│
├── rules/                      # Règles métier (JSON)
│   ├── pricing.json            # Formules: élasticité, marge, markup
│   ├── finance.json            # Formules: ROI, NPV, IRR
│   ├── marketing.json          # Formules: CAC, LTV, conversion
│   └── design.json             # Couleurs, fonts, spacing
│
├── templates/                  # Templates React de base (JSX)
│   ├── calculator.jsx
│   ├── dashboard.jsx
│   ├── form.jsx
│   └── landing.jsx
│
├── generated/                  # Apps générées par Claude
│   ├── session_abc123/
│   │   ├── ElasticityCalc.jsx
│   │   └── SalesChart.jsx
│   └── session_xyz789/
│       └── ROICalculator.jsx
│
└── uploads/                    # CSVs uploadés (backup)
    └── session_abc123/
        └── data.csv
```

---

## 📄 Exemple de Règles JSON

### `rules/pricing.json`
```json
{
  "name": "Pricing Rules",
  "formulas": {
    "price_elasticity": {
      "name": "Élasticité-prix",
      "formula": "(ΔQ / Q) / (ΔP / P)",
      "code": "const elasticity = (deltaQ / Q) / (deltaP / P);",
      "interpretation": {
        "abs > 1": "Demande élastique",
        "abs < 1": "Demande inélastique"
      }
    },
    "margin": {
      "name": "Marge",
      "formula": "(Prix - Coût) / Prix × 100",
      "code": "const margin = ((price - cost) / price) * 100;"
    },
    "markup": {
      "name": "Markup",
      "formula": "(Prix - Coût) / Coût × 100",
      "code": "const markup = ((price - cost) / cost) * 100;"
    }
  }
}
```

### `rules/design.json`
```json
{
  "name": "Design System",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "error": "#EF4444",
    "warning": "#F59E0B",
    "background": "#F9FAFB",
    "text": "#111827"
  },
  "fonts": {
    "title": "text-2xl font-bold text-gray-900",
    "subtitle": "text-lg font-medium text-gray-700",
    "body": "text-base text-gray-600"
  }
}
```

---

## 🔄 Flow Complet

```
1. User upload CSV sur Frontend
2. Frontend → Backend: POST /upload {file}
3. Backend parse CSV → stocke dans PostgreSQL (table data_{session_id})
4. Backend retourne {session_id, schema}

5. User écrit prompt: "Créer un calculateur d'élasticité"
6. Frontend → Backend: POST /generate {session_id, prompt}
7. Backend → Claude API: prompt + MCP access

8. Claude utilise les MCP:
   a) Custom MCP: get_rules("pricing") → formules
   b) Custom MCP: get_template("calculator") → template JSX
   c) Aurora MCP: get_schema() → colonnes du CSV
   d) Aurora MCP: execute_query("SELECT...") → sample data
   e) Claude génère le code React
   f) Custom MCP: save_app(session_id, "ElasticityCalc.jsx", code)

9. Claude → Backend: {status: "done", path: "generated/abc/ElasticityCalc.jsx"}
10. Backend → Frontend: {s3_url: "..."}
11. Frontend fetch le .jsx depuis S3 → react-live render
```

---

## 💰 Coûts AWS

| Service | Usage | Coût |
|---------|-------|------|
| **S3** | Rules + templates + apps | $0 (free tier) |
| **RDS PostgreSQL** | db.t3.micro | ~$15-20/mois (crédits) |
| **AgentCore Runtime** | Custom MCP hosting | $0 (free tier) |
| **EC2 ou Lambda** | Backend | $0 (free tier) |
| **Total POC** | 3-6 mois | **~$60-100** (couvert par crédits $100) |

---

## 📁 Structure du Projet

```
ai_app_builder/
│
├── 📁 backend/
│   ├── main.py                 # FastAPI app
│   ├── routers/
│   │   ├── upload.py           # POST /upload
│   │   ├── generate.py         # POST /generate
│   │   └── apps.py             # GET /apps/{session}
│   ├── services/
│   │   ├── claude_service.py   # Appels Claude API
│   │   └── db_service.py       # PostgreSQL
│   └── requirements.txt
│
├── 📁 frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadZone.jsx
│   │   │   ├── PromptInput.jsx
│   │   │   └── AppPreview.jsx
│   │   └── services/
│   │       └── api.js
│   └── package.json
│
├── 📁 mcp_server/              # Custom MCP
│   ├── server.py
│   └── requirements.txt
│
├── 📁 rules/                   # À uploader vers S3
│   ├── pricing.json
│   ├── finance.json
│   ├── marketing.json
│   └── design.json
│
├── 📁 templates/               # À uploader vers S3
│   ├── calculator.jsx
│   ├── dashboard.jsx
│   └── form.jsx
│
├── CLAUDE.md
└── README.md
```

---

## 📅 Planning POC

| Jour | Focus |
|------|-------|
| **J1** | Setup AWS (S3, RDS) + structure projet |
| **J2** | Custom MCP server + deploy AgentCore |
| **J3** | Backend: /upload + /generate |
| **J4** | Frontend: Upload + Prompt |
| **J5** | Frontend: AppPreview + react-live |
| **J6** | Écrire règles JSON + templates |
| **J7** | Tests E2E + polish |

---

## 🚀 Améliorations Futures (Post-POC)

### 1. Bedrock Knowledge Base (remplace JSON S3)

Au lieu de fichiers JSON statiques, utiliser **Amazon Bedrock Knowledge Base** pour les règles :

| Actuel (POC) | Futur (Prod) |
|--------------|--------------|
| `get_rules("pricing")` → fichier exact | `"comment calculer l'élasticité"` → recherche sémantique |
| Fichiers JSON dans S3 | Documents indexés dans Bedrock KB |
| Custom MCP lit S3 | AWS Bedrock KB MCP (officiel) |

**Avantages :**
- Recherche intelligente (pas besoin de connaître le nom du fichier)
- Claude trouve les passages pertinents automatiquement
- Supporte plus de formats (PDF, Word, etc.)

### 2. Autres améliorations
- Auth avec Cognito
- Multi-tenant
- Historique des apps générées
- Export/deploy des apps
- Core MCP pour orchestrer plusieurs MCP

---

## 🔗 Ressources

- [AWS MCP Servers](https://github.com/awslabs/mcp)
- [Aurora PostgreSQL MCP](https://github.com/awslabs/mcp/tree/main/src/aurora-postgresql-mcp-server)
- [AgentCore Runtime](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore.html)
- [FastMCP](https://github.com/jlowin/fastmcp)
- [react-live](https://github.com/FormidableLabs/react-live)
- [recharts](https://recharts.org/)

---

## 📝 Notes

```
[Date] - Note
──────────────
- Compte AWS Free Tier ($100 crédits, expire 27 Jul 2026)
- Architecture: Custom MCP (S3) + Aurora PostgreSQL MCP (AWS)
- Bedrock KB prévu pour amélioration future
```