#!/usr/bin/env bash
# =============================================================================
# deploy-backend.sh — Deploy Rayan backend to Cloud Run
# Usage:
#   ./deploy-backend.sh              # build + deploy
#   ./deploy-backend.sh --skip-build # redeploy last image (no re-build)
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT="rayan-memory"
REGION="us-central1"
SERVICE="rayan-backend"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

# ── Helpers ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR]${NC}   $*"; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v gcloud &>/dev/null || error "gcloud CLI not found. Install it first."
command -v docker  &>/dev/null || warn  "docker not found — using Cloud Build instead."

ACTIVE=$(gcloud config get-value project 2>/dev/null)
if [[ "$ACTIVE" != "$PROJECT" ]]; then
  info "Switching gcloud project to $PROJECT"
  gcloud config set project "$PROJECT"
fi

# Change into the backend directory no matter where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"
info "Working directory: $(pwd)"

# ── Read env vars from backend/.env to pass to Cloud Run ─────────────────────
parse_env_var() {
  # Strips comments, blank lines, and quotes; returns KEY=VALUE pairs
  grep -E '^[A-Z_]+=.' .env | grep -v '^#' | sed 's/#.*//' | sed 's/ *$//'
}

# Build --set-env-vars string (skip GOOGLE_APPLICATION_CREDENTIALS — handled via SA)
# Use @ as a separator so commas inside values (like CORS_ORIGINS) don't break gcloud
ENV_VARS=$(parse_env_var \
  | grep -v 'GOOGLE_APPLICATION_CREDENTIALS' \
  | grep -v 'DEBUG' \
  | grep -v '^PORT=' \
  | grep -v '^HOST=' \
  | awk -F= '{print $1"="$2}' \
  | paste -sd "@" -)

# ── Build ─────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  info "Submitting build to Cloud Build → ${IMAGE}"
  gcloud builds submit \
    --tag "${IMAGE}" \
    --project "${PROJECT}" \
    .
  info "Build complete ✓"
else
  warn "--skip-build set; using previously built image"
fi

# ── Deploy ────────────────────────────────────────────────────────────────────
info "Deploying ${SERVICE} to Cloud Run (${REGION})…"
gcloud run deploy "${SERVICE}" \
  --image                "${IMAGE}" \
  --region               "${REGION}" \
  --platform             managed \
  --allow-unauthenticated \
  --session-affinity \
  --memory               2Gi \
  --cpu                  2 \
  --timeout              300 \
  --concurrency          80 \
  --set-env-vars         "^@^DEBUG=false@${ENV_VARS}" \
  --service-account      "rayan-backend@rayan-memory.iam.gserviceaccount.com" \
  --project              "${PROJECT}"

# ── Print the service URL ─────────────────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --format "value(status.url)")

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  Deployment successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "  Service URL : ${SERVICE_URL}"
echo -e "  Health check: ${SERVICE_URL}/health"
echo -e "  API docs    : ${SERVICE_URL}/docs"
echo ""
echo -e "  Update frontend/.env.local:"
echo -e "    VITE_API_URL=${SERVICE_URL}"
echo -e "    VITE_WS_URL=${SERVICE_URL/https/wss}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
