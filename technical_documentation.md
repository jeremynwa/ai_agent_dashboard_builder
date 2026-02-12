# Technical Documentation — App Factory

## 1. Overview

App Factory is an AI-powered dashboard generator. Users provide data (CSV/Excel or database connection) and a prompt describing the dashboard they want. An AI agent generates, compiles, reviews, and visually analyzes a complete React dashboard in real-time using WebContainers.

## 2. System Architecture

### 2.1 Frontend (React + Vite)

The frontend runs on `localhost:5173` during development. It consists of:

- **Factory UI** — The main interface where users input prompts, upload data, and view generated dashboards
- **WebContainer** — A browser-based Node.js environment (StackBlitz) that compiles and previews generated React code in real-time
- **Auth Layer** — Cognito-based authentication with JWT tokens

Key files:

- `App.jsx` (~1040 lines) — Main application component with auth wrapper, generation logic, and UI
- `services/api.js` — API client with JWT injection on all requests
- `services/auth.js` — Cognito authentication service
- `services/files-template.js` — Base file structure for WebContainer projects
- `components/AuthProvider.jsx` — React Context for auth state management
- `components/Login.jsx` — Login page with password change flow
- `components/MatrixRain.jsx` — Generation screen animation

### 2.2 Backend (AWS Lambda + SAM)

Four Lambda functions deployed via SAM (Serverless Application Model):

| Function         | Trigger                          | Timeout | Purpose                              |
| ---------------- | -------------------------------- | ------- | ------------------------------------ |
| GenerateFunction | Function URL (no API GW timeout) | 600s    | AI code generation + vision analysis |
| PublishFunction  | API Gateway                      | 30s     | Publish apps to S3                   |
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

The generate Lambda's system prompt defines:

1. **Rules** — JSON output format, no emojis, compile-safe code
2. **Structure** — Drawer navigation (hamburger menu), header with tabs, full-width content
3. **KPIs** — Rich cards with sparklines, CY vs PY comparison, variation badges, unique data per sparkline
4. **Layout** — CSS Grid, full width, auto-fit KPIs, 2-3 column charts
5. **Charts** — Min 3 types, CartesianGrid, labeled axes, tooltips, Cell colors for PieChart
6. **Key Takeaways** — 3-5 auto-calculated observations at bottom of Synopsis page
7. **Data Formatting** — `fmt()`, `fmtCur()`, `fmtPct()` utility functions mandatory
8. **Design System** — Navy/cyan palette with specific hex values for all components
9. **Code Safety** — Double braces `style={{}}`, template literals guidance

### 3.3 Data Injection

Two modes for data:

**Excel/CSV mode:**

- Frontend reads file → sends headers + sample (30 rows) + fullData to Lambda
- Lambda tells Claude to use `"__INJECT_DATA__"` placeholder in `src/data.js`
- Frontend replaces placeholder with actual `JSON.stringify(fullData)` before mounting

**Database mode:**

- Frontend connects via db proxy Lambda → gets schema + sample data
- Lambda tells Claude to use `queryDb()` with SQL queries
- Frontend replaces `"__DB_PROXY_URL__"` and `"__DB_CREDENTIALS__"` placeholders

## 4. Deployment

### 4.1 Prerequisites

- AWS CLI configured with `eu-north-1` region
- SAM CLI installed
- Node.js 20+
- IAM user with: Lambda, S3, API Gateway, CloudFormation, Cognito permissions

### 4.2 Deploy Script (deploy.ps1)

The PowerShell script:

1. Uploads business rules to S3 (`rules/` prefix)
2. Runs `sam build`
3. Runs `sam deploy` with parameters (API key, bucket, region)
4. Fetches CloudFormation outputs (API URL, Generate URL, DB Proxy URL, Cognito IDs)
5. Auto-writes `frontend/.env` with all values
6. Optionally creates first Cognito user

### 4.3 Environment Variables

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

## 5. Known Issues & Solutions

### 5.1 Cognito SDK + Vite

`amazon-cognito-identity-js` requires Node.js `global`. Fix in `vite.config.js`:

```js
define: {
  global: "globalThis";
}
```

### 5.2 SAM Build — Shared Code

SAM builds each Lambda from its own `CodeUri` directory. Shared files (like `auth.mjs`) must be copied into each function's folder. Import as `./auth.mjs`, not `../shared/auth.mjs`.

### 5.3 Double CORS Headers

Function URLs add CORS headers automatically via template.yaml config. Lambda code must NOT add CORS headers in response — only `Content-Type: application/json`.

### 5.4 Vision Phase Timeout

The vision phase (screenshot + Claude analysis) can take 100s+. Total pipeline can exceed 300s. Set GenerateFunction timeout to 600s in template.yaml.

### 5.5 WebContainer Missing Dependencies

If generated code uses Recharts but WebContainer doesn't have it, compilation fails. Ensure `files-template.js` includes all needed dependencies:

```js
dependencies: {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  recharts: "^2.12.0"
}
```

### 5.6 PieChart All Grey

Claude sometimes forgets `<Cell fill={color} />` in PieCharts. The system prompt explicitly requires Cell components with COLORS array.

### 5.7 Sparklines All Same Data

Each KPI sparkline must use a DIFFERENT data column. The system prompt now explicitly requires unique sparkData per KPI with different colors and gradient IDs.

## 6. API Reference

### 6.1 Generate App

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
  "screenshot": "base64..." // only for vision analysis
}

Response: { "files": { "src/App.jsx": "...", "src/data.js": "..." } }
```

### 6.2 Publish App

```
POST {API_URL}/prod/publish
Authorization: Bearer {JWT}
Content-Type: application/json

{ "files": {...}, "appName": "my-dashboard" }

Response: { "url": "https://ai-app-builder-sk-2026.s3.eu-north-1.amazonaws.com/apps/my-dashboard/index.html" }
```

### 6.3 Get Rules

```
GET {API_URL}/prod/rules
Authorization: Bearer {JWT}

Response: { "rule-name": { ...rule config... } }
```

### 6.4 Get DB Schema

```
POST {DB_PROXY_URL}
Authorization: Bearer {JWT}
Content-Type: application/json

{ "credentials": { "host": "...", "port": 5432, "user": "...", "password": "...", "database": "..." }, "sql": "SELECT * FROM table LIMIT 5" }

Response: { "rows": [...] }
```

## 7. Design System Reference

### Generated Dashboards (Navy/Cyan)

| Token           | Value   | Usage                         |
| --------------- | ------- | ----------------------------- |
| bg-base         | #0B1120 | Page background               |
| bg-card         | #111827 | Cards, drawer                 |
| bg-hover        | #1A2332 | Hover states                  |
| bg-header       | #0D1526 | Header, table alt rows        |
| border          | #1E293B | Card borders                  |
| text-primary    | #F1F5F9 | Headings, values              |
| text-secondary  | #94A3B8 | Descriptions                  |
| text-tertiary   | #64748B | Labels, axes                  |
| accent-cyan     | #06B6D4 | Primary charts, active states |
| accent-magenta  | #EC4899 | Secondary series              |
| accent-violet   | #8B5CF6 | Tertiary series               |
| accent-amber    | #F59E0B | Quaternary series             |
| status-positive | #10B981 | Growth, success               |
| status-negative | #EF4444 | Decline, error                |

### Factory UI (Current — Green)

| Token          | Value   | Usage                  |
| -------------- | ------- | ---------------------- |
| bg-base        | #0F0F12 | Page background        |
| bg-card        | #16161A | Cards, sidebar         |
| accent         | #00765F | Buttons, active states |
| text-primary   | #FFFFFF | Headings               |
| text-secondary | #A1A1AA | Descriptions           |
