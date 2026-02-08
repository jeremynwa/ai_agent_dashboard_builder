#!/bin/bash
set -e

echo "=== App Factory — Lambda Build & Deploy ==="
echo ""

# ─────────────────────────────────────────────
# Step 1: Copy shared utils into each Lambda
# ─────────────────────────────────────────────
echo "[1/4] Copying shared utils into Lambda functions..."

for fn in generate publish rules; do
  mkdir -p "lambda/$fn/shared"
  cp lambda/shared/utils.mjs "lambda/$fn/shared/utils.mjs"
  # Fix import path (from ../shared/ to ./shared/)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|from '../shared/utils.mjs'|from './shared/utils.mjs'|g" "lambda/$fn/index.mjs"
  else
    sed -i "s|from '../shared/utils.mjs'|from './shared/utils.mjs'|g" "lambda/$fn/index.mjs"
  fi
done

echo "  Done."

# ─────────────────────────────────────────────
# Step 2: Install dependencies per Lambda
# ─────────────────────────────────────────────
echo "[2/4] Installing dependencies..."

for fn in generate publish rules; do
  if [ -f "lambda/$fn/package.json" ]; then
    (cd "lambda/$fn" && npm install --production 2>/dev/null)
    echo "  $fn: installed"
  fi
done

# ─────────────────────────────────────────────
# Step 3: SAM Build
# ─────────────────────────────────────────────
echo "[3/4] Running SAM build..."
sam build

# ─────────────────────────────────────────────
# Step 4: SAM Deploy
# ─────────────────────────────────────────────
echo "[4/4] Deploying to AWS..."

# First time: use --guided for interactive setup
# After that: uses samconfig.toml automatically
if [ ! -f "samconfig.toml" ]; then
  echo ""
  echo "First deploy — running guided setup..."
  echo "When prompted for AnthropicApiKey, paste your key."
  echo ""
  sam deploy --guided
else
  sam deploy
fi

echo ""
echo "=== Deploy complete ==="
echo ""
echo "Run 'sam list stack-outputs --stack-name app-factory' to see your URLs."
