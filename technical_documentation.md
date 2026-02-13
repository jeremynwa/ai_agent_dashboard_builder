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

Four Lambda functions deployed via SAM (Serverless Application Model):

| Function         | Trigger                          | Timeout | Purpose                              |
| ---------------- | -------------------------------- | ------- | ------------------------------------ |
| GenerateFunction | Function URL (no API GW timeout) | 600s    | AI code generation + vision analysis |
| PublishFunction  | API Gateway                      | 30s     | Publish built apps to S3             |
| RulesFunction    | API Gateway                      | 30s     | Load business rules from S3          |
| DbFunction       | Function URL                     | 60s     | Database proxy (PostgreSQL/MySQL)    |

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
User Prompt + Data
        │
        ▼
┌─── Phase 1: GENERATION ───┐
│ Claude Sonnet 4 generates  │
│ React code from prompt     │
│ + data + business rules    │
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

### 3.2 System Prompt Structure

The generate Lambda's system prompt (`generate/index.mjs`) defines:

1. **Rules** — JSON output format, no emojis, compile-safe code
2. **Styling** — Design system CSS classes (`className=""`) + inline styles for dynamic values. No Tailwind, no cn(), no clsx
3. **Structure** — Drawer navigation (hamburger menu), header with tabs, full-width content
4. **KPIs** — Rich cards with sparklines, unique colors per KPI, no invented data
5. **Zero fabricated data** — All values must be computed from real data. No fake "Previous", "Objective", or variation percentages if no comparable data exists in the dataset
6. **Page rules** :
   - **Vue d'ensemble** : KPIs + charts + key takeaways
   - **Analyses / Rapports** : Minimum 2 Recharts + 1 table + mandatory filter bar (dynamic selects from data columns, useState + useMemo for filtering)
   - **Paramètres** : Enforced JSX template (label + description left with gap-1, toggle/value right, data info grid 2 cols)
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

### 3.4 Data Injection

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

Claude tends to invent "Previous Year", "Objective", or variation percentages. The system prompt now explicitly forbids this — all values must be computed from real data.

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
  "screenshot": "base64..." // only for vision analysis with prompt "__VISION_ANALYZE__"
}

Response: { "files": { "src/App.jsx": "...", "src/data.js": "..." } }
```

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
