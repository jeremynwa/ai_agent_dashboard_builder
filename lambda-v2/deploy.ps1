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

# ─── Install npm dependencies in all Lambda directories ─
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
$lambdaDirs = Get-ChildItem -Path $PSScriptRoot -Directory | Where-Object {
    Test-Path (Join-Path $_.FullName "package.json")
}
foreach ($dir in $lambdaDirs) {
    Write-Host "  npm install in $($dir.Name)..." -ForegroundColor Cyan
    Push-Location $dir.FullName
    npm install --omit=dev 2>&1 | Out-Null
    Pop-Location
}
Write-Host "Dependencies installed." -ForegroundColor Green

# ─── Build & Deploy ──────────────────────────────────
Write-Host "Building..." -ForegroundColor Yellow
sam build

Write-Host "Deploying..." -ForegroundColor Yellow
# ─── Build parameter overrides (skip empty optional tokens) ───
$paramOverrides = @(
    "AnthropicApiKey=$($env:ANTHROPIC_API_KEY)",
    "PublishBucket=$PUBLISH_BUCKET",
    "MyRegion=$REGION"
)
if ($env:GITLAB_TOKEN)       { $paramOverrides += "GitLabToken=$($env:GITLAB_TOKEN)" }
if ($env:SERVICEDESK_TOKEN)  { $paramOverrides += "ServiceDeskToken=$($env:SERVICEDESK_TOKEN)" }
if ($env:OUTSCRAPER_API_KEY) { $paramOverrides += "OutscraperApiKey=$($env:OUTSCRAPER_API_KEY)" }

$samArgs = @(
    "deploy",
    "--stack-name", $STACK_NAME,
    "--region", $REGION,
    "--s3-bucket", $S3_DEPLOY_BUCKET,
    "--capabilities", "CAPABILITY_IAM",
    "--parameter-overrides"
) + $paramOverrides + @(
    "--no-confirm-changeset",
    "--no-fail-on-empty-changeset"
)
& sam @samArgs

# ─── Upload Agent Skills (optional) ──────────────────
$skillsUpload = Read-Host "Upload/update Agent Skills? (y/N)"
if ($skillsUpload -eq "y") {
    Write-Host "Uploading Agent Skills..." -ForegroundColor Yellow

    $skillDirs = @(
        "skills/dashboard-generator",
        "skills/data-analyzer",
        "skills/dashboard-reviewer",
        "skills/vision-analyzer",
        "skills/industry-finance",
        "skills/industry-ecommerce",
        "skills/industry-saas",
        "skills/industry-logistics",
        "skills/web-app-reviewer",
        "skills/scraper-generator"
    )

    foreach ($dir in $skillDirs) {
        $fullPath = Join-Path $PSScriptRoot $dir
        if (Test-Path (Join-Path $fullPath "SKILL.md")) {
            Write-Host "  Uploading $dir..." -ForegroundColor Cyan
            node manage-skills.mjs upload $dir
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  WARNING: Failed to upload $dir" -ForegroundColor Red
            }
        }
    }

    Write-Host "Skills upload complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "REMINDER: Update skill IDs in template.yaml if they changed, then redeploy." -ForegroundColor Yellow
}

# ─── Fetch all outputs ───────────────────────────────
Write-Host ""
Write-Host "Fetching stack outputs..." -ForegroundColor Yellow

$outputs = aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --region $REGION `
    --query 'Stacks[0].Outputs' `
    --output json | ConvertFrom-Json

$API_URL = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
$GENERATE_URL = ($outputs | Where-Object { $_.OutputKey -eq "GenerateUrl" }).OutputValue
$DB_PROXY_URL = ($outputs | Where-Object { $_.OutputKey -eq "DbProxyUrl" }).OutputValue
$EXPORT_URL = ($outputs | Where-Object { $_.OutputKey -eq "ExportUrl" }).OutputValue
$REVIEW_CODE_URL = ($outputs | Where-Object { $_.OutputKey -eq "ReviewCodeUrl" }).OutputValue
$GIT_PUSH_URL = ($outputs | Where-Object { $_.OutputKey -eq "GitPushUrl" }).OutputValue
$REVIEW_RESEARCH_URL = ($outputs | Where-Object { $_.OutputKey -eq "ReviewResearchUrl" }).OutputValue
$AUTOMATION_URL = ($outputs | Where-Object { $_.OutputKey -eq "AutomationUrl" }).OutputValue
$COGNITO_POOL_ID = ($outputs | Where-Object { $_.OutputKey -eq "CognitoUserPoolId" }).OutputValue
$COGNITO_CLIENT_ID = ($outputs | Where-Object { $_.OutputKey -eq "CognitoClientId" }).OutputValue

# ─── Write frontend/.env automatically ───────────────
$frontendEnv = Join-Path (Join-Path $PSScriptRoot "..") "frontend/.env"
$envContent = @"
VITE_API_URL=$API_URL
VITE_GENERATE_URL=$GENERATE_URL
VITE_DB_PROXY_URL=$DB_PROXY_URL
VITE_EXPORT_URL=$EXPORT_URL
VITE_REVIEW_CODE_URL=$REVIEW_CODE_URL
VITE_GIT_PUSH_URL=$GIT_PUSH_URL
VITE_REVIEW_RESEARCH_URL=$REVIEW_RESEARCH_URL
VITE_AUTOMATION_URL=$AUTOMATION_URL
VITE_COGNITO_USER_POOL_ID=$COGNITO_POOL_ID
VITE_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
"@
Set-Content -Path $frontendEnv -Value $envContent
Write-Host "frontend/.env written automatically" -ForegroundColor Green

# ─── Create first user (optional) ────────────────────
$createUser = Read-Host "Create a Cognito user now? (y/N)"
if ($createUser -eq "y") {
    $userEmail = Read-Host "Email"
    $tempPassword = Read-Host "Temporary password (min 8 chars, uppercase, number)"

    aws cognito-idp admin-create-user `
        --user-pool-id $COGNITO_POOL_ID `
        --username $userEmail `
        --temporary-password $tempPassword `
        --user-attributes Name=email,Value=$userEmail Name=email_verified,Value=true `
        --region $REGION

    Write-Host "User $userEmail created. Login with temp password, then set new one." -ForegroundColor Green
}

# ─── Show result ─────────────────────────────────────
Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "  API:         $API_URL"
Write-Host "  Generate:    $GENERATE_URL"
Write-Host "  DB Proxy:    $DB_PROXY_URL"
Write-Host "  Review Code: $REVIEW_CODE_URL"
Write-Host "  Git Push:    $GIT_PUSH_URL"
Write-Host ""
Write-Host "Next steps for GitLab integration:" -ForegroundColor Yellow
Write-Host "  Set GITLAB_URL, GITLAB_GROUP_ID, GITLAB_TEAM_MEMBERS in Lambda env vars"
Write-Host "  Set TEAMS_WEBHOOK_URL, SERVICEDESK_URL in Lambda env vars"
Write-Host ""
Write-Host "Cognito:" -ForegroundColor Cyan
Write-Host "  Pool ID:  $COGNITO_POOL_ID"
Write-Host "  Client:   $COGNITO_CLIENT_ID"
Write-Host ""
Write-Host "frontend/.env has been updated." -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  cd frontend && npm install amazon-cognito-identity-js && npm run dev"