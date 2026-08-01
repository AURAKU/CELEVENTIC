#!/usr/bin/env bash
# Safe Celeventic production deploy for SQLite + Prisma migrate deploy.
# Restarts ONLY pm2 process "celeventic". Never touches Spark & Drive.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/CELEVENTIC}"
APP_NAME="${APP_NAME:-celeventic}"
DB_PATH="${DB_PATH:-prisma/production.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/celeventic-deploy-backups}"
HEALTH_LOCAL="${HEALTH_LOCAL:-http://127.0.0.1:3001/api/health}"
HEALTH_PUBLIC="${HEALTH_PUBLIC:-https://www.celeventic.com/api/health}"
THANK_YOU_MIGRATION="20260801030000_thank_you_premium"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
PREV_COMMIT=""
NEW_COMMIT=""
ROLLED_BACK_THANK_YOU=0

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

sqlite_col_exists() {
  local db="$1" table="$2" col="$3"
  sqlite3 "$db" "PRAGMA table_info(\"$table\");" | awk -F'|' -v c="$col" '$2==c {found=1} END{exit found?0:1}'
}

migration_failed_unresolved() {
  local db="$1"
  local out
  out="$(sqlite3 "$db" "SELECT migration_name FROM _prisma_migrations
    WHERE migration_name='${THANK_YOU_MIGRATION}'
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
    LIMIT 1;")"
  [[ -n "$out" ]]
}

restore_on_failure() {
  local code=$?
  log "Failure detected (exit ${code}). Attempting rollback of DB/.next..."
  if [[ -f "${BACKUP_DIR}/production.db" ]]; then
    cp -a "${BACKUP_DIR}/production.db" "${APP_DIR}/${DB_PATH}"
    log "Restored SQLite DB from ${BACKUP_DIR}/production.db"
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
  log "Manual git rollback (NOT auto-run): git checkout ${PREV_COMMIT:-<previous>} -- ."
  exit "$code"
}

trap restore_on_failure ERR

require_cmd git
require_cmd npm
require_cmd npx
require_cmd sqlite3
require_cmd pm2
require_cmd curl
require_cmd nginx

cd "$APP_DIR"
[[ -f package.json ]] || die "package.json not found in ${APP_DIR}"
[[ -f "$DB_PATH" ]] || die "Database not found: ${APP_DIR}/${DB_PATH}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "main" ]] || die "Expected branch main, found ${BRANCH}"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  die "Tracked working tree is dirty. Commit/stash tracked changes before deploy."
fi

PREV_COMMIT="$(git rev-parse HEAD)"
log "Current commit: ${PREV_COMMIT}"

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/production.db'"
cp -a .env "${BACKUP_DIR}/.env" 2>/dev/null || true
[[ -f .env.production ]] && cp -a .env.production "${BACKUP_DIR}/.env.production"
if [[ -d .next ]]; then
  cp -a .next "${BACKUP_DIR}/next-build"
fi
log "Backups written to ${BACKUP_DIR}"

integrity="$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')"
[[ "$integrity" == "ok" ]] || die "integrity_check failed: ${integrity}"
fk="$(sqlite3 "$DB_PATH" 'PRAGMA foreign_key_check;')"
[[ -z "$fk" ]] || die "foreign_key_check failed: ${fk}"

git fetch origin
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
[[ "$LOCAL" == "$BASE" ]] || die "Local main has diverged; refusing non-fast-forward deploy"
git merge --ff-only origin/main
NEW_COMMIT="$(git rev-parse HEAD)"
log "Updated to commit: ${NEW_COMMIT}"

npm run migrations:validate:sqlite
npm ci
npx prisma generate

log "Stopping only ${APP_NAME} (Spark & Drive untouched)"
pm2 stop "$APP_NAME"

# SQLite lock check
if fuser "${DB_PATH}" >/dev/null 2>&1; then
  log "Warning: database file still has open handles; waiting 3s"
  sleep 3
fi

PARTIAL=0
if sqlite_col_exists "$DB_PATH" "thank_you_pages" "eyebrow" \
  && ! sqlite_col_exists "$DB_PATH" "invitation_guest_wishes" "updatedAt"; then
  PARTIAL=1
fi

if migration_failed_unresolved "$DB_PATH"; then
  log "Marking failed migration as rolled back: ${THANK_YOU_MIGRATION}"
  npx prisma migrate resolve --rolled-back "$THANK_YOU_MIGRATION"
  ROLLED_BACK_THANK_YOU=1
fi

if [[ "$PARTIAL" -eq 1 ]]; then
  log "Detected partial thank-you apply; running recovery SQL"
  BEFORE_WISHES="$(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM invitation_guest_wishes;')"
  sqlite3 "$DB_PATH" < scripts/sql/recover-thank-you-premium-partial.sql
  AFTER_WISHES="$(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM invitation_guest_wishes;')"
  [[ "$BEFORE_WISHES" == "$AFTER_WISHES" ]] || die "Wish row count changed during recovery"
  npx prisma migrate resolve --applied "$THANK_YOU_MIGRATION"
fi

npx prisma migrate deploy
npx prisma migrate status

integrity="$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')"
[[ "$integrity" == "ok" ]] || die "post-migrate integrity_check failed"
fk="$(sqlite3 "$DB_PATH" 'PRAGMA foreign_key_check;')"
[[ -z "$fk" ]] || die "post-migrate foreign_key_check failed"

rm -rf .next
npm run build
[[ -f .next/BUILD_ID ]] || die ".next/BUILD_ID missing after build"

# TransformStream race probe (nodejs/node#62036). Warn on vulnerable Node; do not block deploy
# unless CELEVENTIC_REQUIRE_SAFE_NODE=1. Permanent fix: bash scripts/upgrade-node-transformstream-fix.sh
if [[ -f scripts/probe-transformstream-race.cjs ]]; then
  if CELEVENTIC_ALLOW_TRANSFORMSTREAM_RACE=1 node scripts/probe-transformstream-race.cjs; then
    log "TransformStream race probe completed"
  else
    log "TransformStream race probe reported vulnerability — upgrade Node with scripts/upgrade-node-transformstream-fix.sh"
  fi
  if [[ "${CELEVENTIC_REQUIRE_SAFE_NODE:-0}" == "1" ]]; then
    node scripts/probe-transformstream-race.cjs || die "Node runtime still vulnerable to TransformStream race"
  fi
fi

pm2 restart "$APP_NAME" --update-env
pm2 save

nginx -t
systemctl reload nginx

sleep 2
curl -fsS "$HEALTH_LOCAL" >/dev/null
curl -fsS "$HEALTH_PUBLIC" >/dev/null || log "Public health check failed (DNS/firewall?) — local health passed"

trap - ERR
log "Deploy succeeded"
log "Previous commit: ${PREV_COMMIT}"
log "Deployed commit: ${NEW_COMMIT}"
log "Backup directory: ${BACKUP_DIR}"
log "Thank-you rolled back before reapply: ${ROLLED_BACK_THANK_YOU}"
pm2 logs "$APP_NAME" --lines 150 --nostream
