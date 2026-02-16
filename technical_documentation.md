# Technical Documentation — App Factory

## 1. Overview

App Factory is an AI-powered dashboard generator. Users provide data (CSV/Excel or database connection) and a prompt describing the dashboard they want. An AI agent generates, compiles, reviews, and visually analyzes a complete React dashboard in real-time using WebContainers.

## 2. System Architecture

### 2.1 Frontend (React + Vite)

The frontend runs on `localhost:5173` during development. It consists of:

- **Factory UI** — The main interface where users input prompts, upload data, and view generated dashboards. Includes i18n (FR/EN), Motion.dev animations, suggestion chips, collapsible data source panel.
- **WebContainer** — A browser-based Node.js environment (StackBlitz) that compiles and previews generated React code in real-time
- **Auth Layer** — Cognito-based authentication with JWT tokens

Key files:

- `App.jsx` — Main application component with auth wrapper, generation logic, and UI
- `services/api.js` — API client with JWT injection on all requests
- `services/auth.js` — Cognito authentication service
- `services/files-template.js` — Base file structure for WebContainer projects (includes ds.css design system)
- `services/export.js` — Export source files as zip
- `components/AuthProvider.jsx` — React Context for auth state management
- `components/Login.jsx` — Login page with password change flow
- `components/MatrixRain.jsx` — Generation screen animation

### 2.2 Backend (AWS Lambda + SAM)

Five Lambda functions deployed via SAM (Serverless Application Model):

| Function         | Trigger                          | Timeout | Purpose                              |
| ---------------- | -------------------------------- | ------- | ------------------------------------ |
| GenerateFunction | Function URL (no API GW timeout) | 600s    | AI code generation + vision analysis (supports Agent Skills beta) |
| PublishFunction  | API Gateway                      | 30s     | Publish built apps to S3             |
| RulesFunction    | API Gateway                      | 30s     | Load business rules from S3          |
| DbFunction       | Function URL                     | 60s     | Database proxy (PostgreSQL/MySQL)    |
| ExportFunction   | API Gateway                      | 120s    | Export dashboard data as XLSX/PPTX/PDF |

### 2.3 Authentication (AWS Cognito)

- **User Pool** : `eu-north-1_ydkpTfIdO`
- **App Client** : `76kjpidgqhtba39kjdj9epftj0` (no client secret)
- **Auth flows** : USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
- **Token expiration** : 60min access, 30 day refresh
- **Password policy** : min 8 chars, uppercase required, number required

JWT verification in Lambda uses Web Crypto API against Cognito JWKS endpoint. JWKS is cached for 1 hour.

## 3. AI Agent Pipeline

### 3.1 Generation Flow

```
User Prompt + Data + Industry (optional)
        │
        ▼
┌─── Phase 0: DATA ANALYSIS ──┐  (optional, if DATA_ANALYZER_SKILL_ID set)
│ data-analyzer skill           │
│ Python scripts: column types, │
│ periods, stats, chart recs    │
│ → analysis JSON context       │
└───────────┬───────────────────┘
            ▼
┌─── Phase 1: GENERATION ───┐
│ Claude Sonnet 4 generates  │
│ React code from prompt     │
│ + data + analysis context  │
│ + business rules           │
│ + industry skill (if set)  │
└───────────┬────────────────┘
            ▼
┌─── Phase 2: COMPILATION ──┐
│ WebContainer:              │
│ • Mount files              │
│ • npm install              │
│ • npm run dev              │
│ • Wait for server-ready    │
│                            │
│ If error → auto-fix (3x)   │
└───────────┬────────────────┘
            ▼
┌─── Phase 3: QUALITY REVIEW ┐
│ Claude reviews the code:    │
│ • Labels, legends, units    │
│ • Formatting, spacing       │
│ • Color system compliance   │
│ • Error handling            │
│                             │
│ If review breaks → revert   │
└───────────┬─────────────────┘
            ▼
┌─── Phase 4: VISION ANALYSIS ┐
│ html2canvas screenshot       │
│ → Claude analyzes rendering  │
│ → Fixes layout, overlap,     │
│   readability issues         │
│                              │
│ If vision breaks → revert    │
└───────────┬──────────────────┘
            ▼
     Dashboard Ready
     (full-screen preview)
```

### 3.2 System Prompt — Two Modes

The generate Lambda (`generate/index.mjs`) supports two modes for delivering the system prompt, controlled by `USE_BETA_API` and `DASHBOARD_SKILL_ID` environment variables.

#### Standard Mode (fallback, `USE_BETA_API=false`)

A monolithic ~2700 token `SYSTEM_PROMPT` string embedded in `index.mjs` defines all rules inline. This is the original approach and remains as a safe fallback.

#### Skill Mode (`USE_BETA_API=true` + `DASHBOARD_SKILL_ID` set)

Uses the Anthropic Agent Skills beta API. The system prompt is replaced by a modular **dashboard-generator** skill uploaded to Anthropic's platform. Claude reads skill files on-demand from a code execution container.

**How it works:**

1. A minimal system prompt (`"Use the dashboard-generator skill. MODE: Excel/Database."`) is sent instead of the full prompt
2. The skill ID is passed via `container.skills` in the beta API call
3. Claude reads the skill's `SKILL.md` (core rules) + reference files as needed
4. Claude returns JSON in its text response (explicitly instructed, not via container files)

**Benefits:**
- Edit prompt rules without Lambda redeployment (update skill files, re-upload)
- Modular: each concern (KPIs, charts, filters, etc.) in its own file
- Progressive loading: Claude only reads references it needs

**API call (skill mode):**
```javascript
const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16384,
  betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
  system: 'Use the dashboard-generator skill. MODE: Excel.',
  container: {
    skills: [{ type: 'custom', skill_id: DASHBOARD_SKILL_ID, version: 'latest' }],
  },
  tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
  messages: [{ role: 'user', content: userMessage }],
});
```

#### Prompt Rules (both modes)

1. **Rules** — JSON output format, no emojis, compile-safe code
2. **Styling** — Design system CSS classes (`className=""`) + inline styles for dynamic values. No Tailwind, no cn(), no clsx
3. **Structure** — Drawer navigation (hamburger menu), header with tabs, full-width content
4. **KPIs** — Rich cards with sparklines, unique colors per KPI, no invented data
5. **Zero fabricated data** — All values must be computed from real data. No fake "Previous", "Objective", or variation percentages if no comparable data exists in the dataset
6. **Page rules** :
   - **Vue d'ensemble** : KPIs + charts + key takeaways
   - **Analyses / Rapports** : Minimum 2 Recharts + 1 table + mandatory filter bar (dynamic selects from data columns, useState + useMemo for filtering)
   - **Parametres** : Enforced JSX template (label + description left with gap-1, toggle/value right, data info grid 2 cols)
7. **Charts** — Min 3 types, CartesianGrid, labeled axes, tooltips, Cell colors for PieChart
8. **Key Takeaways** — 3-5 auto-calculated observations, computed from real data, never invented
9. **Data Formatting** — `fmt()`, `fmtCur()`, `fmtPct()` utility functions mandatory

### 3.3 Design System (ds.css)

Tailwind CSS doesn't work in WebContainer (PostCSS build fails, CDN blocked by COEP/COOP headers). Solution: a self-contained `ds.css` file embedded in `files-template.js`.

**Contents:**

- CSS reset + base styles (Inter font, antialiased)
- CSS variables for all design tokens (--base, --card, --accent, etc.)
- ~120 utility classes (flex, grid, gap, padding, margin, colors, typography, etc.)
- ~15 component classes (card, kpi-card, app-header, drawer, tab-btn, insight-item, table-\*, etc.)
- Responsive grid helpers (grid-kpis with auto-fit, grid-charts-2, grid-charts-3 with media queries)
- Hover helpers, skeleton loading, pulse animations

**Imported in** `main.jsx` (not in App.jsx — Claude is instructed not to import it).

### 3.4 Agent Skills (Beta)

The dashboard-generator skill is an Anthropic Agent Skill that encapsulates all prompt rules in modular files. It lives in `lambda-v2/skills/dashboard-generator/` and is uploaded to Anthropic's platform via the Skills API.

#### Skill Structure

```
skills/dashboard-generator/
├── SKILL.md                     ← Entry point (frontmatter + core rules)
├── references/
│   ├── design-system.md         ← CSS classes + component classes
│   ├── structure.md             ← Drawer, header, content-area JSX templates
│   ├── pages.md                 ← Page types (overview, analyses, settings)
│   ├── filters.md               ← Dynamic filter bar pattern
│   ├── kpis.md                  ← KPI cards, sparklines, zero fabrication rule
│   ├── charts.md                ← Recharts config, COLORS, PieChart Cell rule
│   ├── tables.md                ← Table structure, alternating rows
│   ├── formatting.md            ← fmt(), fmtCur(), fmtPct() definitions
│   ├── insights.md              ← Key takeaways (points cles)
│   ├── mode-excel.md            ← Excel mode: __INJECT_DATA__ placeholder
│   └── mode-database.md         ← DB mode: __DB_PROXY_URL__ + __DB_CREDENTIALS__
└── scripts/
    └── validate_output.py       ← JSON output validation script
```

#### Loading Levels

- **Level 1 (always)**: SKILL.md frontmatter (`name`, `description`) — ~100 tokens
- **Level 2 (on trigger)**: SKILL.md body (core rules + pointers to references)
- **Level 3 (as needed)**: Reference files — Claude reads only what it needs via code execution

#### Management CLI

```bash
cd lambda-v2
node manage-skills.mjs list                              # List all skills
node manage-skills.mjs upload skills/dashboard-generator  # Upload/update skill
node manage-skills.mjs get skill_01XkRdUeca25kPFLF3DM4b2Y  # Get skill details
node manage-skills.mjs delete skill_01XkRdUeca25kPFLF3DM4b2Y  # Delete skill
```

#### Validation Script

```bash
python skills/dashboard-generator/scripts/validate_output.py output.json
```

Checks: valid JSON, App.jsx exists, React imports, no emojis, PieChart has Cell, COLORS defined, no ds.css import, unique gradient IDs, correct placeholders.

#### Key Implementation Notes

- **File upload format**: Files must include a top-level directory prefix (e.g., `dashboard-generator/SKILL.md`), matching the Python SDK convention
- **JSON output**: Claude must be explicitly told to return JSON as text, not write files to the container. The system prompt includes: `"CRITICAL OUTPUT FORMAT: Return your final answer as a JSON object directly in your text response"`
- **Betas required**: `code-execution-2025-08-25` + `skills-2025-10-02`
- **SDK version**: `@anthropic-ai/sdk@^0.74.0`
- **Current skill ID**: `skill_01XkRdUeca25kPFLF3DM4b2Y`

### 3.5 Data Analyzer Skill (Beta)

The data-analyzer skill pre-analyzes uploaded data using Python scripts in the code execution container **before** dashboard generation. This provides Claude with factual statistics and chart recommendations, eliminating data fabrication.

#### Two-Call Strategy

```
User uploads data
       │
       ▼
┌─── Call 1: DATA ANALYSIS ──────┐
│ data-analyzer skill             │
│ Python scripts run in container │
│ → Column types, periods, stats  │
│ → Chart recommendations         │
│ Returns: analysis JSON          │
└──────────┬──────────────────────┘
           ▼
┌─── Call 2: DASHBOARD GENERATION ┐
│ dashboard-generator skill        │
│ + analysis context injected      │
│ → Uses real stats for KPIs       │
│ → Follows chart recommendations  │
│ Returns: { files: {...} } JSON   │
└──────────────────────────────────┘
```

#### Skill Structure

```
skills/data-analyzer/
├── SKILL.md                        ← Instructions + output format
├── scripts/
│   ├── analyze_columns.py          ← Column types (numeric, date, categorical, currency, %)
│   ├── detect_periods.py           ← Temporal columns, period type, comparability
│   ├── compute_stats.py            ← Min/max/mean/sum/quartiles + period values + variations
│   └── suggest_charts.py           ← Chart type recommendations (AreaChart, BarChart, PieChart, etc.)
└── references/
    └── chart-selection-guide.md    ← When to use which chart type
```

#### Python Scripts Pipeline

Scripts execute sequentially, each writing results to `/tmp/`:

1. **analyze_columns.py** — Detects types per column: `numeric`, `categorical`, `date`, `currency`, `percentage`, `text`. Uses pandas type inference, regex for currency/percentage patterns, month name detection (FR+EN).

2. **detect_periods.py** — Finds temporal columns. Detects: month names (Janvier, January...), quarters (Q1-Q4, T1-T4), datetime parsing. Returns `hasPeriods`, `periodType` (monthly/quarterly/yearly/daily/weekly), `canCompare`.

3. **compute_stats.py** — For numeric columns: min, max, mean, median, sum, stddev, quartiles. If periods exist: per-period values (for sparklines) and variation %. For categorical columns: value counts (for PieChart data).

4. **suggest_charts.py** — Recommends chart types based on data shape:
   - Numeric + period → AreaChart/LineChart
   - Categorical + numeric → BarChart
   - Categorical ≤6 values → PieChart
   - Period + category + numeric → StackedBarChart

#### Lambda Integration (`analyzeData()`)

```javascript
async function analyzeData(dataContext) {
  if (!USE_BETA_API || !DATA_ANALYZER_SKILL_ID) return null;
  // Calls Claude with data-analyzer skill, maxTokens: 8192
  // Returns parsed analysis JSON or null on failure (graceful degradation)
}
```

The analysis result is injected into the generation user message:
```
DATA ANALYSIS (factual — computed by Python scripts, use these values):
{ "analysis": { "columns": [...], "periods": {...}, "stats": {...}, "chartRecommendations": [...] } }
IMPORTANT: Use the statistics and chart recommendations above. Do NOT invent values.
```

#### Key Details

- **Skill ID**: `skill_01DAnrjyQM5eAJYiCvhMK7Du`
- **Latency**: +10-15s per generation (analysis call uses maxTokens 8192)
- **Graceful degradation**: If `DATA_ANALYZER_SKILL_ID` is empty, `analyzeData()` returns null — flow continues without pre-analysis
- **Rollback**: Set `DATA_ANALYZER_SKILL_ID: ""` in template.yaml

### 3.6 Industry Skills (x4)

Four industry-specific skills inject sector KPIs, vocabulary (French), and chart recommendations into dashboard generation. The user selects an industry via chips in the frontend; the corresponding skill is added dynamically to the `skills[]` array alongside `dashboard-generator`.

#### Skill IDs

| Industry | Skill ID | Key KPIs |
|----------|----------|----------|
| Finance/Comptabilité | `skill_013h9deHQb7CaA47xd59Uytd` | EBITDA, Marge brute/nette, BFR, ROE, ROA, DSO, DPO |
| E-commerce/Retail | `skill_014PUPgrYoGE8BRDwiDhZDMP` | Panier moyen, Taux de conversion, Abandon panier, CAC, Repeat purchase |
| SaaS/Tech | `skill_01Ekuh6H7ZKBkA2qzdXYzr1y` | MRR, ARR, Churn rate, LTV/CAC, NPS, ARPU, Trial conversion |
| Logistique/Supply Chain | `skill_011zy4TbPD7jcWEfiMKfi4jN` | OTIF, Lead time, Taux de rupture, Couverture stock, Taux de remplissage |

#### Skill Structure (same for all 4)

```
skills/industry-<name>/
├── SKILL.md              ← Frontmatter + sector context instructions
└── references/
    ├── kpis.md           ← KPI definitions, formulas, format, badge direction
    ├── charts.md         ← Recommended chart types for this sector
    └── vocabulary.md     ← Industry terminology (French labels)
```

#### Lambda Integration

In `generate/index.mjs`:

```javascript
const INDUSTRY_SKILL_IDS = {
  finance: process.env.INDUSTRY_FINANCE_SKILL_ID || null,
  ecommerce: process.env.INDUSTRY_ECOMMERCE_SKILL_ID || null,
  saas: process.env.INDUSTRY_SAAS_SKILL_ID || null,
  logistics: process.env.INDUSTRY_LOGISTICS_SKILL_ID || null,
};

// In skill mode, after pushing dashboard-generator:
if (industry && INDUSTRY_SKILL_IDS[industry]) {
  skills.push(INDUSTRY_SKILL_IDS[industry]);
  systemPrompt += ` INDUSTRY: ${industry} — see the industry skill references...`;
}
```

#### Frontend

Industry selector chips displayed between the prompt textarea and the data source row. 5 options: Généraliste (default, sends no industry), Finance, E-commerce, SaaS, Logistique. Selected chip highlighted in accent color (#06B6D4).

- **Rollback**: Set `INDUSTRY_*_SKILL_ID: ""` in template.yaml → no industry skill injected
- **Cost**: +$0.03-0.05 per generation (~2K extra context tokens)

### 3.7 Multi-Format Export (XLSX, PPTX, PDF)

The export feature generates professional XLSX, PPTX, or PDF files from dashboard data using **Anthropic pre-built skills** (no custom skills needed).

#### Architecture

```
Frontend (export button click)
       │
       ▼
POST /prod/export  (API Gateway, 120s timeout)
  { format: "pptx", data: [...], title: "Mon Dashboard", kpis: [...] }
       │
       ▼
Lambda export/index.mjs
  → Claude with pre-built skill (type: "anthropic", skill_id: "pptx")
  → Code execution generates file in container
  → Extract file_id from bash_code_execution_tool_result
  → Download via Files API (client.beta.files.download)
  → Return { base64, filename, mimeType }
       │
       ▼
Frontend
  → Decode base64 → Blob → URL.createObjectURL → auto-download
```

#### Pre-built Skills

| Format | Skill ID | MIME Type |
|--------|----------|-----------|
| XLSX | `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PPTX | `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| PDF | `pdf` | `application/pdf` |

#### API Call

```javascript
const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  betas: ['code-execution-2025-08-25', 'skills-2025-10-02', 'files-api-2025-04-14'],
  container: {
    skills: [{ type: 'anthropic', skill_id: 'pptx', version: 'latest' }],
  },
  tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
  messages: [{ role: 'user', content: prompt }],
});
```

#### File Retrieval

```javascript
// Extract file_id from response
function extractFileId(response) {
  for (const block of response.content) {
    if (block.type === 'bash_code_execution_tool_result') {
      const result = block.content;
      if (result.type === 'bash_code_execution_result' && result.content) {
        for (const item of result.content) {
          if (item.file_id) return item.file_id;
        }
      }
    }
  }
  return null;
}

// Download file
const fileContent = await anthropic.beta.files.download(fileId, {
  betas: ['files-api-2025-04-14'],
});
```

#### Key Details

- **Container pre-installed**: openpyxl, xlsxwriter, python-pptx, python-docx, reportlab, pypdf, pandas, numpy
- **Cost**: ~$0.10-0.15 per export
- **Timeout**: 120s (file generation typically takes 30-60s)
- **Payload limit**: API Gateway 10MB — sufficient for most exports

### 3.8 Cost Optimization

Several optimizations reduce API costs without impacting output quality:

#### Prompt Caching

System prompts are sent with `cache_control: { type: 'ephemeral' }`. Cached tokens cost 90% less on input ($0.30/MTok vs $3/MTok). The cache lasts 5 minutes, covering typical multi-call pipelines (data analysis → generation → review → vision).

#### Configurable Model per Phase

Three environment variables control which model is used for non-creative phases:

```yaml
# template.yaml
REVIEW_MODEL: "claude-haiku-4-5-20251001"   # Quality review (checklist verification)
VISION_MODEL: "claude-haiku-4-5-20251001"   # Screenshot analysis (visual corrections)
EXPORT_MODEL: "claude-haiku-4-5-20251001"   # File generation (XLSX/PPTX/PDF)
```

- **Current config (test)**: Haiku (`claude-haiku-4-5-20251001`) — configured in template.yaml for cost testing
- **Production**: Sonnet (`claude-sonnet-4-20250514`) — the default fallback when env vars are removed or changed back
- Toggle: Change in AWS Lambda console (immediate effect) or template.yaml (requires deploy)
- Main generation always uses Sonnet (creative code generation)

#### Conditional Review Skip

The review phase is automatically skipped for simple prompts:
- Prompt < 50 words AND dataset < 100 rows AND no DB mode
- Saves ~$0.02-0.15 per generation depending on model

#### Data Analysis Caching

The frontend caches the `_analysisResult` returned by the first generation call. Subsequent calls with the same dataset (same fileName + totalRows) reuse the cached analysis instead of calling the data-analyzer skill again. Cache is cleared when a new file is uploaded or a new DB is connected.

#### Minimal Code for Review/Vision

`stripToAppOnly()` sends only `src/App.jsx` (the only file that changes) instead of all source files. Saves ~500-1000 input tokens per review/vision call.

#### Cost Summary

| Optimization | Savings per pipeline | Risk |
|-------------|---------------------|------|
| Prompt caching | -$0.028 (-6%) | None |
| Haiku for review | -$0.124 (-29%) | Low |
| Haiku for vision | -$0.125 (-29%) | Medium |
| Haiku for export | -$0.025/export | Low |
| Analysis caching | -$0.020/iteration | None |
| Conditional review | -$0.145 (simple prompts) | Low |
| stripToAppOnly | -$0.01 (-2%) | None |

### 3.9 Data Injection

Two modes for data:

**Excel/CSV mode:**

- Frontend reads file → sends headers + sample (30 rows) + fullData to Lambda
- Lambda tells Claude to use `"__INJECT_DATA__"` placeholder in `src/data.js`
- Frontend replaces placeholder with actual `JSON.stringify(fullData)` before mounting
- Published app contains a static snapshot of the data (NOT live)

**Database mode:**

- Frontend connects via db proxy Lambda → gets schema + sample data
- Lambda tells Claude to use `queryDb()` with SQL queries
- Frontend replaces `"__DB_PROXY_URL__"` and `"__DB_CREDENTIALS__"` placeholders
- Published app makes live fetch() calls → data updates on each page load
- ⚠️ Security risk: DB credentials are in the bundled JS (see Section 5)

## 4. Export vs Publish

### 4.1 Export (Source Code Zip)

The Export button calls `exportToZip(files)` which downloads a zip of the WebContainer source files:

- `package.json`, `vite.config.js`, `index.html`
- `src/App.jsx`, `src/ds.css`, `src/main.jsx`
- `src/data.js` (if Excel mode), `src/db.js` (if DB mode)

The recipient can `unzip → npm install → npm run dev` to continue development.

### 4.2 Publish (Static Site to S3)

The Publish button:

1. Runs `npm run build` in WebContainer → creates `dist/` folder
2. Recursively reads `dist/` directory (index.html, assets/_.js, assets/_.css)
3. Uses `flattenFiles()` helper to convert WebContainer file tree to flat `{ path: content }` map
4. Sends built files to `publishApp()` API
5. Opens the published URL in a new tab

**S3 structure after publish:**

```
{app-name}/
  index.html          ← HTML with <script src="./assets/index-xxx.js">
  assets/
    index-abc123.js   ← Bundled JS (React + app code, minified)
    index-def456.css  ← Bundled CSS (ds.css compiled)
```

**URL:** `http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/{app-name}/`

**Previous bug (fixed):** handlePublish was sending source files (package.json, vite.config.js, src/) instead of built files, causing blank pages.

## 5. Security

### 5.1 Current State

| Layer           | Protection                                                  |
| --------------- | ----------------------------------------------------------- |
| API calls       | JWT (Cognito) on all Lambda endpoints                       |
| Published sites | Public URL, not indexed, not listed (security by obscurity) |
| Excel data      | Embedded in JS bundle — static snapshot, no risk            |
| DB credentials  | In JS bundle — readable via browser DevTools                |
| DB proxy        | Accepts arbitrary SQL — no query filtering                  |

### 5.2 Risk Assessment

**Internal use (dashboard for self/team):** Acceptable. The URL is only shared internally, not crawled by search engines.

**Client-facing use (dashboard built for a third party using their DB):** NOT secure. Anyone with the URL could extract DB credentials from the minified JS and execute arbitrary queries.

### 5.3 Security Roadmap

| Priority    | Action                | Description                                                                        |
| ----------- | --------------------- | ---------------------------------------------------------------------------------- |
| Short term  | Warning on DB publish | Display a warning when publishing an app in DB mode                                |
| Short term  | Read-only DB user     | Recommend/enforce a read-only database user                                        |
| Medium term | API key per app       | Generate unique token at publish; proxy validates token instead of raw credentials |
| Medium term | Pre-defined queries   | Published app calls named endpoints, not raw SQL                                   |
| Long term   | CloudFront + Auth     | Published site behind Cognito login                                                |
| Long term   | Auto-polling          | `setInterval(loadData, 30000)` for live DB dashboards                              |

## 6. Deployment

### 6.1 Prerequisites

- AWS CLI configured with `eu-north-1` region
- SAM CLI installed
- Node.js 20+
- IAM user with: Lambda, S3, API Gateway, CloudFormation, Cognito permissions

### 6.2 Deploy Script (deploy.ps1)

The PowerShell script:

1. Uploads business rules to S3 (`rules/` prefix)
2. Runs `sam build`
3. Runs `sam deploy` with parameters (API key, bucket, region)
4. Fetches CloudFormation outputs (API URL, Generate URL, DB Proxy URL, Cognito IDs)
5. Auto-writes `frontend/.env` with all values
6. Optionally creates first Cognito user

### 6.3 Environment Variables

**Frontend (.env):**

```
VITE_API_URL=https://xxx.execute-api.eu-north-1.amazonaws.com/prod
VITE_GENERATE_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_DB_PROXY_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_COGNITO_USER_POOL_ID=eu-north-1_xxx
VITE_COGNITO_CLIENT_ID=xxx
```

**Lambda (via SAM template):**

```
ANTHROPIC_API_KEY (parameter)
RULES_BUCKET=ai-app-builder-sk-2026
MY_REGION=eu-north-1
PUBLISH_BUCKET=ai-app-builder-sk-2026
COGNITO_USER_POOL_ID (from Cognito resource)
COGNITO_REGION=eu-north-1
USE_BETA_API="true"               ← Set "true" to enable Agent Skills mode
DASHBOARD_SKILL_ID="skill_01XkRdUeca25kPFLF3DM4b2Y"
DATA_ANALYZER_SKILL_ID="skill_01DAnrjyQM5eAJYiCvhMK7Du"
INDUSTRY_FINANCE_SKILL_ID="skill_013h9deHQb7CaA47xd59Uytd"
INDUSTRY_ECOMMERCE_SKILL_ID="skill_014PUPgrYoGE8BRDwiDhZDMP"
INDUSTRY_SAAS_SKILL_ID="skill_01Ekuh6H7ZKBkA2qzdXYzr1y"
INDUSTRY_LOGISTICS_SKILL_ID="skill_011zy4TbPD7jcWEfiMKfi4jN"
REVIEW_MODEL="claude-haiku-4-5-20251001"     ← TEST: Haiku for review (PROD: remove or set claude-sonnet-4-20250514)
VISION_MODEL="claude-haiku-4-5-20251001"     ← TEST: Haiku for vision (PROD: remove or set claude-sonnet-4-20250514)
EXPORT_MODEL="claude-haiku-4-5-20251001"     ← TEST: Haiku for export (PROD: remove or set claude-sonnet-4-20250514)
```

## 7. Known Issues & Solutions

### 7.1 Cognito SDK + Vite

`amazon-cognito-identity-js` requires Node.js `global`. Fix in `vite.config.js`:

```js
define: {
  global: "globalThis";
}
```

### 7.2 SAM Build — Shared Code

SAM builds each Lambda from its own `CodeUri` directory. Shared files (like `auth.mjs`) must be copied into each function's folder. Import as `./auth.mjs`, not `../shared/auth.mjs`.

### 7.3 Double CORS Headers

Function URLs add CORS headers automatically via template.yaml config. Lambda code must NOT add CORS headers in response — only `Content-Type: application/json`.

### 7.4 Vision Phase Timeout

The vision phase (screenshot + Claude analysis) can take 100s+. Total pipeline can exceed 300s. Set GenerateFunction timeout to 600s in template.yaml.

### 7.5 WebContainer Missing Dependencies

Ensure `files-template.js` includes all needed dependencies:

```js
dependencies: {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  recharts: "^2.12.0"
}
```

### 7.6 PieChart All Grey

Claude sometimes forgets `<Cell fill={color} />` in PieCharts. The system prompt explicitly requires Cell components with COLORS array.

### 7.7 Tailwind CSS in WebContainer

Tailwind does NOT work in WebContainer:

- **PostCSS build**: Fails during npm install/compilation in the browser sandbox
- **CDN (`cdn.tailwindcss.com`)**: Blocked by WebContainer's COEP/COOP security headers

**Solution**: Self-contained `ds.css` with utility classes and component classes. No build step, no external dependencies.

### 7.8 Invented Data / Fake Comparisons

Claude tends to invent "Previous Year", "Objective", or variation percentages. Two defenses:

1. **System prompt** — Explicitly forbids fabricated data (both standard and skill modes)
2. **Data analyzer skill** — Pre-analyzes data with Python scripts to provide factual statistics. The analysis context tells Claude exactly which columns have periods, what the real stats are, and which chart types are appropriate. This dramatically reduces fabrication.

### 7.9 Publish Blank Page

**Fixed.** handlePublish now runs `npm run build` in WebContainer and sends `dist/` files instead of source files.

## 8. API Reference

### 8.1 Generate App

```
POST {GENERATE_URL}
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "prompt": "Dashboard des ventes avec KPIs et graphiques",
  "useRules": true,
  "excelData": { "headers": [...], "data": [...], "fullData": [...], "fileName": "...", "totalRows": N },
  "existingCode": { "src/App.jsx": "..." },
  "dbContext": { "type": "postgresql", "schema": {...} },
  "screenshot": "base64...",
  "industry": "finance"  // optional: finance, ecommerce, saas, logistics
}

Response: { "files": { "src/App.jsx": "...", "src/data.js": "..." } }
```

When `USE_BETA_API=true` and `DATA_ANALYZER_SKILL_ID` is set, the Lambda makes two Claude API calls: first to analyze the data (data-analyzer skill), then to generate the dashboard (dashboard-generator skill with analysis context injected). If `industry` is provided, the corresponding industry skill is added to the skills array.

### 8.2 Publish App

```
POST {API_URL}/prod/publish
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "assets/index-abc123.js": "...",
    "assets/index-def456.css": "..."
  },
  "appName": "my-dashboard"
}

Response: { "url": "http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/my-dashboard/" }
```

Note: Files sent to publish must be the **built** output from `dist/`, not source files.

### 8.3 Get Rules

```
GET {API_URL}/prod/rules
Authorization: Bearer {JWT}

Response: { "rule-name": { ...rule config... } }
```

### 8.4 DB Proxy

```
POST {DB_PROXY_URL}
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "credentials": { "host": "...", "port": 5432, "user": "...", "password": "...", "database": "..." },
  "sql": "SELECT * FROM table LIMIT 5"
}

Response: { "rows": [...] }
```

⚠️ The proxy currently accepts arbitrary SQL with no filtering. See Security section for planned improvements.

### 8.5 Export (XLSX/PPTX/PDF)

```
POST {API_URL}/prod/export
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "format": "xlsx",              // xlsx, pptx, or pdf
  "data": [{ ... }, { ... }],   // dashboard data rows
  "title": "Mon Dashboard",     // export title
  "kpis": [...],                // optional: KPI definitions
  "chartDescriptions": [...]    // optional: chart descriptions
}

Response: {
  "base64": "UEsDBBQAAAA...",   // file content (base64-encoded)
  "filename": "Mon Dashboard.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
```

The frontend decodes base64 → Blob → `URL.createObjectURL` → triggers browser download.

## 9. Design System Reference

### 9.1 Generated Dashboards — ds.css

| Token          | Value   | CSS Variable    | Usage                         |
| -------------- | ------- | --------------- | ----------------------------- |
| bg-base        | #0B1120 | --base          | Page background               |
| bg-card        | #111827 | --card          | Cards, drawer                 |
| bg-card-hover  | #1A2332 | --card-hover    | Hover states, overlays        |
| bg-card-alt    | #0D1526 | --card-alt      | Header, table alt rows        |
| border         | #1E293B | --border        | Card borders                  |
| border-active  | #2A3A50 | --border-active | Active/hover borders          |
| text-primary   | #F1F5F9 | --text-1        | Headings, values              |
| text-secondary | #94A3B8 | --text-2        | Descriptions                  |
| text-tertiary  | #64748B | --text-3        | Labels, axes                  |
| accent         | #06B6D4 | --accent        | Primary charts, active states |
| magenta        | #EC4899 | --magenta       | Secondary series              |
| violet         | #8B5CF6 | --violet        | Tertiary series               |
| amber          | #F59E0B | --amber         | Quaternary series             |
| up             | #10B981 | --up            | Growth, success               |
| down           | #EF4444 | --down          | Decline, error                |

### 9.2 Component Classes

| Class                                              | Description                                       |
| -------------------------------------------------- | ------------------------------------------------- |
| `card`                                             | Standard card (bg-card, rounded-xl, border, p-24) |
| `kpi-card`                                         | KPI card (card + flex-col + gap-6)                |
| `kpi-label`                                        | KPI label (11px uppercase tertiary)               |
| `kpi-value`                                        | KPI value (28px bold primary)                     |
| `badge-up` / `badge-down`                          | Variation badges (green/red)                      |
| `section-title`                                    | Section heading (15px semibold mb-16)             |
| `app-header`                                       | Fixed header (60px, bg-card-alt)                  |
| `tab-btn` / `tab-btn-active`                       | Header tab buttons                                |
| `hamburger` / `hamburger-line`                     | Menu button                                       |
| `drawer` / `drawer-open` / `drawer-closed`         | Side panel                                        |
| `overlay`                                          | Dark overlay (fixed, bg black 50%)                |
| `content-area`                                     | Main content (padding + scroll)                   |
| `insight-item` / `insight-bar-*` / `insight-text`  | Key takeaways                                     |
| `table-header-cell` / `table-cell` / `table-row-*` | Table styling                                     |
| `grid-kpis`                                        | Auto-fit KPI grid (minmax 220px)                  |
| `grid-charts-2` / `grid-charts-3`                  | Responsive chart grids                            |
| `skeleton`                                         | Loading placeholder (pulse animation)             |

### 9.3 Factory UI

| Token          | Value   | Usage                  |
| -------------- | ------- | ---------------------- |
| bg-base        | #09090B | Page background        |
| bg-card        | #0F0F12 | Cards, sidebar         |
| accent         | #06B6D4 | Buttons, active states |
| text-primary   | #FAFAFA | Headings               |
| text-secondary | #A1A1AA | Descriptions           |
