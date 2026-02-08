# Lambda Migration — App Factory

## What Changed

| Before (Express) | After (Lambda) |
|---|---|
| Express server on localhost:3001 | 3 Lambda functions behind API Gateway |
| Rules loaded from filesystem | Rules embedded in shared module |
| Publish: npm build on server + aws s3 sync | Publish: build in WebContainer + upload via S3 SDK |
| No CDN | CloudFront in front of S3 + API Gateway |

## Architecture

```
Browser (WebContainer)
    │
    ├── POST /generate  ──→  API Gateway ──→ Lambda (Claude API)
    ├── POST /publish   ──→  API Gateway ──→ Lambda (S3 upload)
    └── GET  /rules     ──→  API Gateway ──→ Lambda (returns rules)
                                                │
                              CloudFront ←──── S3 (published apps)
```

## Prerequisites

1. **AWS CLI** configured (`aws configure`)
2. **SAM CLI** installed: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
3. **Node.js 20+**
4. Your **Anthropic API key**

## Deploy — Step by Step

### 1. Copy Lambda files into your project

```bash
# From your project root:
cp -r lambda-migration/lambda/ backend/lambda/
cp lambda-migration/template.yaml backend/template.yaml
cp lambda-migration/deploy.sh backend/deploy.sh
chmod +x backend/deploy.sh
```

### 2. Deploy to AWS

```bash
cd backend
./deploy.sh
```

First deploy is interactive (SAM guided). You'll be asked:
- **Stack name**: `app-factory`
- **Region**: `eu-north-1` (or your preferred)
- **AnthropicApiKey**: paste your `sk-ant-...` key
- **Stage**: `prod`
- Confirm everything else as default

### 3. Get your API URL

```bash
sam list stack-outputs --stack-name app-factory
```

Copy the `ApiUrl` value (looks like `https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod`).

### 4. Update frontend

```bash
# Copy the new api.js
cp lambda-migration/frontend-update/api.js frontend/src/services/api.js

# Create .env with your API URL
echo "VITE_API_URL=https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod" > frontend/.env
```

### 5. Update handlePublish in App.jsx

Replace the existing `handlePublish` function and add the `readDirFlat` helper.
See `frontend-update/handlePublish-update.js` for the exact code.

### 6. Test

```bash
cd frontend
npm run dev
```

## Local Dev (keep working)

Your Express backend still works locally. The frontend defaults to `localhost:3001` if `VITE_API_URL` is not set:
```bash
# Terminal 1
cd backend && npm start

# Terminal 2 (no .env needed for local)
cd frontend && npm run dev
```

## Costs (estimated)

| Service | Monthly |
|---|---|
| Lambda (generate) | ~$0-5 (depends on usage) |
| Lambda (publish/rules) | ~$0.01 |
| API Gateway | ~$1-3 |
| S3 | ~$1-5 |
| CloudFront | ~$1-2 |
| **Total** | **~$3-15/month** |

## File Structure

```
backend/
├── server.mjs              # Keep for local dev
├── template.yaml           # SAM infrastructure
├── deploy.sh               # Build + deploy script
├── lambda/
│   ├── shared/
│   │   └── utils.mjs       # Rules, JSX fixer, response helpers
│   ├── generate/
│   │   ├── index.mjs       # POST /generate handler
│   │   └── package.json
│   ├── publish/
│   │   ├── index.mjs       # POST /publish handler
│   │   └── package.json
│   └── rules/
│       ├── index.mjs       # GET /rules handler
│       └── package.json
└── rules/                  # Still used by local Express server
```

## Updating Rules

Rules are currently embedded in `lambda/shared/utils.mjs`. To update them:
1. Edit the `SK_DESIGN`, `APP_FACTORY`, or `EXAMPLE_RULES` objects in `utils.mjs`
2. Re-deploy: `cd backend && ./deploy.sh`

Future improvement: store rules in DynamoDB for dynamic updates.
