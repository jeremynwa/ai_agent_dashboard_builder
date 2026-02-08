$ErrorActionPreference = "Stop"

$STACK_NAME = "app-factory"
$REGION = "eu-north-1"
$PUBLISH_BUCKET = "ai-app-builder-sk-2026"
$S3_DEPLOY_BUCKET = "app-factory-deploy-artifacts"

Write-Host "=== App Factory - Lambda Deployment ===" -ForegroundColor Green

# ─── Check prerequisites ─────────────────────────────
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try { aws --version | Out-Null } catch { Write-Host "AWS CLI required" -ForegroundColor Red; exit 1 }
try { sam --version | Out-Null } catch { Write-Host "SAM CLI required" -ForegroundColor Red; exit 1 }
Write-Host "OK" -ForegroundColor Green

# ─── Load API key from backend/.env ───────────────────
if (-not $env:ANTHROPIC_API_KEY) {
    $envFile = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "backend") ".env"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match "ANTHROPIC_API_KEY" }
        if ($line) {
            $env:ANTHROPIC_API_KEY = ($line -replace "ANTHROPIC_API_KEY=", "").Trim()
            Write-Host "API key loaded from backend/.env" -ForegroundColor Green
        }
    }
    if (-not $env:ANTHROPIC_API_KEY) {
        $env:ANTHROPIC_API_KEY = Read-Host "Enter your ANTHROPIC_API_KEY"
    }
}

# ─── Upload rules to S3 ──────────────────────────────
$rulesDir = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "backend") "rules"
if (Test-Path $rulesDir) {
    Write-Host "Uploading rules to S3..." -ForegroundColor Yellow
    aws s3 sync $rulesDir "s3://$PUBLISH_BUCKET/rules/" --region $REGION
}

# ─── Build & Deploy ──────────────────────────────────
Write-Host "Building..." -ForegroundColor Yellow
sam build

Write-Host "Deploying..." -ForegroundColor Yellow
sam deploy `
    --stack-name $STACK_NAME `
    --region $REGION `
    --s3-bucket $S3_DEPLOY_BUCKET `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides `
        "AnthropicApiKey=$($env:ANTHROPIC_API_KEY)" `
        "PublishBucket=$PUBLISH_BUCKET" `
        "MyRegion=$REGION" `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

# ─── Show result ─────────────────────────────────────
$API_URL = aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --region $REGION `
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' `
    --output text

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "API URL: $API_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host '1. Create frontend/.env with: VITE_API_URL=<url above>'
Write-Host '2. Copy lambda-v2/api.js to frontend/src/services/api.js'
Write-Host '3. cd frontend && npm run dev'
