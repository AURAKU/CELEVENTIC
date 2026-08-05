#!/usr/bin/env bash
# Live-safe Celeventic deploy for Hostinger VPS (celeventic.com).
# Run ON the VPS inside /var/www/CELEVENTIC — never from a laptop without SSH.
#
# Usage:
#   bash scripts/deploy-vps.sh
#   bash scripts/deploy-vps.sh --skip-install
#
# Restarts ONLY pm2 process "celeventic" (+ optional video worker).
# Never touches Spark & Drive. Never runs: prisma migrate reset, prisma db push
# in the happy path, pm2 restart all, or force-push.
#
# Prefer scripts/deploy-production-sqlite.sh for full SQLite backup/rollback.
# This script mirrors that safety model with ERR trap + .next/DB restore.

set -euo pipefail

APP_DIR="${CELEVENTIC_APP_DIR:-/var/www/CELEVENTIC}"
APP_NAME="${APP_NAME:-celeventic}"
DB_PATH="${DB_PATH:-prisma/production.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/celeventic-deploy-backups}"
HEALTH_LOCAL="${HEALTH_LOCAL:-http://127.0.0.1:3001/api/health}"
HEALTH_PUBLIC="${HEALTH_PUBLIC:-https://www.celeventic.com/api/health}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
PREV_COMMIT=""
NEW_COMMIT=""
SKIP_INSTALL=0

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
  esac
done

log() { printf '[deploy-vps] %s\n' "$*"; }
die() { printf '[deploy-vps] ERROR: %s\n' "$*" >&2; exit 1; }

restore_on_failure() {
  local code=$?
  log "Failure detected (exit ${code}). Rolling back DB/.next and restarting ${APP_NAME}..."
  if [[ -f "${BACKUP_DIR}/production.db" ]]; then
    cp -a "${BACKUP_DIR}/production.db" "${APP_DIR}/${DB_PATH}"
    log "Restored SQLite from ${BACKUP_DIR}/production.db"
  fi
  if [[ -d "${BACKUP_DIR}/next-build" ]]; then
    rm -rf "${APP_DIR}/.next"
    cp -a "${BACKUP_DIR}/next-build" "${APP_DIR}/.next"
    log "Restored .next from ${BACKUP_DIR}/next-build"
  fi
  (
    cd "${APP_DIR}"
    pm2 restart "${APP_NAME}" --update-env || true
    pm2 save || true
  )
  log "Previous commit: ${PREV_COMMIT:-unknown}"
  log "Attempted commit: ${NEW_COMMIT:-unknown}"
  log "Backup directory: ${BACKUP_DIR}"
  exit "$code"
}

trap restore_on_failure ERR

command -v git >/dev/null || die "git missing"
command -v npm >/dev/null || die "npm missing"
command -v npx >/dev/null || die "npx missing"
command -v pm2 >/dev/null || die "pm2 missing"
command -v curl >/dev/null || die "curl missing"
command -v sqlite3 >/dev/null || die "sqlite3 missing"

cd "$APP_DIR"
[[ -f package.json ]] || die "package.json not found in ${APP_DIR}"

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
  die "Merge/rebase in progress — refuse deploy"
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  die "Tracked working tree is dirty. Commit/stash before deploy."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "main" ]] || die "Expected branch main, found ${BRANCH}"

PREV_COMMIT="$(git rev-parse HEAD)"
log "Current commit: ${PREV_COMMIT}"

mkdir -p "$BACKUP_DIR"
if [[ -f "$DB_PATH" ]]; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/production.db'"
  integrity="$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')"
  [[ "$integrity" == "ok" ]] || die "integrity_check failed: ${integrity}"
else
  log "WARNING: ${DB_PATH} not found — skipping DB backup"
fi
cp -a .env "${BACKUP_DIR}/.env" 2>/dev/null || true
if [[ -d .next ]]; then
  cp -a .next "${BACKUP_DIR}/next-build"
fi
log "Backups written to ${BACKUP_DIR}"

log "Fetching origin/main (fast-forward only)"
git fetch origin main
git pull --ff-only origin main
NEW_COMMIT="$(git rev-parse HEAD)"
log "HEAD: ${NEW_COMMIT} — $(git log -1 --pretty=%s)"

# Prefer Node 24 when nvm/fnm available; do not fail if already on 20+.
if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source "$(nvm --version >/dev/null 2>&1 && echo "${NVM_DIR:-$HOME/.nvm}/nvm.sh")" 2>/dev/null || true
  nvm use 24 2>/dev/null || nvm use 20 2>/dev/null || true
fi
log "Node: $(node -v)"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  log "npm ci --include=dev"
  npm ci --include=dev || npm install
fi

log "Prisma generate"
npx prisma generate

log "Stopping only ${APP_NAME} before migrate (Spark & Drive untouched)"
pm2 stop "$APP_NAME"

npx prisma migrate deploy
npx prisma migrate status

log "Building Next.js (previous .next already backed up)"
rm -rf .next
npm run build
[[ -f .next/BUILD_ID ]] || die ".next/BUILD_ID missing after build"
log "BUILD_ID=$(cat .next/BUILD_ID)"

log "Restarting only ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env
pm2 restart celeventic-video-worker --update-env 2>/dev/null || true
pm2 save

sleep 3
curl -fsS "$HEALTH_LOCAL" >/dev/null || die "Local health failed: ${HEALTH_LOCAL}"
curl -fsS "$HEALTH_PUBLIC" >/dev/null || log "Public health check failed (DNS/firewall?) — local passed"

log "Smoke: health + home"
curl -fsS -o /dev/null -w "live home %{http_code}\n" https://www.celeventic.com/ || true
curl -fsS -o /dev/null -w "live health %{http_code}\n" https://www.celeventic.com/api/health || true

trap - ERR
log "Deploy complete"
log "Previous: ${PREV_COMMIT}"
log "Deployed: ${NEW_COMMIT}"
log "Backup: ${BACKUP_DIR}"
pm2 logs "$APP_NAME" --lines 80 --nostream
pm2 status "$APP_NAME"
