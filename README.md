# App Factory — AI Dashboard Builder

An AI-powered dashboard generator. Upload your data (CSV/Excel) or connect a database, write a prompt, and an AI agent generates a complete React dashboard in real-time with live preview.

Built as an internal tool for generating professional analytics dashboards.

## Architecture

```
BROWSER
┌──────────────────────────────────────────────┐
│  React App (Factory UI)                      │
│  ┌────────────────────────────────────────┐  │
│  │  WebContainer (Node.js in browser)     │  │
│  │  - Vite build + hot reload             │  │
│  │  - Live preview of generated dashboard │  │
│  │  - npm install recharts                │  │
│  └────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────┘
                │ API calls (JWT)
┌───────────────┴──────────────────────────────┐
│  AWS (eu-north-1)                            │
│                                              │
│  ┌─────────────┐    ┌────────────────────┐   │
│  │ Cognito     │    │ S3                 │   │
│  │ User Pool   │    │ rules/             │   │
│  │ + Client    │    │ published apps/    │   │
│  └─────────────┘    └────────────────────┘   │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Lambda Functions                        │ │
│  │  - generate  (Function URL, 600s)       │ │
│  │  - publish   (API Gateway)              │ │
│  │  - rules     (API Gateway)              │ │
│  │  - db proxy  (Function URL)             │ │
│  │  - export    (API Gateway, 120s)        │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ API Gateway (HTTP)                      │ │
│  │ /prod/rules, /prod/publish,             │ │
│  │ /prod/db-schema, /prod/export           │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## Tech Stack

| Component  | Technology                                       |
| ---------- | ------------------------------------------------ |
| Frontend   | React 19 + Vite 7                                |
| Preview    | @webcontainer/api (StackBlitz)                   |
| Charts     | Recharts                                         |
| Animations | Motion.dev (motion/react)                        |
| Auth       | AWS Cognito (amazon-cognito-identity-js)         |
| Backend    | AWS Lambda (Node.js 20, SAM)                     |
| AI         | Claude Sonnet 4 + Anthropic Agent Skills (beta)  |
| Storage    | S3                                               |
| Deploy     | SAM CLI + PowerShell script                      |
| Export     | JSZip (zip) + Anthropic pre-built skills (XLSX, PPTX, PDF) |

## AI Agent Pipeline

The generation pipeline is a multi-phase process:

```
User Prompt + Data + Industry (optional)
        │
        v
  Phase 0: DATA ANALYSIS (optional)
  ┌─────────────────────────────────────┐
  │ data-analyzer skill                 │
  │ Python scripts: column types,       │
  │ periods, stats, chart suggestions   │
  │ -> analysis JSON                    │
  └──────────────┬──────────────────────┘
                 v
  Phase 1: GENERATION
  ┌─────────────────────────────────────┐
  │ Claude Sonnet 4 generates React     │
  │ code from prompt + data + analysis  │
  │ + business rules + industry skill   │
  └──────────────┬──────────────────────┘
                 v
  Phase 2: COMPILATION
  ┌─────────────────────────────────────┐
  │ WebContainer: mount files,          │
  │ npm install, npm run dev            │
  │ If error -> auto-fix (up to 3x)    │
  └──────────────┬──────────────────────┘
                 v
  Phase 3: QUALITY REVIEW (conditional)
  ┌─────────────────────────────────────┐
  │ dashboard-reviewer skill:           │
  │ check_code.py (15 static checks)   │
  │ + AI review (labels, formatting)   │
  │ Skipped if simple prompt            │
  └──────────────┬──────────────────────┘
                 v
  Phase 4: VISION ANALYSIS
  ┌─────────────────────────────────────┐
  │ html2canvas screenshot              │
  │ -> vision-analyzer skill detects    │
  │    layout/overlap/readability bugs  │
  │ -> fixes applied                    │
  └──────────────┬──────────────────────┘
                 v
          Dashboard Ready
```

### Agent Skills (8 total)

The pipeline uses Anthropic Agent Skills (beta API) for modular, maintainable AI instructions.

| Skill | Purpose |
|-------|---------|
| **dashboard-generator** | Core generation rules (design system, pages, KPIs, charts, filters) |
| **data-analyzer** | Pre-analysis: Python scripts compute stats, detect periods, suggest charts |
| **dashboard-reviewer** | Quality review: 15 static checks (`check_code.py`) + AI code review |
| **vision-analyzer** | Visual analysis: detects 12 common layout bugs from screenshots |
| **industry-finance** | Finance sector KPIs (EBITDA, BFR, ROE, DSO...) |
| **industry-ecommerce** | E-commerce sector KPIs (Panier moyen, Taux conversion, CAC...) |
| **industry-saas** | SaaS sector KPIs (MRR, ARR, Churn rate, LTV/CAC...) |
| **industry-logistics** | Logistics sector KPIs (OTIF, Lead time, Taux de rupture...) |

### Two Prompt Modes

| Mode | Config | Description |
|------|--------|-------------|
| **Skill** (default) | `USE_BETA_API=true` + skill IDs set | Modular files uploaded to Anthropic platform. Edit rules without redeploy. |
| **Standard** (fallback) | `USE_BETA_API=false` | Monolithic SYSTEM_PROMPT in `index.mjs`. Safe fallback. |

## Features

- **Data sources**: CSV/Excel upload or PostgreSQL/MySQL connection
- **Live preview**: Generated dashboards render in-browser via WebContainer
- **Industry-specific**: Optional sector selector (Finance, E-commerce, SaaS, Logistics)
- **Multi-format export**: Download as XLSX, PPTX, or PDF via Anthropic pre-built skills
- **Source export**: Download source code as .zip (npm install && npm run dev)
- **Publish**: Build in WebContainer -> static site on S3
- **Auth**: Cognito-based login with JWT on all endpoints
- **i18n**: FR/EN interface
- **Zero fabrication**: All dashboard values computed from real data, never invented

## Project Structure

```
ai_agent_dashboard_builder/
├── frontend/
│   ├── .env                         <- auto-generated by deploy.ps1
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                  <- main component + generation logic
│       ├── services/
│       │   ├── api.js               <- API client (JWT injection)
│       │   ├── auth.js              <- Cognito auth service
│       │   ├── export.js            <- zip export
│       │   └── files-template.js    <- WebContainer template + ds.css
│       └── components/
│           ├── AuthProvider.jsx
│           ├── Login.jsx
│           ├── MatrixRain.jsx
│           ├── FileUpload.jsx
│           └── DbConnect.jsx
│
└── lambda-v2/
    ├── deploy.ps1                   <- deploy script (SAM + skills + .env)
    ├── template.yaml                <- SAM infrastructure definition
    ├── manage-skills.mjs            <- CLI: list/get/upload/delete skills
    ├── test-skill-generation.mjs    <- integration test (24 checks)
    ├── test-data-analyzer.mjs       <- data analyzer test (31 checks)
    ├── test-review-vision.mjs       <- review + vision test
    ├── shared/auth.mjs              <- JWT verification
    ├── generate/index.mjs           <- main Lambda (AI pipeline)
    ├── publish/index.mjs            <- S3 publish Lambda
    ├── rules/index.mjs              <- business rules Lambda
    ├── db/index.mjs                 <- database proxy Lambda
    ├── export/index.mjs             <- XLSX/PPTX/PDF export Lambda
    └── skills/                      <- 8 Agent Skills
        ├── dashboard-generator/     <- 11 reference files + validate_output.py
        ├── data-analyzer/           <- 4 Python analysis scripts
        ├── dashboard-reviewer/      <- check_code.py (15 static checks)
        ├── vision-analyzer/         <- common-issues.md (12 visual patterns)
        ├── industry-finance/
        ├── industry-ecommerce/
        ├── industry-saas/
        └── industry-logistics/
```

## Prerequisites

- **AWS CLI** configured with `eu-north-1` region
- **SAM CLI** installed
- **Node.js 20+**
- **Anthropic API key** (`sk-ant-...`)
- IAM user with: Lambda, S3, API Gateway, CloudFormation, Cognito permissions

## Deploy

### Backend

```powershell
cd lambda-v2
.\deploy.ps1
```

The script:
1. Uploads business rules to S3
2. Runs `sam build` + `sam deploy`
3. Optionally uploads/updates all 8 Agent Skills
4. Fetches CloudFormation outputs (API URLs, Cognito IDs)
5. Auto-writes `frontend/.env` with all values
6. Optionally creates a first Cognito user

First deploy is interactive — you'll be asked for stack name (`app-factory`), region, and your Anthropic API key.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The `.env` file is auto-generated by `deploy.ps1`. It contains:

```
VITE_API_URL=https://xxx.execute-api.eu-north-1.amazonaws.com/prod
VITE_GENERATE_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_DB_PROXY_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_COGNITO_USER_POOL_ID=eu-north-1_xxx
VITE_COGNITO_CLIENT_ID=xxx
```

## Skills Management

```bash
cd lambda-v2

# List all uploaded skills
node manage-skills.mjs list

# Upload or update a skill (auto-replaces existing)
node manage-skills.mjs upload skills/dashboard-generator
node manage-skills.mjs upload skills/data-analyzer
node manage-skills.mjs upload skills/industry-finance
node manage-skills.mjs upload skills/industry-ecommerce
node manage-skills.mjs upload skills/industry-saas
node manage-skills.mjs upload skills/industry-logistics
node manage-skills.mjs upload skills/dashboard-reviewer
node manage-skills.mjs upload skills/vision-analyzer

# Get skill details
node manage-skills.mjs get <skill-id>

# Delete a skill
node manage-skills.mjs delete <skill-id>
```

## Testing

```bash
cd lambda-v2

# Verify beta API access
node test-beta.mjs

# Test dashboard generation (24 checks)
DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs

# Test data analysis pipeline (31 checks)
DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs

# Test review + vision skills
REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs
```

## Design System

Generated dashboards use a self-contained `ds.css` (no Tailwind, no CDN). Tailwind PostCSS doesn't build in WebContainer, and CDN is blocked by COEP/COOP headers.

**Palette:**

| Token | Color | Usage |
|-------|-------|-------|
| `--base` | `#0B1120` | Page background |
| `--card` | `#111827` | Cards, drawer |
| `--accent` | `#06B6D4` | Primary charts, active states |
| `--magenta` | `#EC4899` | Secondary series |
| `--violet` | `#8B5CF6` | Tertiary series |
| `--amber` | `#F59E0B` | Quaternary series |
| `--up` | `#10B981` | Growth, success |
| `--down` | `#EF4444` | Decline, error |

Styling uses `className=""` for design system patterns and `style={{}}` for dynamic values.

## Export & Publish

| Action | What it does | Output |
|--------|-------------|--------|
| **Export Code** | Downloads source as .zip | `npm install && npm run dev` to continue dev |
| **Export XLSX/PPTX/PDF** | Anthropic pre-built skills generate the file | Auto-download via browser |
| **Publish** | Builds in WebContainer, uploads `dist/` to S3 | Static site URL |

- **Excel mode**: Published app contains a static data snapshot
- **DB mode**: Published app fetches live data on each page load

## Cost Optimization

| Optimization | Savings | Risk |
|-------------|---------|------|
| Prompt caching (`cache_control: ephemeral`) | ~6% input cost | None |
| Haiku for review/vision/export phases | ~29% per phase | Low-Medium |
| Conditional review skip (simple prompts) | ~$0.15/generation | Low |
| Frontend data analysis caching | ~$0.02/iteration | None |
| `stripToAppOnly()` for review/vision | ~$0.01/call | None |

Model per phase is configurable via env vars (`REVIEW_MODEL`, `VISION_MODEL`, `EXPORT_MODEL`). Default: Sonnet for generation, Haiku for secondary phases.

## API Reference

### POST `{GENERATE_URL}` — Generate Dashboard

```json
{
  "prompt": "Dashboard des ventes avec KPIs et graphiques",
  "useRules": true,
  "excelData": { "headers": [], "data": [], "fullData": [], "fileName": "...", "totalRows": 100 },
  "existingCode": { "src/App.jsx": "..." },
  "dbContext": { "type": "postgresql", "schema": {} },
  "screenshot": "base64...",
  "industry": "finance"
}
```

Response: `{ "files": { "src/App.jsx": "...", "src/data.js": "..." } }`

### POST `{API_URL}/prod/publish` — Publish to S3

```json
{
  "files": { "index.html": "...", "assets/index-abc.js": "..." },
  "appName": "my-dashboard"
}
```

Response: `{ "url": "http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/my-dashboard/" }`

### GET `{API_URL}/prod/rules` — Business Rules

Response: `{ "rule-name": { ...rule config... } }`

### POST `{DB_PROXY_URL}` — Database Proxy

```json
{
  "credentials": { "host": "...", "port": 5432, "user": "...", "password": "...", "database": "..." },
  "sql": "SELECT * FROM table LIMIT 5"
}
```

Response: `{ "rows": [...] }`

### POST `{API_URL}/prod/export` — Export File

```json
{
  "format": "xlsx",
  "data": [{ "..." }],
  "title": "Mon Dashboard",
  "kpis": [],
  "chartDescriptions": []
}
```

Response: `{ "base64": "...", "filename": "Mon Dashboard.xlsx", "mimeType": "application/..." }`

All endpoints require `Authorization: Bearer {JWT}` header.

## Security

| Layer | Status |
|-------|--------|
| API calls | JWT (Cognito) on all endpoints |
| Published sites | Public URL, not indexed (internal use) |
| Excel data | Static snapshot in JS bundle — no risk |
| DB credentials | In JS bundle — readable via DevTools |
| DB proxy | Accepts arbitrary SQL — no query filtering |

**Known risk**: In DB mode, published apps expose database credentials in the bundled JS. Acceptable for internal use only.

**Planned mitigations**: Warning on DB publish, read-only DB user enforcement, API key per app, pre-defined queries, CloudFront + auth for published sites.

## Known Issues

| Issue | Solution |
|-------|----------|
| Cognito SDK requires `global` | `define: { global: 'globalThis' }` in vite.config.js |
| SAM shared code | `auth.mjs` copied into each Lambda folder |
| Function URL CORS | Headers set in template.yaml — Lambda must NOT add CORS headers |
| Vision phase timeout | GenerateFunction timeout set to 600s |
| PieChart renders grey | System prompt enforces `<Cell fill={color} />` + COLORS array |
| Tailwind in WebContainer | Self-contained ds.css instead (no PostCSS, no CDN) |
| Claude invents data | Zero-fabrication prompt rules + data-analyzer pre-analysis |
| Publish blank page | Fixed: sends built `dist/` files, not source files |

## Monitoring

All `callClaude()` calls log structured JSON to CloudWatch:

```json
{
  "event": "claude_call",
  "label": "generate",
  "model": "claude-sonnet-4-20250514",
  "skills": ["skill_01..."],
  "input_tokens": 12345,
  "output_tokens": 6789,
  "cache_read_input_tokens": 11000,
  "elapsed_ms": 45230,
  "stop_reason": "end_turn"
}
```

Query via CloudWatch Logs Insights:

```
filter event = "claude_call"
| stats avg(elapsed_ms) as avg_latency, sum(input_tokens) as total_input by label
```

## Estimated Costs

| Service | Monthly |
|---------|---------|
| Lambda (generate) | ~$0-5 |
| Lambda (other) | ~$0.01 |
| API Gateway | ~$1-3 |
| S3 | ~$1-5 |
| Claude API (generation) | ~$0.30-0.50/dashboard |
| Claude API (export) | ~$0.10-0.15/export |
