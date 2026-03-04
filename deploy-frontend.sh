#!/usr/bin/env bash
# =============================================================================
# deploy-frontend.sh — Deploy Rayan frontend to Firebase Hosting
# Usage:
#   ./deploy-frontend.sh              # build + deploy
#   ./deploy-frontend.sh --skip-build # redeploy last dist/ (no re-build)
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT="rayan-memory"
SITE="rayan-memory"           # Firebase Hosting site name (matches .firebaserc)

SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

# ── Helpers ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERR]${NC}   $*"; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v node     &>/dev/null || error "node not found. Install Node.js first."
command -v npm      &>/dev/null || error "npm not found. Install Node.js first."
command -v firebase &>/dev/null || error "firebase CLI not found. Run: npm i -g firebase-tools"

# Change into the frontend directory no matter where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
info "Working directory: $(pwd)"

# ── Switch Environment for Production ─────────────────────────────────────────
if [[ "$SKIP_BUILD" == false && -f .env.local ]]; then
  info "Backing up .env.local..."
  cp .env.local .env.local.deploy_backup

  # Ensure we restore .env.local when the script exits (normal or error)
  cleanup() {
    if [[ -f .env.local.deploy_backup ]]; then
      info "Restoring .env.local to its original state..."
      mv .env.local.deploy_backup .env.local
    fi
  }
  trap cleanup EXIT

  info "Temporarily switching .env.local to production APIs..."
  # Comment out localhost
  sed 's|^VITE_API_URL=http://localhost|# VITE_API_URL=http://localhost|' .env.local > .tmp.env && mv .tmp.env .env.local
  sed 's|^VITE_WS_URL=ws://localhost|# VITE_WS_URL=ws://localhost|' .env.local > .tmp.env && mv .tmp.env .env.local
  
  # Uncomment Cloud Run URLs
  sed 's|^# *VITE_API_URL=https://|VITE_API_URL=https://|' .env.local > .tmp.env && mv .tmp.env .env.local
  sed 's|^# *VITE_WS_URL=wss://|VITE_WS_URL=wss://|' .env.local > .tmp.env && mv .tmp.env .env.local
fi

# ── Install dependencies (if node_modules is missing or stale) ────────────────
if [[ ! -d node_modules ]]; then
  info "node_modules not found — running npm install"
  npm install
fi

# ── Build ─────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  info "Building production bundle…"
  npm run build
  info "Build complete ✓  (output → dist/)"
else
  warn "--skip-build set; using existing dist/ folder"
  [[ -d dist ]] || error "dist/ directory not found — cannot skip build."
fi

# ── Deploy to Firebase Hosting ─────────────────────────────────────────────────
info "Deploying to Firebase Hosting (project: ${PROJECT})…"
firebase deploy \
  --only hosting \
  --project "${PROJECT}"

# ── Print the hosting URL ─────────────────────────────────────────────────────
HOSTING_URL="https://${SITE}.web.app"

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  Deployment successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "  Hosting URL  : ${HOSTING_URL}"
echo -e "  Alt URL      : https://${SITE}.firebaseapp.com"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
