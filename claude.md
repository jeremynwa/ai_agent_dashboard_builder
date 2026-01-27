# 🧠 CLAUDE.md — AI Agent Dashboard Builder

## 📋 Résumé du Projet

**Nom**: `ai_agent_dashboard_builder`

**Objectif**: L'utilisateur upload sa BDD (CSV/Excel), écrit un prompt, et Claude génère **en live** des composants React pour créer un dashboard.

**Contexte**: POC pour impressionner Nicolas (nouveau partner). Démontrer l'expertise IA + Frontend.

**Architecture**: 100% AWS (S3 + RDS PostgreSQL + AWS MCP Servers)

---

## 🎯 Le Concept Core

```
User upload CSV + écrit "Montre-moi les ventes par région"
        ↓
Claude (via AWS MCP) analyse le schema → query PostgreSQL → génère composant React
        ↓
Composant .jsx écrit dans S3 (bucket du user/session)
        ↓
Frontend fetch depuis S3 et affiche le dashboard
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

### Architecture Globale (100% AWS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD                                      │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────┐ │
│  │             │      │             │      │                             │ │
│  │  FRONTEND   │◄────►│  BACKEND    │◄────►│      CLAUDE DESKTOP         │ │
│  │  (React)    │ HTTP │  (FastAPI)  │      │            +                │ │
│  │             │      │   on EC2    │      │    AWS MCP SERVERS          │ │
│  │  - Upload   │      │   or Lambda │      │                             │ │
│  │  - Chat     │      │             │      │  ┌───────────┐ ┌─────────┐  │ │
│  │  - Render   │      │  - /upload  │      │  │  Aurora   │ │   S3    │  │ │
│  │             │      │  - /generate│      │  │ PostgreSQL│ │   MCP   │  │ │
│  └──────▲──────┘      │  - /session │      │  │    MCP    │ │         │  │ │
│         │             └──────┬──────┘      │  └─────┬─────┘ └────┬────┘  │ │
│         │                    │             │        │            │       │ │
│         │                    │             └────────┼────────────┼───────┘ │
│         │                    │                      │            │         │
│         │                    ▼                      ▼            ▼         │
│         │            ┌─────────────┐        ┌─────────────────────────┐   │
│         │            │     RDS     │        │        S3 BUCKET        │   │
│         │            │  PostgreSQL │        │                         │   │
│         │            │             │        │  /generated/            │   │
│         │            │ - sessions  │        │    session_123/         │   │
│         │            │ - user_data │        │      SalesChart.jsx     │   │
│         │            │ - schemas   │        │      TopProducts.jsx    │   │
│         │            └─────────────┘        └────────────┬────────────┘   │
│         │                                                │                 │
│         └────────────────────────────────────────────────┘                 │
│                         (Frontend fetch depuis S3)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Utilisateur

```
┌──────┐     ┌──────────┐     ┌─────────┐     ┌───────────────────────┐
│ USER │     │ FRONTEND │     │ BACKEND │     │ CLAUDE + AWS MCP      │
└──┬───┘     └────┬─────┘     └────┬────┘     └───────────┬───────────┘
   │              │                │                      │
   │ Upload CSV   │                │                      │
   │─────────────►│                │                      │
   │              │ POST /upload   │                      │
   │              │───────────────►│                      │
   │              │                │ Parse CSV            │
   │              │                │ Insert PostgreSQL    │
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
   │              │                │  Aurora PostgreSQL   │
   │              │                │  MCP:                │
   │              │                │  - read schema       │
   │              │                │  - execute query     │
   │              │                │                      │
   │              │                │  S3 MCP:             │
   │              │                │  - write .jsx file   │
   │              │                │                      │
   │              │                │◄─────────────────────│
   │              │   components   │                      │
   │              │◄───────────────│                      │
   │              │                │                      │
   │              │ Fetch .jsx from S3                    │
   │              │────────────────────────────────────────►
   │              │◄────────────────────────────────────────
   │  Dashboard!  │                │                      │
   │◄─────────────│                │                      │
```

### Structure S3

```
s3://ai-dashboard-builder/
│
├── uploads/                     # CSVs uploadés (temporaire)
│   ├── session_abc123/
│   │   └── sales_data.csv
│   └── session_xyz789/
│       └── inventory.csv
│
├── generated/                   # Composants React générés
│   ├── session_abc123/
│   │   ├── SalesChart.jsx
│   │   ├── TopProducts.jsx
│   │   └── KPICards.jsx
│   └── session_xyz789/
│       └── RevenueChart.jsx
│
└── schemas/                     # Schemas extraits (JSON)
    ├── session_abc123.json
    └── session_xyz789.json
```

### Structure PostgreSQL

```sql
-- Table des sessions
CREATE TABLE sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    user_id VARCHAR(50)  -- Pour auth future
);

-- Table des données uploadées (dynamique par session)
-- Chaque session crée sa propre table: data_{session_id}
-- Ex: data_abc123 avec les colonnes du CSV

-- Table des composants générés
CREATE TABLE components (
    component_id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessions(session_id),
    name VARCHAR(100),
    s3_path VARCHAR(255),
    prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💰 Coûts AWS (Free Tier + Crédits)

| Service | Usage estimé | Coût | Source |
|---------|--------------|------|--------|
| **S3** | < 5 GB | **$0** | Free tier (5 GB gratuit) |
| **RDS PostgreSQL** | db.t3.micro | **~$15-20/mois** | Crédits $100 |
| **Data Transfer** | < 1 GB | **$0** | Free tier |
| **Total POC** | ~3 mois | **~$50-60** | Couvert par crédits |

✅ **Tes $100 couvrent 5-6 mois de POC tranquille**

---

## ✅ POC vs 🚀 PRODUCTION

| Feature | POC | Production |
|---------|-----|------------|
| **Upload** | CSV uniquement | CSV, Excel, connexion BDD directe |
| **Base de données** | RDS PostgreSQL (t3.micro) | Aurora PostgreSQL Serverless |
| **Stockage fichiers** | S3 Standard | S3 + CloudFront CDN |
| **Sessions** | ID aléatoire, temporaire | Auth + compte user persistant |
| **Cache** | Aucun | ElastiCache Redis |
| **Sécurité** | IAM basique | IAM + VPC + WAF |
| **Déploiement** | EC2 ou local + AWS MCP | ECS/Lambda + API Gateway |
| **Auth** | ❌ Aucune | ✅ Cognito |
| **Multi-user** | ❌ 1 user à la fois | ✅ Concurrent users |

---

## 🏗️ Architecture Technique

### Stack

| Composant | Techno |
|-----------|--------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite |
| Renderer | react-live |
| Charts | recharts |
| Style | Tailwind |
| IA | Claude Desktop + AWS MCP |
| DB | RDS PostgreSQL |
| Storage | S3 |
| Infra | AWS Free Tier + Crédits |

### Structure du Projet

```
ai_agent_dashboard_builder/
│
├── 📁 backend/
│   ├── main.py                 # FastAPI app
│   ├── routers/
│   │   ├── upload.py           # POST /upload (CSV → PostgreSQL)
│   │   ├── generate.py         # POST /generate (prompt → Claude)
│   │   └── session.py          # GET /session/{id}
│   ├── services/
│   │   ├── claude_service.py   # Appels Claude + AWS MCP
│   │   ├── db_service.py       # Connexion RDS PostgreSQL
│   │   └── s3_service.py       # Upload/download S3
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
├── 📁 infrastructure/          # (Optionnel) IaC
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── rds.tf
│   │   ├── s3.tf
│   │   └── variables.tf
│   └── scripts/
│       └── setup_aws.sh
│
├── docker-compose.yml          # Pour dev local
├── .env.example
├── CLAUDE.md                   # Ce fichier
└── README.md
```

---

## 🔧 AWS MCP Servers Utilisés

### 1. Aurora PostgreSQL MCP
```
Depuis: AWS MCP Catalog (awslabs)
Nom: awslabs.aurora-postgresql-mcp-server

Tools disponibles:
- execute_query(sql) → Exécute une query SQL
- get_schema() → Retourne la structure des tables
- list_tables() → Liste les tables
```

**Configuration:**
```json
{
  "mcpServers": {
    "aurora-postgresql": {
      "command": "uvx",
      "args": ["awslabs.aurora-postgresql-mcp-server@latest"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host:5432/db",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

### 2. S3 MCP
```
Depuis: Community MCP ou AWS MCP
Nom: aws-s3-mcp

Tools disponibles:
- write_file(bucket, key, content) → Écrit un fichier
- read_file(bucket, key) → Lit un fichier
- list_objects(bucket, prefix) → Liste les fichiers
- delete_file(bucket, key) → Supprime un fichier
```

**Configuration:**
```json
{
  "mcpServers": {
    "s3": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-aws-s3-mcp"],
      "env": {
        "AWS_ACCESS_KEY_ID": "...",
        "AWS_SECRET_ACCESS_KEY": "...",
        "AWS_REGION": "us-east-1",
        "BUCKET_NAME": "ai-dashboard-builder"
      }
    }
  }
}
```

---

## 📄 Extraction Automatique du Schema

Quand l'utilisateur upload un CSV :

```python
import pandas as pd
import json

def extract_schema(file_path: str) -> dict:
    df = pd.read_csv(file_path)
    
    return {
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "row_count": len(df),
        "sample": df.head(3).to_dict()
    }

def csv_to_postgresql(df: pd.DataFrame, session_id: str, engine):
    """Crée une table PostgreSQL depuis un DataFrame"""
    table_name = f"data_{session_id}"
    df.to_sql(table_name, engine, if_exists='replace', index=False)
    return table_name
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
│     3. Upload CSV vers S3 (backup)                             │
│     4. Crée table data_abc123 dans PostgreSQL                  │
│     5. Sauvegarde schema dans S3                               │
│     6. Retourne { session_id, schema }                         │
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
│     - Infos connexion PostgreSQL                               │
│     - Bucket S3 pour output                                    │
│     - Prompt user                                               │
│           │                                                     │
│           ▼                                                     │
│   Claude utilise les AWS MCP Servers:                          │
│     1. Aurora PostgreSQL MCP → lit schema, exécute query       │
│     2. S3 MCP → écrit le composant .jsx                        │
│           │                                                     │
│           ▼                                                     │
│   Fichier créé: s3://bucket/generated/abc123/TopProducts.jsx   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: AFFICHAGE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Backend retourne { components: ["TopProducts.jsx"], s3_urls } │
│           │                                                     │
│           ▼                                                     │
│   Frontend:                                                     │
│     1. Fetch depuis S3 (pre-signed URL ou public)              │
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
- Aurora PostgreSQL MCP: pour lire le schema et exécuter des queries
- S3 MCP: pour écrire les composants .jsx

## RÈGLES STRICTES

1. LIBRAIRIES AUTORISÉES:
   - recharts (BarChart, LineChart, PieChart, AreaChart)
   - tailwindcss (classes utilitaires)
   - Aucune autre librairie

2. STRUCTURE DU COMPOSANT:
   export default function ComponentName({ data }) {
     if (!data || data.length === 0) {
       return <div className="text-gray-500">Pas de données</div>;
     }
     return (
       // Ton code ici
     );
   }

3. WORKFLOW:
   a) Utilise Aurora PostgreSQL MCP pour lire le schema
   b) Génère une SQL query appropriée
   c) Exécute la query pour obtenir les données
   d) Génère le code React du composant
   e) Utilise S3 MCP pour écrire le fichier .jsx
   f) Retourne le path S3

4. TYPES DE VIZ:
   - Comparaisons → BarChart
   - Tendances temporelles → LineChart
   - Proportions → PieChart
   - Détails → Table HTML avec Tailwind
   - Métriques clés → KPI Cards

5. REPRODUCTIBILITÉ:
   - Jamais de Math.random()
   - Toujours ORDER BY dans SQL
   - Couleurs fixes

6. STYLING:
   - Tailwind uniquement
   - Responsive (flex, grid)
   - Couleurs: blue-500, green-500, red-500, etc.
```

---

## 🛠️ Setup AWS

### 1. Créer le bucket S3
```bash
aws s3 mb s3://ai-dashboard-builder --region us-east-1

# Configurer CORS pour le frontend
aws s3api put-bucket-cors --bucket ai-dashboard-builder --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"]
  }]
}'
```

### 2. Créer l'instance RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier dashboard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 20 \
  --region us-east-1
```

### 3. Configurer les credentials AWS
```bash
# ~/.aws/credentials
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...

# ~/.aws/config
[default]
region = us-east-1
```

### 4. Configurer Claude Desktop avec AWS MCP
```json
// ~/.config/claude/claude_desktop_config.json (Linux)
// ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)

{
  "mcpServers": {
    "aurora-postgresql": {
      "command": "uvx",
      "args": ["awslabs.aurora-postgresql-mcp-server@latest"],
      "env": {
        "DATABASE_URL": "postgresql://admin:pass@dashboard-db.xxx.us-east-1.rds.amazonaws.com:5432/postgres"
      }
    },
    "s3": {
      "command": "npx",
      "args": ["-y", "mcp-server-s3"],
      "env": {
        "AWS_REGION": "us-east-1",
        "S3_BUCKET_NAME": "ai-dashboard-builder"
      }
    }
  }
}
```

---

## 📅 Planning

### POC (5-6 jours)

| Jour | Matin | Après-midi |
|------|-------|------------|
| **J1** | Setup AWS (S3, RDS) | Configurer AWS MCP Servers |
| **J2** | Backend: endpoint /upload | Backend: connexion PostgreSQL |
| **J3** | Backend: endpoint /generate | Test Claude + AWS MCP |
| **J4** | Frontend: Upload + Prompt | Frontend: DynamicRenderer |
| **J5** | Intégration S3 fetch | Tests E2E |
| **J6** | Polish + exemples démo | Documentation |

### Production (2-3 semaines après POC)

- Semaine 1: Auth Cognito + sessions persistantes
- Semaine 2: Aurora Serverless + CloudFront CDN
- Semaine 3: ECS/Lambda + monitoring CloudWatch

---

## ❓ Questions Ouvertes

### POC
- [x] Upload fichier ou BDD existante ? → **Upload fichier (CSV)**
- [x] Docker MCP ou AWS MCP ? → **AWS MCP (S3 + PostgreSQL)**
- [x] Coûts ? → **$100 crédits couvrent 5-6 mois**
- [ ] Région AWS ? (us-east-1 recommandé pour coûts)
- [ ] Nom du bucket S3 ?

### Production
- [ ] Multi-tenant avec Cognito ?
- [ ] Aurora Serverless v2 ?
- [ ] CloudFront pour les .jsx ?
- [ ] Monitoring/alertes ?

---

## 🔗 Ressources

- [AWS MCP Servers (awslabs)](https://github.com/awslabs/mcp)
- [Aurora PostgreSQL MCP](https://awslabs.github.io/mcp/servers/aurora-postgresql-mcp-server)
- [S3 MCP Server](https://github.com/aws-samples/sample-mcp-server-s3)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [react-live](https://github.com/FormidableLabs/react-live)
- [recharts](https://recharts.org/)
- [FastAPI](https://fastapi.tiangolo.com/)

---

## 📝 Notes de Dev

```
[Date] - Note
──────────────
- Compte AWS Free Tier créé ($100 crédits)
- Expiration: 27 Jul 2026
```