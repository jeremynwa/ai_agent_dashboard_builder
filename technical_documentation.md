# Technical Documentation — App Factory

## 1. Overview

App Factory is an AI-powered platform for SK consultants. It covers four main scenarios:
1. **Dashboard generation** — Upload data (CSV/Excel or DB) + write a prompt → AI generates a full React dashboard with live preview
2. **App review & deploy** — Drop a ZIP of any web app → AI reviews security/quality → push to GitLab + request Azure VM
3. **Review Research** — Analyze Google Maps reviews for brands/competitors using Claude + Outscraper API
4. **Automation Builder** — Describe a process → Claude generates a step-by-step automation workflow

## 2. System Architecture

### 2.1 Frontend (React + Vite)

The frontend runs on Azure Static Web Apps in production. It consists of:

- **Factory UI** — Two-level navigation: Landing (APP vs AUTOMATION) → App Hub (Build Idea / Upload App / Review Research). Includes i18n (FR/EN), Motion.dev animations, suggestion chips.
- **WebContainer** — A browser-based Node.js environment (StackBlitz) that compiles and previews generated React code in real-time
- **Auth Layer** — Cognito-based authentication with JWT tokens

Key files:

- `App.jsx` — 2956-line main component: all navigation, generation logic, flows, and UI orchestration
- `services/api.js` — API client with JWT injection on all requests (20+ functions)
- `services/auth.js` — Cognito authentication service
- `services/files-template.js` — Base file structure for WebContainer projects (includes ds.css design system)
- `services/export.js` — Export source files as zip
- `components/AuthProvider.jsx` — React Context for auth state management
- `components/Login.jsx` — Login page with password change flow
- `components/MatrixRain.jsx` — Generation screen animation

**Navigation states (`appView`):**

| State | Description |
|-------|-------------|
| `landing` | Top-level: APP vs AUTOMATION |
| `app-hub` | Secondary: Build Idea / Upload App / Review Research |
| `factory` | Dashboard/scraping/newsletter generation |
| `upload-review` | ZIP upload + AI review |
| `review-research` | Google Maps review analysis |
| `my-apps` | DynamoDB app history |
| `automation` | Automation workflow builder |

**App types (in factory):** `dashboard` | `scraping` | `newsletter` | `reviewResearch` | `other`

### 2.2 Backend (AWS Lambda + SAM)

Twelve Lambda functions deployed via SAM (Serverless Application Model):

| Function | Trigger | Timeout | Purpose |
|----------|---------|---------|---------|
| GenerateFunction | Function URL (no API GW timeout) | 600s | AI code generation + vision analysis (Agent Skills beta) |
| PublishFunction | API Gateway | 30s | Publish built apps to S3 |
| RulesFunction | API Gateway | 30s | Load business rules from S3 |
| DbFunction | Function URL | 60s | Database proxy (PostgreSQL/MySQL) |
| ExportFunction | Function URL | 120s | Export dashboard data as XLSX/PPTX/PDF |
| IntakeFunction | API Gateway POST /intake | 15s | AI routing chat + clarification mode |
| ReviewCodeFunction | Function URL | 120s | Web app quality review (web-app-reviewer skill) |
| GitPushFunction | Function URL | 30s | Create GitLab repo + push files + add members |
| VmRequestFunction | API Gateway POST /vm-request | 60s | Generate VM spec + Teams notification |
| AppsFunction | API Gateway GET+POST /apps | 15s | DynamoDB app registry per user |
| EstimateCostFunction | API Gateway POST /estimate-cost | 5s | Token/cost estimation (no Claude call) |
| ReviewResearchFunction | Function URL | 300s | Google Maps review analysis via Outscraper + Claude |

### 2.3 Authentication (AWS Cognito)

- **Auth flows**: USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
- **Token expiration**: 60min access, 30 day refresh
- JWT verification in Lambda uses Web Crypto API against Cognito JWKS endpoint. JWKS is cached for 1 hour.

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
┌─── Phase 3: QUALITY REVIEW ┐  (conditional: skip if simple prompt)
│ dashboard-reviewer skill:    │
│ • check_code.py (15 static   │
│   checks: imports, PieChart, │
│   COLORS, emojis, IDs, etc.) │
│ • AI review: labels, spacing,│
│   formatting, compliance     │
│                              │
│ Fallback: standard prompt    │
│ If review breaks → revert    │
└───────────┬──────────────────┘
            ▼
┌─── Phase 4: VISION ANALYSIS ┐
│ html2canvas screenshot        │
│ → vision-analyzer skill:      │
│   common-issues.md reference  │
│ → Fixes layout, overlap,      │
│   readability issues           │
│                                │
│ Fallback: direct API call      │
│ If vision breaks → revert      │
└───────────┬────────────────────┘
            ▼
     Dashboard Ready
     (full-screen preview)
```

**Special cases:**
- `appType === 'scraping' | 'newsletter'` → code-only, no WebContainer preview, phases 2-4 skipped
- `appType === 'reviewResearch'` → routes to ReviewResearch component directly

### 3.2 System Prompt — Two Modes

The generate Lambda (`generate/index.mjs`) supports two modes controlled by `USE_BETA_API` and `DASHBOARD_SKILL_ID`.

#### Standard Mode (fallback, `USE_BETA_API=false`)

A monolithic ~2700 token `SYSTEM_PROMPT` string embedded in `index.mjs`. Safe fallback.

#### Skill Mode (`USE_BETA_API=true` + `DASHBOARD_SKILL_ID` set)

Uses the Anthropic Agent Skills beta API. The system prompt is replaced by a modular **dashboard-generator** skill.

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

1. JSON output format, no emojis, compile-safe code
2. Design system CSS classes (`className=""`) + inline styles for dynamic values. No Tailwind, no cn(), no clsx
3. Drawer navigation (hamburger menu), header with tabs, full-width content
4. Rich KPI cards with sparklines, unique colors per KPI, no invented data
5. **Zero fabricated data** — All values must be computed from real data
6. Page rules:
   - **Vue d'ensemble**: KPIs + charts + key takeaways
   - **Analyses / Rapports**: Min 2 Recharts + 1 table + mandatory filter bar (dynamic selects, useState + useMemo)
   - **Paramètres**: Enforced JSX template
7. Charts: Min 3 types, CartesianGrid, labeled axes, tooltips, Cell colors for PieChart
8. Key Takeaways: 3-5 auto-calculated observations from real data
9. Data Formatting: `fmt()`, `fmtCur()`, `fmtPct()` mandatory

### 3.3 Design System (ds.css)

Tailwind CSS doesn't work in WebContainer (PostCSS build fails, CDN blocked by COEP/COOP headers). Solution: a self-contained `ds.css` embedded in `files-template.js`.

**Contents:**
- CSS reset + base styles (Inter font, antialiased)
- CSS variables for all design tokens (--base, --card, --accent, etc.)
- ~120 utility classes (flex, grid, gap, padding, margin, colors, typography)
- ~15 component classes (card, kpi-card, app-header, drawer, tab-btn, insight-item, table-*, etc.)
- Responsive grid helpers + hover helpers + skeleton loading

### 3.4 Agent Skills (10 total)

All skills are uploaded to Anthropic's platform via the Skills API and managed via `manage-skills.mjs`.

#### dashboard-generator (`skill_01RPpTMLicWFr96R3kLV3YDW`)

```
skills/dashboard-generator/
├── SKILL.md                     ← Entry point (frontmatter + core rules + 7 critical rules)
├── references/
│   ├── design-system.md         ← CSS classes + component classes
│   ├── structure.md             ← Drawer, header, content-area JSX templates
│   ├── pages.md                 ← Page types (overview, analyses, settings)
│   ├── filters.md               ← Dynamic filter bar pattern
│   ├── kpis.md                  ← KPI cards, sparklines, zero fabrication rule
│   ├── charts.md                ← Recharts config, COLORS, PieChart Cell rule
│   ├── tables.md                ← Table structure, alternating rows
│   ├── formatting.md            ← fmt(), fmtCur(), fmtPct() definitions
│   ├── insights.md              ← Key takeaways (points clés)
│   ├── data-intelligence.md     ← BI rules: zero raw IDs, aggregation, Top 10-15 tables
│   ├── mode-excel.md            ← Excel mode: __INJECT_DATA__ placeholder
│   └── mode-database.md         ← DB mode: __DB_PROXY_URL__ + __DB_CREDENTIALS__
└── scripts/
    └── validate_output.py       ← JSON output validation script
```

#### data-analyzer (`skill_01TJ4sKM6v5aWiBfUCpE7aaM`)

Two-call strategy: Call 1 (data-analyzer → analysis JSON) → Call 2 (dashboard-generator + context injected).

```
skills/data-analyzer/
├── SKILL.md
├── scripts/
│   ├── analyze_columns.py          ← Column types (numeric, date, categorical, currency, %)
│   ├── detect_periods.py           ← Temporal columns, period type, comparability
│   ├── compute_stats.py            ← Min/max/mean/sum/quartiles + period values + variations
│   └── suggest_charts.py           ← Chart type recommendations
└── references/
    └── chart-selection-guide.md
```

- **Latency**: +10-15s per generation (analysis call maxTokens 8192)
- **Graceful degradation**: if `DATA_ANALYZER_SKILL_ID` is empty, `analyzeData()` returns null

#### dashboard-reviewer (`skill_01ABSnPFjpR2wUZuoKobc5vs`)

```
skills/dashboard-reviewer/
├── SKILL.md
├── scripts/
│   └── check_code.py           ← 15 static checks on App.jsx
└── references/
    └── checklist.md
```

**check_code.py** checks: React import, Recharts import, COLORS array, PieChart Cell, fmt functions, no emojis, no ds.css import, unique SVG gradient IDs, insights section, filter styling, no raw ID dataKeys, content-area class, drawer pattern, fabrication keywords.

#### vision-analyzer (`skill_0167k41XCVLbcSksQvPsqTfi`)

```
skills/vision-analyzer/
├── SKILL.md
└── references/
    └── common-issues.md         ← 12 common visual bug patterns + fixes
```

**common-issues.md** covers: overlapping elements, empty space, unreadable text, charts cut off, grey PieChart, misaligned KPIs, broken filter selects, invisible table headers, sparklines too large, content behind header, drawer issues, invisible tooltips.

#### web-app-reviewer (`skill_01NGUU66Q3PCWWX5RgAbD7bz`)

General-purpose code reviewer for any uploaded web app (not dashboard-specific):

```
skills/web-app-reviewer/
├── SKILL.md
├── scripts/
│   └── check_web_app.py             ← 15 static checks
└── references/
    └── web-quality-checklist.md
```

**check_web_app.py** checks: hardcoded secrets, eval(), innerHTML, dangerouslySetInnerHTML, document.write, console.log, debugger, alert, TODO comments, large files, missing React key props, XSS vectors.

**Output**: `{ score: 0-100, issues: [{severity, rule, file, line, message}], fixedFiles: {}, summary }`. Score ≥ 70 = approved for deployment.

#### scraper-generator (`skill_015tnYwBrkp8e4sYevkvqsWX`)

Generates Python web scraper code. Used when `appType === 'scraping'`.

#### Industry Skills (x4)

Four skills inject sector KPIs, vocabulary (French), and chart recommendations. Added dynamically to `skills[]` when user selects a sector.

| Industry | Skill ID | Key KPIs |
|----------|----------|----------|
| Finance | `skill_01XhrMpqBzw5CoeqGp9dLYTy` | EBITDA, Marge brute/nette, BFR, ROE, DSO |
| E-commerce | `skill_01BdUH8nfrq5o3PhtL4jmrXv` | Panier moyen, Taux de conversion, Abandon panier, CAC |
| SaaS | `skill_01KSiWWfDMqT619dvHe9bwLR` | MRR, ARR, Churn rate, LTV/CAC, NPS |
| Logistique | `skill_01J4e3c46T3wrdtuRBRcRyGU` | OTIF, Lead time, Taux de rupture, Couverture stock |

**Structure** (same for all 4): `SKILL.md` + `references/kpis.md` + `references/charts.md` + `references/vocabulary.md`

### 3.5 Skill Upload & Management

```bash
# CLI
node manage-skills.mjs list
node manage-skills.mjs upload skills/<name>    # auto-replaces if display_title already exists
node manage-skills.mjs get <skill-id>
node manage-skills.mjs delete <skill-id>
```

**Key constraints:**
- Filenames must include top-level dir prefix (e.g. `dashboard-generator/SKILL.md`)
- `display_title` must be unique — CLI auto-deletes old version before upload
- SDK version: `@anthropic-ai/sdk@^0.78.0`
- Betas required: `code-execution-2025-08-25` + `skills-2025-10-02`

### 3.6 Intake Routing + Clarification

**IntakeFunction** (`POST /intake`) routes users using Claude Haiku:

```json
// Mode: routing (default)
{ "message": "J'ai une app React à déployer", "history": [] }
→ { "route": "upload|generate|clarify", "question": "...", "summary": "..." }

// Mode: clarify
{ "message": "...", "mode": "clarify", "industry": "finance", "hasData": true }
→ { "questions": ["Q1 ?", "Q2 ?", "Q3 ?"] }
```

**ClarificationChat.jsx** component handles the clarify flow:
- Displays 2-3 AI-generated questions sequentially
- User answers each question
- `buildEnrichedPrompt()` appends Q&A to original prompt
- Skip button available to jump directly to generation

### 3.7 Web App Review Flow

```
User drops ZIP
       │
       ▼
UploadCode.jsx → POST {REVIEW_CODE_URL}
  { files: { path: content }, appName, stackHint }
       │
       ▼
ReviewCodeFunction
  → Detects stack (next/nuxt/svelte/angular/vue/react/vite)
  → web-app-reviewer skill: check_web_app.py + AI review
  → Returns: { score, issues, fixedFiles, approved }
       │
       ▼
ReviewResults.jsx
  → Score circle + severity breakdown
  → Issue list (first 5 shown, expandable)
  → "Apply AI Fixes" button → onApplyFixes(fixedFiles)
  → "Proceed to Deploy" (disabled if score < 70)
       │
       ▼
DeployForm.jsx (if approved)
```

### 3.8 GitLab + VM Deployment Flow

Three user workflows converge into a common deploy flow:

#### Workflow 1 — Generate & Deploy
```
Prompt + Data → Generate Dashboard → (optional Review) → Deploy button → GitLab + VM
```

#### Workflow 2 — Upload & Review
```
Drop ZIP → Parse files → web-app-reviewer skill → Score ≥ 70 → Deploy → GitLab + VM
```

#### Workflow 3 — My Apps
```
GET /apps → DynamoDB AppRegistry → list per user
```

#### GitLab Push (`git-push` Lambda)

Uses GitLab API v4 with a service account token (scope: `api`):

1. `POST /api/v4/projects` — create repo under group `elevate-paris-apps` (ID 1658)
2. `POST /api/v4/projects/:id/repository/commits` — push all files in one commit
3. `POST /api/v4/projects/:id/members` — add `GITLAB_TEAM_MEMBERS` as Developers
4. If `generateCI: true` — injects `.gitlab-ci.yml` + `azure-pipelines.yml` before commit

**CI/CD YAML** is stack-aware:
- `.gitlab-ci.yml` → builds with `npm ci + npm run build`, deploys to GitLab Pages
- `azure-pipelines.yml` → deploys to Azure Static Web Apps via `AzureStaticWebApp@0`
- Dist dirs: `next→out/`, `nuxt→.output/public`, `sveltekit→build/`, others→`dist/`
- Slug collision: appends timestamp suffix if project name taken

**Team members auto-added**: `antoinesauauvageSKE2, marwanlenenE2, jeremygarneauSKE2, victoradrienguillermSKE2`

#### VM Request (`vm-request` Lambda)

1. Claude Haiku generates a structured Azure VM spec (size, estimated monthly cost)
2. Sizing guide: B1ms (prototype), B2s (internal), D2s_v3 (team), D4s_v3 (production)
3. Teams webhook → `TEAMS_WEBHOOK_URL` (best-effort, non-fatal if missing)
4. Service Desk API → `SERVICEDESK_URL` (best-effort, deferred)

#### App Registry (`apps` Lambda + DynamoDB)

Table `AppRegistry` (PK: `userId` Cognito sub, SK: `appId` UUID):
```json
{
  "userId": "cognito-sub",
  "appId": "uuid",
  "appName": "dashboard-sales-q1",
  "createdAt": "ISO timestamp",
  "source": "generated|uploaded",
  "reviewScore": 82,
  "repoUrl": "https://git.simon-kucher.com/...",
  "webUrl": null,
  "ticketId": "INC0012345",
  "stack": "react",
  "status": "deployed|pending|failed",
  "requester": "user@email.com",
  "vmSpec": { "vmSize": "Standard_B2s", "estimatedMonthlyCost": "~$35" },
  "collaboratorsAdded": ["user1", "user2"]
}
```

### 3.9 Review Research Flow

Google Maps review analysis using Outscraper API + Claude:

```
ReviewResearch.jsx
  Step 1 (Scope): industry, brands, competitors, location, maxReviews
  Step 2 (Criteria): select/customize evaluation criteria per industry
  Step 3 (Source): scrape GMaps via Outscraper OR upload CSV/Excel
  Step 4 (Confirm): review config + cost estimate
       │
       ▼
POST {REVIEW_RESEARCH_URL}/start
  → { jobId }
       │
       ▼
Poll GET {REVIEW_RESEARCH_URL}/status/:jobId
  → { status: "running|completed|failed", progress: 0-100 }
       │
       ▼
GET {REVIEW_RESEARCH_URL}/results/:jobId
  → { reviews: [...], scores: { brand: { criterion: score } }, analysis: "..." }
```

**ReviewResearchFunction architecture:**
- **Async job-based**: jobs stored as JSON in S3 (`review-research/jobs/<jobId>.json`)
- **Outscraper integration**: fetches Google Maps reviews via external API
- **Claude analysis**: evaluates each review against custom criteria (1-100, 1-10, 1-5, or binary scale)
- **Prevents fabrication**: only scores on actual review text
- **Industries**: restaurant, hotel, saas, retail — each with preset criteria

**Env vars**: `OUTSCRAPER_API_KEY` (optional, SAM parameter), `REVIEW_RESEARCH_MODEL: claude-sonnet-4-20250514`

### 3.10 Automation Builder Flow

```
AutomationChat.jsx
  → User describes process in natural language
  → Searches existing templates OR generates new automation
  → POST {AUTOMATION_URL}/generate
       │
       ▼
AutomationBuilder.jsx
  → Display generated steps (label, action type, details)
  → Edit / reorder / add / remove steps
  → Save as template: POST {AUTOMATION_URL}/templates
       │
       ▼
Templates accessible via: GET {AUTOMATION_URL}/templates
```

### 3.11 Multi-Format Export (XLSX, PPTX, PDF)

Uses **Anthropic pre-built skills** (no custom skills needed):

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

// Extract file_id → download via Files API
const fileContent = await anthropic.beta.files.download(fileId, {
  betas: ['files-api-2025-04-14'],
});
```

| Format | Skill ID | MIME Type |
|--------|----------|-----------|
| XLSX | `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PPTX | `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| PDF | `pdf` | `application/pdf` |

- **Container pre-installed**: openpyxl, xlsxwriter, python-pptx, reportlab, pandas, numpy
- **Cost**: ~$0.10-0.15 per export | **Timeout**: 120s

### 3.12 Cost Estimation (estimate-cost Lambda)

Pure server-side calculation (no Claude call), returns breakdown per phase:

```json
{
  "total": 0.42,
  "breakdown": {
    "generation": 0.30,
    "analysis": 0.05,
    "review": 0.04,
    "vision": 0.03
  },
  "currency": "USD"
}
```

**Pricing used**: Sonnet (input $3/MTok, output $15/MTok, cached $0.30/MTok) | Haiku (input $0.80/MTok, output $4/MTok, cached $0.08/MTok)

### 3.13 Cost Optimization

#### Prompt Caching

System prompts sent with `cache_control: { type: 'ephemeral' }`. Cached tokens cost 90% less ($0.30/MTok vs $3/MTok). Cache lasts 5 minutes.

#### Configurable Model per Phase

```yaml
# template.yaml
REVIEW_MODEL: "claude-haiku-4-5-20251001"   # Quality review
VISION_MODEL: "claude-haiku-4-5-20251001"   # Screenshot analysis
EXPORT_MODEL: "claude-haiku-4-5-20251001"   # File generation
```

#### Conditional Review Skip

Automatically skipped if: prompt < 50 words AND dataset < 100 rows AND no DB mode.

#### Data Analysis Caching

Frontend caches `_analysisResult` + data hash. Same dataset = skip `analyzeData()` call.

#### Minimal Code for Review/Vision

`stripToAppOnly()` sends only `src/App.jsx` — saves ~500-1000 input tokens per call.

#### Data Payload Trimming

`trimDataToFit()` in api.js: binary search to limit payload to 4.5MB (Lambda Function URL hard limit 6MB).

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

### 3.14 Monitoring

All `callClaude()` calls log structured JSON to CloudWatch:

```json
{
  "event": "claude_call",
  "label": "generate",
  "model": "claude-sonnet-4-20250514",
  "skills": ["skill_01RPpTMLicWFr96R3kLV3YDW"],
  "input_tokens": 12345,
  "output_tokens": 6789,
  "cache_creation_input_tokens": 0,
  "cache_read_input_tokens": 11000,
  "elapsed_ms": 45230,
  "stop_reason": "end_turn"
}
```

**Labels**: `generate`, `data-analyze`, `review`, `vision`, `review-fallback`, `vision-fallback`

**Query via CloudWatch Logs Insights:**
```
filter event = "claude_call"
| stats avg(elapsed_ms) as avg_latency, sum(input_tokens) as total_input, sum(output_tokens) as total_output by label
```

### 3.15 Data Injection

**Excel/CSV mode:**
- Frontend reads file → sends headers + sample (30 rows) + fullData to Lambda
- Lambda tells Claude to use `"__INJECT_DATA__"` placeholder in `src/data.js`
- Frontend replaces placeholder with actual `JSON.stringify(fullData)` before mounting
- Published app contains a static snapshot

**Database mode:**
- Frontend connects via db proxy Lambda → gets schema + sample data
- Lambda tells Claude to use `queryDb()` with SQL queries
- Frontend replaces `"__DB_PROXY_URL__"` and `"__DB_CREDENTIALS__"` placeholders
- Published app makes live fetch() calls → data updates on each page load
- ⚠️ Security risk: DB credentials are in the bundled JS

## 4. Export vs Publish

### 4.1 Export (Source Code Zip)

Downloads a zip of the WebContainer source files:
- `package.json`, `vite.config.js`, `index.html`
- `src/App.jsx`, `src/ds.css`, `src/main.jsx`
- `src/data.js` (if Excel mode), `src/db.js` (if DB mode)

Recipient can `unzip → npm install → npm run dev` to continue development.

### 4.2 Publish (Static Site to S3)

1. Runs `npm run build` in WebContainer → creates `dist/` folder
2. Recursively reads `dist/` directory
3. Uses `flattenFiles()` helper to convert WebContainer file tree to flat `{ path: content }` map
4. Sends built files to `publishApp()` API → S3
5. Opens the published URL in a new tab

**URL**: `http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/{app-name}/`

## 5. Security

### 5.1 Current State

| Layer | Protection |
|-------|------------|
| API calls | JWT (Cognito) on all Lambda endpoints |
| Published sites | Public URL, not indexed (security by obscurity) |
| Excel data | Embedded in JS bundle — static snapshot, no risk |
| DB credentials | In JS bundle — readable via browser DevTools |
| DB proxy | Accepts arbitrary SQL — no query filtering |
| GitLab token | Lambda env var via SAM param (Secrets Manager recommended) |

### 5.2 Security Roadmap

| Priority | Action | Description |
|----------|--------|-------------|
| Short term | Warning on DB publish | Display warning when publishing in DB mode |
| Short term | Read-only DB user | Recommend/enforce read-only database user |
| Medium term | API key per app | Generate unique token at publish; proxy validates token |
| Medium term | Pre-defined queries | Published app calls named endpoints, not raw SQL |
| Long term | CloudFront + Auth | Published site behind Cognito login |

## 6. Deployment

### 6.1 Prerequisites

- AWS CLI configured with `eu-north-1` region
- SAM CLI installed (or AWS CloudShell)
- Node.js 20+
- IAM user with: Lambda, S3, API Gateway, CloudFormation, Cognito, DynamoDB permissions

### 6.2 Deploy Script (deploy.ps1)

1. Uploads business rules to S3 (`rules/` prefix)
2. Runs `sam build`
3. Runs `sam deploy` with parameters (API key, bucket, region, GitLab token, Outscraper API key)
4. Optionally uploads/updates all 10 Agent Skills via `manage-skills.mjs`
5. Fetches CloudFormation outputs (API URL, all Function URLs, Cognito IDs)
6. Auto-writes `frontend/.env` with all values
7. Optionally creates first Cognito user

### 6.3 Environment Variables

**Frontend (.env — auto-written by deploy.ps1):**

```
VITE_API_URL=https://xxx.execute-api.eu-north-1.amazonaws.com/prod
VITE_GENERATE_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_DB_PROXY_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_EXPORT_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_REVIEW_CODE_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_GIT_PUSH_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_REVIEW_RESEARCH_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_COGNITO_USER_POOL_ID=eu-north-1_xxx
VITE_COGNITO_CLIENT_ID=xxx
```

**Lambda (via SAM template):**

```
ANTHROPIC_API_KEY                 (SAM parameter, required)
RULES_BUCKET=ai-app-builder-sk-2026
PUBLISH_BUCKET=ai-app-builder-sk-2026
COGNITO_USER_POOL_ID              (from Cognito resource)
COGNITO_REGION=eu-north-1
MY_REGION=eu-north-1
USE_BETA_API="true"               ← Set "false" for standard prompt mode

# Agent Skills
DASHBOARD_SKILL_ID="skill_01RPpTMLicWFr96R3kLV3YDW"
DATA_ANALYZER_SKILL_ID="skill_01TJ4sKM6v5aWiBfUCpE7aaM"
INDUSTRY_FINANCE_SKILL_ID="skill_01XhrMpqBzw5CoeqGp9dLYTy"
INDUSTRY_ECOMMERCE_SKILL_ID="skill_01BdUH8nfrq5o3PhtL4jmrXv"
INDUSTRY_SAAS_SKILL_ID="skill_01KSiWWfDMqT619dvHe9bwLR"
INDUSTRY_LOGISTICS_SKILL_ID="skill_01J4e3c46T3wrdtuRBRcRyGU"
REVIEWER_SKILL_ID="skill_01ABSnPFjpR2wUZuoKobc5vs"
VISION_SKILL_ID="skill_0167k41XCVLbcSksQvPsqTfi"
WEB_APP_REVIEWER_SKILL_ID="skill_01NGUU66Q3PCWWX5RgAbD7bz"
SCRAPER_SKILL_ID="skill_015tnYwBrkp8e4sYevkvqsWX"

# Models (Haiku for test, Sonnet for prod)
REVIEW_MODEL="claude-haiku-4-5-20251001"
VISION_MODEL="claude-haiku-4-5-20251001"
EXPORT_MODEL="claude-haiku-4-5-20251001"
REVIEW_RESEARCH_MODEL="claude-sonnet-4-20250514"

# GitLab + VM deployment
GITLAB_URL="https://git.simon-kucher.com"
GITLAB_TOKEN                      (SAM parameter, scope: api)
GITLAB_GROUP_ID="1658"
GITLAB_TEAM_MEMBERS="antoinesauauvageSKE2, marwanlenenE2, jeremygarneauSKE2, victoradrienguillermSKE2"
TEAMS_WEBHOOK_URL=""              ← Teams incoming webhook (optional)
SERVICEDESK_URL=""                ← Service Desk API endpoint (deferred)
SERVICEDESK_TOKEN                 (SAM parameter, optional)
REVIEW_PASS_THRESHOLD="70"
APP_REGISTRY_TABLE="AppRegistry"

# Review Research
OUTSCRAPER_API_KEY                (SAM parameter, optional)
BUCKET_NAME=ai-app-builder-sk-2026
```

## 7. Frontend Components Reference

| Component | File | Props / Purpose |
|-----------|------|-----------------|
| AuthProvider | `AuthProvider.jsx` | React Context: `{ user, loading, logout }` |
| Login | `Login.jsx` | Sign in / Sign up + first-login password change |
| MatrixRain | `MatrixRain.jsx` | Animated generation screen |
| FileUpload | `FileUpload.jsx` | CSV/Excel drop → `{ fileName, headers, data, fullData, totalRows }` |
| DbConnect | `DbConnect.jsx` | DB credentials form → schema fetch |
| IntakeChat | `IntakeChat.jsx` | AI routing: upload \| generate \| clarify |
| ClarificationChat | `ClarificationChat.jsx` | 2-3 AI questions → `onComplete(enrichedPrompt)` |
| UploadCode | `UploadCode.jsx` | ZIP drop + file tree + Review button |
| ReviewResults | `ReviewResults.jsx` | Score circle + issues + Apply Fixes + Proceed to Deploy |
| DeployForm | `DeployForm.jsx` | GitLab project name + CI/CD toggle + VM form |
| MyApps | `MyApps.jsx` | Grid of AppCard from DynamoDB |
| ReviewResearch | `ReviewResearch.jsx` | 4-step wizard: scope → criteria → source → confirm → results |
| AutomationChat | `AutomationChat.jsx` | Natural language automation description |
| AutomationBuilder | `AutomationBuilder.jsx` | Step editor + reorder + save template |
| AutomationStep | `AutomationStep.jsx` | Individual step component |

## 8. Known Issues & Solutions

### 8.1 Cognito SDK + Vite

`amazon-cognito-identity-js` requires Node.js `global`. Fix in `vite.config.js`:
```js
define: { global: 'globalThis' }
```

### 8.2 SAM Build — Shared Code

SAM builds each Lambda from its own `CodeUri` directory. Shared files (like `auth.mjs`) must be copied into each function's folder. Import as `./auth.mjs`, not `../shared/auth.mjs`.

### 8.3 Double CORS Headers

Function URLs add CORS headers automatically via template.yaml config. Lambda code must NOT add CORS headers in response — only `Content-Type: application/json`.

### 8.4 Vision Phase Timeout

The vision phase (screenshot + Claude analysis) can take 100s+. Total pipeline can exceed 300s. GenerateFunction timeout set to 600s.

### 8.5 WebContainer Missing Dependencies

Ensure `files-template.js` includes all needed dependencies:
```js
dependencies: {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  recharts: "^2.12.0"
}
```

### 8.6 PieChart All Grey

Claude sometimes forgets `<Cell fill={color} />`. System prompt explicitly requires Cell components with COLORS array. dashboard-reviewer skill's `check_code.py` also catches this.

### 8.7 Tailwind CSS in WebContainer

Tailwind does NOT work in WebContainer:
- **PostCSS build**: Fails during npm install in the browser sandbox
- **CDN**: Blocked by WebContainer's COEP/COOP security headers

**Solution**: Self-contained `ds.css` embedded in `files-template.js`.

### 8.8 Invented Data

Two defenses:
1. **System prompt** — Explicitly forbids fabricated data
2. **Data analyzer skill** — Pre-analyzes data with Python to provide factual statistics

### 8.9 Data Payload Too Large

Lambda Function URLs have a 6MB hard limit. `trimDataToFit()` in `api.js` uses binary search to find the largest data slice that fits under 4.5MB.

### 8.10 Publish Blank Page

**Fixed.** handlePublish now runs `npm run build` in WebContainer and sends `dist/` files instead of source files.

## 9. API Reference

### 9.1 Generate App

```
POST {GENERATE_URL}
Authorization: Bearer {JWT}

{
  "prompt": "Dashboard des ventes avec KPIs",
  "useRules": true,
  "excelData": { "headers": [...], "data": [...], "fullData": [...], "fileName": "...", "totalRows": N },
  "existingCode": { "src/App.jsx": "..." },
  "dbContext": { "type": "postgresql", "schema": {...} },
  "screenshot": "base64...",
  "industry": "finance",
  "appType": "dashboard",
  "cachedAnalysis": null
}

Response: { "files": { "src/App.jsx": "...", "src/data.js": "..." }, "_usage": {...}, "_analysisResult": {...} }
```

### 9.2 Publish App

```
POST {API_URL}/prod/publish
Authorization: Bearer {JWT}

{ "files": { "index.html": "...", "assets/index-abc.js": "..." }, "appName": "my-dashboard" }

Response: { "url": "http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/my-dashboard/" }
```

### 9.3 Intake Routing + Clarify

```
POST {API_URL}/prod/intake
Authorization: Bearer {JWT}

// Routing mode (default)
{ "message": "J'ai une app React", "history": [] }
→ { "route": "upload|generate|clarify", "question": "...", "summary": "..." }

// Clarify mode
{ "message": "...", "mode": "clarify", "industry": "finance", "hasData": true }
→ { "questions": ["Q1 ?", "Q2 ?", "Q3 ?"] }
```

### 9.4 Review Code

```
POST {REVIEW_CODE_URL}
Authorization: Bearer {JWT}

{ "files": { "src/App.jsx": "...", "package.json": "..." }, "appName": "my-app", "stackHint": "react" }

Response: { "score": 82, "issues": [...], "fixedFiles": { "src/App.jsx": "..." }, "approved": true, "stack": "react" }
```

### 9.5 Push to GitLab

```
POST {GIT_PUSH_URL}
Authorization: Bearer {JWT}

{
  "files": { "src/App.jsx": "..." },
  "projectName": "dashboard-sales-q1",
  "description": "Analytics dashboard",
  "generateCI": true
}

Response: {
  "success": true,
  "repoUrl": "https://git.simon-kucher.com/elevate-paris-apps/dashboard-sales-q1.git",
  "webUrl": "https://git.simon-kucher.com/elevate-paris-apps/dashboard-sales-q1",
  "projectId": 123,
  "commitSha": "abc123",
  "collaboratorsAdded": ["user1", "user2"],
  "pendingCollaborators": [],
  "ciFilesAdded": [".gitlab-ci.yml", "azure-pipelines.yml"]
}
```

### 9.6 Request VM

```
POST {API_URL}/prod/vm-request
Authorization: Bearer {JWT}

{
  "appName": "dashboard-sales-q1",
  "repoUrl": "https://git.simon-kucher.com/...",
  "stack": "react",
  "estimatedUsers": 20,
  "justification": "Finance team analytics dashboard",
  "vmSize": "Standard_B2s",
  "duration": "3 months"
}

Response: { "ticketId": "INC0012345", "vmSpec": {...}, "teamsMessageSent": true, "ticketPayload": {...} }
```

### 9.7 Apps Registry

```
GET {API_URL}/prod/apps
Authorization: Bearer {JWT}
→ { "apps": [...sorted by createdAt DESC...] }

POST {API_URL}/prod/apps
Authorization: Bearer {JWT}
{ "appName": "...", "source": "generated|uploaded", "reviewScore": 82, "repoUrl": "...", "status": "deployed" }
→ { "appId": "uuid", ...payload }
```

### 9.8 Estimate Cost

```
POST {API_URL}/prod/estimate-cost
Authorization: Bearer {JWT}

{ "prompt": "Dashboard des ventes", "rowCount": 1000, "hasData": true, "industry": "finance", "dbMode": false }

Response: { "total": 0.42, "breakdown": { "generation": 0.30, "analysis": 0.05, "review": 0.04, "vision": 0.03 }, "currency": "USD" }
```

### 9.9 Review Research

```
POST {REVIEW_RESEARCH_URL}/start
{ "industry": "restaurant", "brands": ["A", "B"], "location": "Paris", "maxReviewsPerBrand": 100,
  "criteria": [{ "id": "food", "label": "Food quality", "question": "..." }], "scale": "1-100", "source": "scrape_gmaps" }
→ { "jobId": "uuid", "status": "started" }

GET {REVIEW_RESEARCH_URL}/status/:jobId
→ { "status": "running|completed|failed", "progress": 45 }

GET {REVIEW_RESEARCH_URL}/results/:jobId
→ { "reviews": [...], "scores": { "brandA": { "food": 78 } }, "analysis": "..." }

POST {REVIEW_RESEARCH_URL}/estimate
{ ...config... }
→ { "cost": 2.50, "breakdown": { "scraping": 0.50, "analysis": 2.00 } }
```

### 9.10 Export

```
POST {EXPORT_URL}
Authorization: Bearer {JWT}

{ "format": "pptx", "data": [...], "title": "Mon Dashboard", "kpis": [...], "chartDescriptions": [...] }

Response: { "base64": "...", "filename": "Mon Dashboard.pptx", "mimeType": "application/..." }
```

### 9.11 DB Proxy

```
POST {DB_PROXY_URL}
Authorization: Bearer {JWT}

{ "credentials": { "host": "...", "port": 5432, "user": "...", "password": "...", "database": "..." }, "sql": "SELECT * FROM table LIMIT 5" }

Response: { "rows": [...] }
```

⚠️ The proxy currently accepts arbitrary SQL with no filtering. See Security section.