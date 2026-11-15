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
SWAP_DONE=0

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
  esac
done

log() { printf '[deploy-vps] %s\n' "$*"; }
die() { printf '[deploy-vps] ERROR: %s\n' "$*" >&2; exit 1; }

restore_on_failure() {
  local code=$?
  log "Failure detected (exit ${code})."
  rm -rf "${APP_DIR}/.next-new" 2>/dev/null || true

  # If we already swapped in a build whose meta matches NEW_COMMIT, keep it.
  # Slow cold-start must not throw away a successful compile.
  local keep_new=0
  if [[ "${SWAP_DONE}" -eq 1 && -n "${NEW_COMMIT}" && -f "${APP_DIR}/.next/celeventic-build-meta.json" ]]; then
    if grep -q "${NEW_COMMIT:0:12}" "${APP_DIR}/.next/celeventic-build-meta.json" 2>/dev/null; then
      keep_new=1
      log "Keeping swapped .next (build meta matches ${NEW_COMMIT:0:12}). Not rolling back a good build."
    fi
  fi

  if [[ "$keep_new" -eq 0 ]]; then
    log "Rolling back DB/.next and restarting ${APP_NAME}..."
    if [[ -f "${BACKUP_DIR}/production.db" ]]; then
      cp -a "${BACKUP_DIR}/production.db" "${APP_DIR}/${DB_PATH}"
      log "Restored SQLite from ${BACKUP_DIR}/production.db"
    fi
    if [[ -d "${BACKUP_DIR}/next-build" ]]; then
      rm -rf "${APP_DIR}/.next"
      cp -a "${BACKUP_DIR}/next-build" "${APP_DIR}/.next"
      log "Restored .next from ${BACKUP_DIR}/next-build"
    fi
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

# Build while the old process still serves traffic so visitors do not sit on
# nginx 502 for the full Next compile window.
log "Building Next.js into .next-new (live app stays online)"
rm -rf .next-new
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
export CELEVENTIC_BUILD_COMMIT="$NEW_COMMIT"
export CELEVENTIC_BUILD_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export NEXT_DIST_DIR=.next-new
node scripts/write-build-meta.mjs
npm run build
NEXT_DIST_DIR=.next-new node scripts/write-build-meta.mjs --emit-next
[[ -f .next-new/BUILD_ID ]] || die ".next-new/BUILD_ID missing after build"
[[ -f .next-new/celeventic-build-meta.json ]] || die ".next-new/celeventic-build-meta.json missing after build"
unset NEXT_DIST_DIR
log "BUILD_ID=$(cat .next-new/BUILD_ID)"
log "BUILD_META=$(tr -d '\n' < .next-new/celeventic-build-meta.json)"

log "Stopping only ${APP_NAME} for migrate + atomic .next swap (Spark & Drive untouched)"
pm2 stop "$APP_NAME"

log "Additive CeleYou SQLite columns (duplicate-safe, no overwrite)"
npx tsx scripts/sql/apply-celeyou-sqlite.ts "$DB_PATH"

# apply-celeyou-sqlite already creates username/trial schema. Mark those Prisma
# migrations applied so migrate deploy does not re-run bare ALTER TABLE and fail.
for migration in \
  20261114170000_celeyou_usernames \
  20261114180000_celeyou_username_delete_hold \
  20261114210000_celeyou_freemium_trial
do
  npx prisma migrate resolve --applied "$migration" >/dev/null 2>&1 || true
done

npx prisma migrate deploy
npx prisma migrate status

log "Seeding Kojo & Fafa"
npx tsx scripts/seed-kojo-fafa-wedding.ts
log "Applying the published Edwin & Lordina design if that invitation exists"
npx tsx scripts/apply-edwin-live-design.ts
log "Edwin design step finished (missing original invite is a skip, not a rollback)"

log "Atomic .next swap"
rm -rf .next
mv .next-new .next
SWAP_DONE=1

log "Restarting only ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env
pm2 restart celeventic-video-worker --update-env 2>/dev/null || true
pm2 save

# Large Next apps can take 1–3 minutes to accept traffic after swap.
wait_for_health() {
  local tries="${1:-90}"
  local i
  for i in $(seq 1 "$tries"); do
    if curl -fsS "$HEALTH_LOCAL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! wait_for_health 90; then
  log "Health still down after 180s — one more restart, then wait again"
  pm2 restart "$APP_NAME" --update-env || true
  wait_for_health 60 || die "Local health failed after restart: ${HEALTH_LOCAL}"
fi
bash scripts/verify-build-commit.sh "$NEW_COMMIT" "$HEALTH_LOCAL" || die "Local build integrity check failed"
curl -fsS "$HEALTH_PUBLIC" >/dev/null || log "Public health check failed (DNS/firewall?) — local passed"
if curl -fsS "$HEALTH_PUBLIC" >/dev/null 2>&1; then
  bash scripts/verify-build-commit.sh "$NEW_COMMIT" "$HEALTH_PUBLIC" \
    || die "Public health commit mismatch — deployed process is stale or wrong host"
fi

log "Smoke: health + home + key routes (no 502)"
for path in / /api/health /discover /invite/madam-gladys-ama-dzikpo /auth/login; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "https://www.celeventic.com${path}" || echo 000)"
  log "smoke ${path} -> ${code}"
  case "$code" in
    200|301|302|303|307|308) ;;
    *) log "WARNING: unexpected status ${code} for ${path}" ;;
  esac
done

# Event Guide surfaces must remain reachable after metadata-only deploys.
curl -fsS -o /dev/null -w "event-guide public shell %{http_code}\n" \
  "https://www.celeventic.com/event-guide/health-check-token" || true
[[ -d src/app/dashboard/events ]] || die "dashboard events routes missing"
[[ -d src/app/event-guide ]] || die "public event-guide routes missing"
[[ -d src/app/api/event-guide ]] || die "event-guide API routes missing"

trap - ERR
log "Deploy complete"
log "Previous: ${PREV_COMMIT}"
log "Deployed: ${NEW_COMMIT}"
log "Backup: ${BACKUP_DIR}"
pm2 logs "$APP_NAME" --lines 80 --nostream
pm2 status "$APP_NAME"
