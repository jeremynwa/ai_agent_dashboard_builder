# App Factory — AI Dashboard Builder

An AI-powered dashboard generator and web app deployment tool. Upload your data (CSV/Excel) or connect a database, write a prompt, and an AI agent generates a complete React dashboard in real-time with live preview. Or upload an existing web app for AI review and deploy to GitLab automatically. Also features Google Maps review analysis and automation workflow building.

Built as an internal tool for SK consultants.

## Architecture

```
BROWSER
┌──────────────────────────────────────────────┐
│  React App (Factory UI — 2956 lines)         │
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
│  └─────────────┘    │ review-research/   │   │
│                     └────────────────────┘   │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Lambda Functions (12 total)             │ │
│  │  - generate        (Function URL, 600s) │ │
│  │  - publish         (API Gateway)        │ │
│  │  - rules           (API Gateway)        │ │
│  │  - db proxy        (Function URL)       │ │
│  │  - export          (Function URL, 120s) │ │
│  │  - intake          (API Gateway, 15s)   │ │
│  │  - review-code     (Function URL, 120s) │ │
│  │  - git-push        (Function URL, 30s)  │ │
│  │  - vm-request      (API Gateway, 60s)   │ │
│  │  - apps            (API Gateway, 15s)   │ │
│  │  - estimate-cost   (API Gateway, 5s)    │ │
│  │  - review-research (Function URL, 300s) │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ DynamoDB                                │ │
│  │  - AppRegistry (userId + appId)         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ API Gateway (HTTP)                      │ │
│  │ /prod/rules, /prod/publish,             │ │
│  │ /prod/db-schema, /prod/intake,          │ │
│  │ /prod/vm-request, /prod/apps,           │ │
│  │ /prod/estimate-cost                     │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
                │ GitLab API v4 (token)
┌───────────────┴──────────────────────────────┐
│  GitLab (git.simon-kucher.com)               │
│  - group: elevate-paris-apps (ID 1658)       │
│  - auto-create repos per deployed app        │
│  - auto-add team collaborators               │
└──────────────────────────────────────────────┘
```

## Tech Stack

| Component  | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Frontend   | React 18 + Vite 7                                           |
| Preview    | @webcontainer/api (StackBlitz)                              |
| Charts     | Recharts                                                    |
| Animations | Motion.dev (motion/react)                                   |
| Auth       | AWS Cognito (amazon-cognito-identity-js)                    |
| Backend    | AWS Lambda (Node.js 20, SAM)                                |
| AI         | Claude Sonnet 4 + Anthropic Agent Skills beta (SDK 0.78.0)  |
| Storage    | S3 + DynamoDB                                               |
| Deploy     | SAM CLI + PowerShell script                                 |
| Export     | JSZip (zip) + Anthropic pre-built skills (XLSX, PPTX, PDF)  |
| Scraping   | Outscraper API (Google Maps reviews)                        |

## Navigation

The app has a two-level navigation:

1. **Landing** — Top choice: APP vs AUTOMATION
2. **App Hub** — Secondary choice: Build Idea (generate) / Upload App (review) / Review Research

**App views:** `landing → app-hub → factory | upload-review | review-research | my-apps | automation`

**5 app types in factory:** `dashboard` | `scraping` | `newsletter` | `reviewResearch` | `other`

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
  │ If error -> auto-fix (up to 3x)     │
  └──────────────┬──────────────────────┘
                 v
  Phase 3: QUALITY REVIEW (conditional)
  ┌─────────────────────────────────────┐
  │ dashboard-reviewer skill:           │
  │ check_code.py (15 static checks)    │
  │ + AI review (labels, formatting)    │
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

### Agent Skills (10 total)

The pipeline uses Anthropic Agent Skills (beta API) for modular, maintainable AI instructions.

| Skill | Skill ID | Purpose |
|-------|----------|---------|
| **dashboard-generator** | `skill_01RPpTMLicWFr96R3kLV3YDW` | Core generation rules (design system, pages, KPIs, charts, filters) |
| **data-analyzer** | `skill_01TJ4sKM6v5aWiBfUCpE7aaM` | Pre-analysis: Python scripts compute stats, detect periods, suggest charts |
| **dashboard-reviewer** | `skill_01ABSnPFjpR2wUZuoKobc5vs` | Quality review: 15 static checks (`check_code.py`) + AI code review |
| **vision-analyzer** | `skill_0167k41XCVLbcSksQvPsqTfi` | Visual analysis: detects 12 common layout bugs from screenshots |
| **web-app-reviewer** | `skill_01NGUU66Q3PCWWX5RgAbD7bz` | General web app review: 15 static checks (XSS, secrets, eval, perf, a11y) |
| **scraper-generator** | `skill_015tnYwBrkp8e4sYevkvqsWX` | Generates Python web scraper code |
| **industry-finance** | `skill_01XhrMpqBzw5CoeqGp9dLYTy` | Finance sector KPIs (EBITDA, BFR, ROE, DSO...) |
| **industry-ecommerce** | `skill_01BdUH8nfrq5o3PhtL4jmrXv` | E-commerce sector KPIs (Panier moyen, Taux conversion, CAC...) |
| **industry-saas** | `skill_01KSiWWfDMqT619dvHe9bwLR` | SaaS sector KPIs (MRR, ARR, Churn rate, LTV/CAC...) |
| **industry-logistics** | `skill_01J4e3c46T3wrdtuRBRcRyGU` | Logistics sector KPIs (OTIF, Lead time, Taux de rupture...) |

### Two Prompt Modes

| Mode | Config | Description |
|------|--------|-------------|
| **Skill** (default) | `USE_BETA_API=true` + skill IDs set | Modular files uploaded to Anthropic platform. Edit rules without redeploy. |
| **Standard** (fallback) | `USE_BETA_API=false` | Monolithic SYSTEM_PROMPT in `index.mjs`. Safe fallback. |

## Features

- **Two-level navigation**: Landing (APP vs AUTOMATION) → App Hub (Build Idea / Upload App / Review Research)
- **AI Clarification**: Claude asks 2-3 targeted questions before generation to enrich the prompt
- **5 App types**: Dashboard (live preview), Scraping (Python code), Newsletter (code), Review Research, Other
- **Data sources**: CSV/Excel upload or PostgreSQL/MySQL connection
- **Live preview**: Generated dashboards render in-browser via WebContainer
- **Industry-specific**: Optional sector selector (Finance, E-commerce, SaaS, Logistics)
- **Upload & Review**: Drop a ZIP of your existing app → web-app-reviewer agents check security/quality → score ≥ 70 = approved
- **Deploy to GitLab**: Push to company GitLab group (elevate-paris-apps), auto-add collaborators, optional CI/CD YAML (.gitlab-ci.yml + azure-pipelines.yml)
- **VM Request**: Claude generates a VM spec → Teams notification → Service Desk ticket
- **My Apps**: Per-user history of all deployed apps with repo URL and ticket ID (DynamoDB)
- **Review Research**: Analyze Google Maps reviews for brands/competitors via Outscraper API + Claude scoring
- **Automation Builder**: Describe a process in natural language → Claude generates automation steps → edit and save as template
- **Multi-format export**: Download as XLSX, PPTX, or PDF via Anthropic pre-built skills
- **Source export**: Download source code as .zip (npm install && npm run dev)
- **Publish**: Build in WebContainer -> static site on S3
- **Cost estimation**: POST /estimate-cost returns token/cost prediction per phase (no Claude call)
- **Auth**: Cognito-based login with JWT on all endpoints
- **i18n**: FR/EN interface
- **Zero fabrication**: All dashboard values computed from real data, never invented

## Project Structure

```
ai_agent_dashboard_builder/
├── frontend/
│   ├── .env                          <- auto-generated by deploy.ps1
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                   <- main component (2956 lines) + all generation logic
│       ├── services/
│       │   ├── api.js                <- API client (JWT injection) + 20+ endpoint calls
│       │   ├── auth.js               <- Cognito auth service
│       │   ├── export.js             <- zip export
│       │   └── files-template.js     <- WebContainer template + ds.css
│       └── components/
│           ├── AuthProvider.jsx
│           ├── Login.jsx
│           ├── MatrixRain.jsx
│           ├── FileUpload.jsx
│           ├── DbConnect.jsx
│           ├── IntakeChat.jsx        <- AI routing chat (upload vs generate)
│           ├── ClarificationChat.jsx <- 2-3 AI questions before generation
│           ├── UploadCode.jsx        <- ZIP drop + file tree + review button
│           ├── ReviewResults.jsx     <- score badge + issues + apply fixes
│           ├── DeployForm.jsx        <- GitLab repo + VM request form
│           ├── MyApps.jsx            <- app history per user (DynamoDB)
│           ├── ReviewResearch.jsx    <- Google Maps review analysis (Outscraper)
│           ├── AutomationChat.jsx    <- natural language automation description
│           ├── AutomationBuilder.jsx <- step editor + save template
│           └── AutomationStep.jsx    <- individual step component
│
└── lambda-v2/
    ├── deploy.ps1                    <- deploy script (SAM + skills + .env)
    ├── template.yaml                 <- SAM infrastructure definition
    ├── package.json                  <- @anthropic-ai/sdk ^0.78.0
    ├── manage-skills.mjs             <- CLI: list/get/upload/delete skills
    ├── test-skill-generation.mjs     <- integration test (24 checks)
    ├── test-data-analyzer.mjs        <- data analyzer test (31 checks)
    ├── test-review-vision.mjs        <- review + vision test
    ├── shared/auth.mjs               <- JWT verification
    ├── generate/index.mjs            <- main Lambda (AI pipeline)
    ├── publish/index.mjs             <- S3 publish Lambda
    ├── rules/index.mjs               <- business rules Lambda
    ├── db/index.mjs                  <- database proxy Lambda
    ├── export/index.mjs              <- XLSX/PPTX/PDF export Lambda
    ├── intake/index.mjs              <- AI routing + clarify (POST /intake, 15s)
    ├── review-code/index.mjs         <- web-app-reviewer skill (Function URL, 120s)
    ├── git-push/index.mjs            <- GitLab API v4 + CI/CD YAML (Function URL, 30s)
    ├── vm-request/index.mjs          <- Claude VM spec + Teams webhook (POST /vm-request, 60s)
    ├── apps/index.mjs                <- DynamoDB AppRegistry CRUD (GET+POST /apps, 15s)
    ├── estimate-cost/index.mjs       <- token cost estimation, no Claude (POST /estimate-cost, 5s)
    ├── review-research/index.mjs     <- GMaps review analysis (Function URL, 300s)
    └── skills/                       <- 10 Agent Skills
        ├── dashboard-generator/      <- 11 reference files + validate_output.py
        ├── data-analyzer/            <- 4 Python analysis scripts
        ├── dashboard-reviewer/       <- check_code.py (15 static checks)
        ├── vision-analyzer/          <- common-issues.md (12 visual patterns)
        ├── web-app-reviewer/         <- check_web_app.py (15 checks: XSS, secrets, eval, perf, a11y)
        ├── scraper-generator/        <- generates Python web scraper code
        ├── industry-finance/
        ├── industry-ecommerce/
        ├── industry-saas/
        └── industry-logistics/
```

## Prerequisites

- **AWS CLI** configured with `eu-north-1` region
- **SAM CLI** installed (or use AWS CloudShell — SAM is pre-installed)
- **Node.js 20+**
- **Anthropic API key** (`sk-ant-...`)
- **GitLab service account token** with `api` scope (for git-push Lambda)
- IAM user with: Lambda, S3, API Gateway, CloudFormation, Cognito, DynamoDB permissions
- **Outscraper API key** (optional, for Review Research / Google Maps scraping)

## Deploy

### Backend

```powershell
cd lambda-v2
.\deploy.ps1
```

The script:
1. Uploads business rules to S3
2. Runs `sam build` + `sam deploy`
3. Optionally uploads/updates all 10 Agent Skills
4. Fetches CloudFormation outputs (API URLs, Cognito IDs)
5. Auto-writes `frontend/.env` with all values
6. Optionally creates a first Cognito user

First deploy is interactive — you'll be asked for stack name (`app-factory`), region, Anthropic API key, GitLab token, and Outscraper API key.

> **No SAM CLI locally?** Use [AWS CloudShell](https://console.aws.amazon.com/cloudshell/) — SAM CLI is pre-installed.

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
VITE_EXPORT_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_REVIEW_CODE_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_GIT_PUSH_URL=https://xxx.lambda-url.eu-north-1.on.aws/
VITE_REVIEW_RESEARCH_URL=https://xxx.lambda-url.eu-north-1.on.aws/
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
node manage-skills.mjs upload skills/dashboard-reviewer
node manage-skills.mjs upload skills/vision-analyzer
node manage-skills.mjs upload skills/web-app-reviewer
node manage-skills.mjs upload skills/scraper-generator
node manage-skills.mjs upload skills/industry-finance
node manage-skills.mjs upload skills/industry-ecommerce
node manage-skills.mjs upload skills/industry-saas
node manage-skills.mjs upload skills/industry-logistics

# Get skill details
node manage-skills.mjs get <skill-id>

# Delete a skill
node manage-skills.mjs delete <skill-id>
```

## User Flows

### Flow 1 — Generate Dashboard

```
Landing → App Hub → Factory
  → Select app type (dashboard/scraping/newsletter/other)
  → Enter prompt
  → AI clarification (optional 2-3 questions)
  → AI generation (5-phase pipeline)
  → Live preview
  → Export / Publish / Deploy
```

### Flow 2 — Upload & Review

```
Landing → App Hub → Upload & Review
  → Drop ZIP file
  → web-app-reviewer agents (15 checks, score 0-100)
  → score ≥ 70 = approved
  → Apply AI fixes (optional)
  → Deploy to GitLab + VM request
  → My Apps
```

### Flow 3 — Review Research (Google Maps)

```
Landing → App Hub → Review Research
  → Select industry (restaurant/hotel/saas/retail)
  → Add brands + competitors + location
  → Configure evaluation criteria
  → Choose source (Outscraper scrape OR file upload)
  → Start analysis job → poll status → view results
  → Scores per criterion + review highlights
```

### Flow 4 — Automation Builder

```
Landing → Automation
  → Describe process in natural language
  → Claude generates step-by-step automation workflow
  → Edit / reorder / customize steps
  → Save as reusable template
```

### GitLab + VM Deploy Flow

```
DeployForm
  → Enter GitLab project name + description
  → Toggle CI/CD YAML generation
  → git-push Lambda:
      - Create repo in elevate-paris-apps group
      - Push files in one commit
      - Add team collaborators as Developer
      - Inject .gitlab-ci.yml + azure-pipelines.yml (if toggled)
  → vm-request Lambda:
      - Claude generates Azure VM spec
      - Teams webhook notification (best-effort)
      - Service Desk ticket (best-effort)
  → apps Lambda → DynamoDB AppRegistry
  → My Apps view
```

### GitLab Config (template.yaml)

| Variable | Description |
|----------|-------------|
| `GITLAB_URL` | Root URL: `https://git.simon-kucher.com` |
| `GITLAB_TOKEN` | Service account token with `api` scope |
| `GITLAB_GROUP_ID` | Numeric group ID (e.g. `1658`) |
| `GITLAB_TEAM_MEMBERS` | Comma-separated usernames — auto-added as Developer |
| `TEAMS_WEBHOOK_URL` | Teams incoming webhook (optional) |
| `SERVICEDESK_URL` | Service Desk API endpoint (optional, deferred) |
| `WEB_APP_REVIEWER_SKILL_ID` | `skill_01NGUU66Q3PCWWX5RgAbD7bz` |
| `SCRAPER_SKILL_ID` | `skill_015tnYwBrkp8e4sYevkvqsWX` |
| `REVIEW_PASS_THRESHOLD` | Minimum score to allow deploy (default: `70`) |
| `APP_REGISTRY_TABLE` | DynamoDB table name (default: `AppRegistry`) |
| `OUTSCRAPER_API_KEY` | For Google Maps review scraping (optional) |

### CI/CD Generation

When the CI/CD toggle is checked in DeployForm, the git-push Lambda auto-generates:
- `.gitlab-ci.yml` — install → build → deploy to GitLab Pages
- `azure-pipelines.yml` — Node build → deploy to Azure Static Web Apps

Stack is detected from `package.json` dependencies: `next`, `nuxt`, `sveltekit`, `angular`, `vue`, `react`, `vite`.

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

## Export & Publish

| Action | What it does | Output |
|--------|-------------|--------|
| **Export Code** | Downloads source as .zip | `npm install && npm run dev` to continue dev |
| **Export XLSX/PPTX/PDF** | Anthropic pre-built skills generate the file | Auto-download via browser |
| **Publish** | Builds in WebContainer, uploads `dist/` to S3 | Static site URL |

- **Excel mode**: Published app contains a static data snapshot
- **DB mode**: Published app fetches live data on each page load ⚠️ credentials in JS bundle

## Cost Optimization

| Optimization | Savings | Risk |
|-------------|---------|------|
| Prompt caching (`cache_control: ephemeral`) | ~6% input cost | None |
| Haiku for review/vision/export phases | ~29% per phase | Low-Medium |
| Conditional review skip (simple prompts) | ~$0.15/generation | Low |
| Frontend data analysis caching | ~$0.02/iteration | None |
| `stripToAppOnly()` for review/vision | ~$0.01/call | None |
| `estimate-cost` Lambda pre-check | $0 (no Claude) | None |

Model per phase is configurable via env vars (`REVIEW_MODEL`, `VISION_MODEL`, `EXPORT_MODEL`). Default: Sonnet for generation, Haiku for secondary phases.

## API Reference

All endpoints require `Authorization: Bearer {JWT}` header.

### POST `{GENERATE_URL}` — Generate Dashboard

```json
{
  "prompt": "Dashboard des ventes avec KPIs et graphiques",
  "useRules": true,
  "excelData": { "headers": [], "data": [], "fullData": [], "fileName": "...", "totalRows": 100 },
  "existingCode": { "src/App.jsx": "..." },
  "dbContext": { "type": "postgresql", "schema": {} },
  "screenshot": "base64...",
  "industry": "finance",
  "appType": "dashboard",
  "cachedAnalysis": null
}
```

Response: `{ "files": { "src/App.jsx": "...", "src/data.js": "..." }, "_usage": {...}, "_analysisResult": {...} }`

### POST `{EXPORT_URL}` — Export File (XLSX/PPTX/PDF)

```json
{ "format": "xlsx", "data": [...], "title": "Mon Dashboard", "kpis": [], "chartDescriptions": [] }
```

Response: `{ "base64": "...", "filename": "Mon Dashboard.xlsx", "mimeType": "application/..." }`

### POST `{API_URL}/prod/intake` — Route User + Clarify

```json
{ "message": "I have a React app I want to deploy", "history": [], "mode": "routing|clarify" }
```

Response (routing): `{ "route": "upload|generate|clarify", "question": "...", "summary": "..." }`
Response (clarify): `{ "questions": ["Q1", "Q2", "Q3"] }`

### POST `{REVIEW_CODE_URL}` — Review Uploaded App

```json
{ "files": { "src/App.jsx": "...", "package.json": "..." }, "appName": "my-app", "stackHint": "react" }
```

Response: `{ "score": 82, "issues": [{ "severity": "high", "rule": "...", "message": "..." }], "fixedFiles": {}, "approved": true }`

### POST `{GIT_PUSH_URL}` — Push to GitLab

```json
{ "files": { "src/App.jsx": "..." }, "projectName": "dashboard-sales-q1", "description": "...", "generateCI": true }
```

Response: `{ "repoUrl": "https://git.simon-kucher.com/...", "projectId": 123, "collaboratorsAdded": ["user1"], "ciFilesAdded": [".gitlab-ci.yml"] }`

### POST `{API_URL}/prod/vm-request` — Request VM

```json
{ "appName": "dashboard-sales-q1", "repoUrl": "...", "stack": "react", "estimatedUsers": 20, "duration": "3 months" }
```

Response: `{ "ticketId": "INC0012345", "vmSpec": {...}, "teamsMessageSent": true }`

### GET `{API_URL}/prod/apps` — List My Apps

Response: `{ "apps": [{ "appId": "uuid", "appName": "...", "repoUrl": "...", "reviewScore": 82, "status": "deployed", "createdAt": "..." }] }`

### POST `{API_URL}/prod/apps` — Save App Record

```json
{ "appName": "dashboard-sales-q1", "source": "generated", "reviewScore": 82, "repoUrl": "...", "status": "deployed" }
```

### POST `{API_URL}/prod/estimate-cost` — Estimate Generation Cost

```json
{ "prompt": "...", "rowCount": 1000, "hasData": true, "industry": "finance", "dbMode": false }
```

Response: `{ "total": 0.42, "breakdown": { "generation": 0.30, "analysis": 0.05, "review": 0.04, "vision": 0.03 }, "currency": "USD" }`

### POST `{REVIEW_RESEARCH_URL}/start` — Start Review Research Job

```json
{
  "industry": "restaurant",
  "brands": ["Brand A", "Brand B"],
  "location": "Paris, France",
  "maxReviewsPerBrand": 100,
  "criteria": [{ "id": "food", "label": "Food quality", "question": "..." }],
  "scale": "1-100",
  "source": "scrape_gmaps"
}
```

Response: `{ "jobId": "uuid", "status": "started" }`

### GET `{REVIEW_RESEARCH_URL}/status/:jobId` — Check Job Status

Response: `{ "status": "running|completed|failed", "progress": 45 }`

### GET `{REVIEW_RESEARCH_URL}/results/:jobId` — Get Results

Response: `{ "reviews": [...], "scores": { "brandA": { "food": 78, "service": 82 } }, "analysis": "..." }`

### POST `{DB_PROXY_URL}` — Database Proxy

```json
{ "credentials": { "host": "...", "port": 5432, "user": "...", "password": "...", "database": "..." }, "sql": "SELECT * FROM table LIMIT 5" }
```

Response: `{ "rows": [...] }`

## Security

| Layer | Status |
|-------|--------|
| API calls | JWT (Cognito) on all endpoints |
| Published sites | Public URL, not indexed (internal use) |
| Excel data | Static snapshot in JS bundle — no risk |
| DB credentials | In JS bundle — readable via DevTools |
| DB proxy | Accepts arbitrary SQL — no query filtering |
| GitLab token | Stored in Lambda env via SAM param (Secrets Manager recommended) |

**Known risk**: In DB mode, published apps expose database credentials in the bundled JS. Acceptable for internal use only.

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
| GitLab slug collision | git-push Lambda adds timestamp suffix automatically |
| Data payload too large | `trimDataToFit()` binary search caps payload at 4.5MB |

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
| Lambda (other 11) | ~$0.01 |
| API Gateway | ~$1-3 |
| S3 | ~$1-5 |
| DynamoDB | ~$0 (PAY_PER_REQUEST, low traffic) |
| Claude API (generation) | ~$0.30-0.50/dashboard |
| Claude API (export) | ~$0.10-0.15/export |
| Claude API (review) | ~$0.05-0.10/review |
| Claude API (review research) | ~$0.10-0.50/job (depends on review count) |
| Outscraper API | ~$0.002/review scraped |