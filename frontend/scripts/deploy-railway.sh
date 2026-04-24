#!/usr/bin/env bash
# Deploy this Vite frontend to Railway from your machine.
#
# Prerequisites:
#   - Install CLI: https://docs.railway.com/develop/cli
#     (e.g. brew install railway  or  npm i -g @railway/cli)
#   - railway login
#   - From this directory (frontend): railway link
#     (pick the project and the service that uses this repo root / frontend)
#
# Usage:
#   ./scripts/deploy-railway.sh
#   npm run deploy:railway
#
# If the service is connected to GitHub, deployments also run on push;
# this script is for local build verification + CLI-triggered deploy.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "error: railway CLI not found. Install: https://docs.railway.com/develop/cli" >&2
  exit 1
fi

echo "==> Install dependencies (ci)"
npm ci

echo "==> Production build"
npm run build

echo "==> Deploy to Railway (linked service)"
# Uploads this directory and starts a deployment using railway.json
railway up --detach

echo "==> Done. Check status: railway logs  or  the Railway dashboard."
