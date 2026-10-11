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
#
# Backup retention runs only after build, PM2 restart, build-commit verification,
# and smoke checks all succeed. It keeps the newest 5 directories named exactly
# YYYYMMDD-HHMMSS, always including the backup written by this run. .sql files
# and any other name (manual or recovery copies) are left in place. A failed
# deploy does not prune. Free space is checked before the backup is written and
# again before npm install/build, both before `pm2 stop`.

set -euo pipefail

APP_DIR="${CELEVENTIC_APP_DIR:-/var/www/CELEVENTIC}"
APP_NAME="${APP_NAME:-celeventic}"
DB_PATH="${DB_PATH:-prisma/production.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/celeventic-deploy-backups}"
BACKUP_ROOT="${BACKUP_ROOT%/}"
HEALTH_LOCAL="${HEALTH_LOCAL:-http://127.0.0.1:3001/api/health}"
HEALTH_PUBLIC="${HEALTH_PUBLIC:-https://www.celeventic.com/api/health}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
# Newest timestamped deploy directories to retain. This run's directory is
# always kept, even when that means holding one more than this count.
KEEP_DEPLOY_BACKUPS=5
# Floor that must remain free on the app/backup filesystem before install and
# build. 10 GiB is above the ~6 GiB free that previously filled this 96 GiB VPS.
# Override with CELEVENTIC_MIN_FREE_KB when the disk size changes.
MIN_FREE_KB="${CELEVENTIC_MIN_FREE_KB:-10485760}"
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

# Exit without the failure trap. Used only while celeventic is still running.
abort_before_live_stop() {
  trap - ERR
  printf '[deploy-vps] ERROR: %s\n' "$*" >&2
  log "Live process ${APP_NAME} was not stopped."
  log "Backup retention was not run."
  exit 1
}

kb_to_human() {
  local kb="$1"
  if (( kb >= 1048576 )); then
    awk -v k="$kb" 'BEGIN { printf "%.1f GiB", k / 1048576 }'
  elif (( kb >= 1024 )); then
    awk -v k="$kb" 'BEGIN { printf "%.0f MiB", k / 1024 }'
  else
    printf '%s KB' "$kb"
  fi
}

print_disk_usage() {
  local label="$1"
  local output line mount seen="" target
  local -a targets=("/")
  log "Disk usage (${label}):"
  [[ -d "$APP_DIR" ]] && targets+=("$APP_DIR")
  [[ -d "$BACKUP_ROOT" ]] && targets+=("$BACKUP_ROOT")
  for target in "${targets[@]}"; do
    mount="$(df -Pk "$target" 2>/dev/null | awk 'NR==2 { print $6 }')" || mount=""
    [[ -n "$mount" ]] || continue
    case " ${seen} " in
      *" ${mount} "*) continue ;;
    esac
    seen="${seen} ${mount}"
    if ! output="$(df -hP "$target" 2>/dev/null)"; then
      log "  WARNING: could not read disk usage for ${target}."
      continue
    fi
    while IFS= read -r line; do
      [[ -n "$line" ]] && log "  ${line}"
    done <<< "$output"
  done
}

print_backup_tree_size() {
  local label="$1"
  local size="absent"
  if [[ -d "$BACKUP_ROOT" ]]; then
    size="$(du -sh "$BACKUP_ROOT" 2>/dev/null | awk '{print $1}')" || size=""
    size="${size:-unknown}"
  fi
  log "Backup directory size (${label}): ${size} (${BACKUP_ROOT})"
}

# Free 1K-blocks on the filesystem that holds this path.
free_kb_of() {
  local target="$1"
  local kb
  kb="$(df -Pk "$target" 2>/dev/null | awk 'NR==2 { print $4 }')"
  if [[ ! "$kb" =~ ^[0-9]+$ ]]; then
    return 1
  fi
  printf '%s' "$kb"
}

# Bytes we are about to copy into a new deploy backup, plus a small cushion.
estimate_new_backup_kb() {
  local total=0
  local part=""
  if [[ -d .next ]]; then
    part="$(du -sk .next 2>/dev/null | awk '{ print $1 }')" || part=""
    if [[ "$part" =~ ^[0-9]+$ ]]; then
      total=$((total + part))
    else
      printf '[deploy-vps] WARNING: could not measure .next; reserving 2 GiB for that copy.\n' >&2
      total=$((total + 2097152))
    fi
  fi
  if [[ -f "$DB_PATH" ]]; then
    part="$(du -sk "$DB_PATH" 2>/dev/null | awk '{ print $1 }')" || part=""
    if [[ "$part" =~ ^[0-9]+$ ]]; then
      total=$((total + part))
    fi
  fi
  # Room for .env and du rounding.
  printf '%s' $((total + 262144))
}

# phase is "backup" or "install". Backup also reserves the size of the copy
# so the post-backup floor still holds. Never stops PM2.
require_free_space() {
  local label="$1"
  local phase="$2"
  local target kb need mount seen="" reserve=0
  local -a targets=()

  if [[ ! "$MIN_FREE_KB" =~ ^[0-9]+$ ]] || (( MIN_FREE_KB < 1048576 )); then
    abort_before_live_stop "CELEVENTIC_MIN_FREE_KB must be at least 1048576 (1 GiB). Refusing to stop ${APP_NAME}."
  fi

  targets+=("$APP_DIR")
  if [[ -d "$BACKUP_ROOT" ]]; then
    targets+=("$BACKUP_ROOT")
  elif [[ -d "$(dirname "$BACKUP_ROOT")" ]]; then
    targets+=("$(dirname "$BACKUP_ROOT")")
  fi

  if [[ "$phase" == "backup" ]]; then
    reserve="$(estimate_new_backup_kb)" || reserve=""
    if [[ ! "$reserve" =~ ^[0-9]+$ ]]; then
      abort_before_live_stop "Could not estimate the deploy backup size. Refusing to stop ${APP_NAME}."
    fi
  fi

  for target in "${targets[@]}"; do
    mount="$(df -Pk "$target" 2>/dev/null | awk 'NR==2 { print $6 }')" || mount=""
    [[ -n "$mount" ]] || mount="$target"
    case " ${seen} " in
      *" ${mount} "*) continue ;;
    esac
    seen="${seen} ${mount}"

    if ! kb="$(free_kb_of "$target")"; then
      abort_before_live_stop "Could not read free space for ${target} before ${label}."
    fi
    need="$MIN_FREE_KB"
    if [[ "$phase" == "backup" ]]; then
      need=$((MIN_FREE_KB + reserve))
    fi
    log "Free space on ${mount} before ${label}: $(kb_to_human "$kb") available; need at least $(kb_to_human "$need")."
    if (( kb < need )); then
      abort_before_live_stop "Only $(kb_to_human "$kb") free on ${mount}. Need $(kb_to_human "$need") before ${label}. Refusing to stop ${APP_NAME}."
    fi
  done
}

# True only for a calendar-ish YYYYMMDD-HHMMSS name produced by `date +%Y%m%d-%H%M%S`.
is_timestamp_deploy_backup_name() {
  local name="$1"
  local year month day hour minute second
  [[ "$name" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})-([0-9]{2})([0-9]{2})([0-9]{2})$ ]] || return 1
  year="${BASH_REMATCH[1]}"
  month="${BASH_REMATCH[2]}"
  day="${BASH_REMATCH[3]}"
  hour="${BASH_REMATCH[4]}"
  minute="${BASH_REMATCH[5]}"
  second="${BASH_REMATCH[6]}"
  # 10# keeps 08/09 from being read as octal.
  (( 10#$year >= 2020 && 10#$year <= 2100 )) || return 1
  (( 10#$month >= 1 && 10#$month <= 12 )) || return 1
  (( 10#$day >= 1 && 10#$day <= 31 )) || return 1
  (( 10#$hour <= 23 && 10#$minute <= 59 && 10#$second <= 59 )) || return 1
}

# Delete only direct-child timestamp directories older than the newest
# KEEP_DEPLOY_BACKUPS. The current deploy directory is never removed.
# .sql files, symlinks, and every other name stay.
prune_old_deploy_backups() {
  local current_dir="$1"
  local keep="$2"
  local root path base resolved current_resolved current_name
  local had_nullglob=0
  local kept=0
  local removed=0
  local -a newest_first=()

  if [[ ! "$keep" =~ ^[1-9][0-9]*$ ]]; then
    log "Retention: refusing to prune because keep count '${keep}' is not a positive integer."
    return 1
  fi
  if [[ ! -d "$BACKUP_ROOT" ]]; then
    log "Retention: ${BACKUP_ROOT} does not exist. Nothing to prune."
    return 0
  fi

  root="$(cd "$BACKUP_ROOT" && pwd -P)" || {
    log "Retention: refusing to prune because the backup root could not be resolved."
    return 1
  }
  if [[ -z "$root" || "$root" == "/" ]]; then
    log "Retention: refusing to prune because the backup root resolved to '${root:-empty}'."
    return 1
  fi
  current_name="$(basename "$current_dir")"
  if ! is_timestamp_deploy_backup_name "$current_name"; then
    log "Retention: refusing to prune because the current backup name '${current_name}' is not YYYYMMDD-HHMMSS."
    return 1
  fi
  if [[ -L "$current_dir" || ! -d "$current_dir" ]]; then
    log "Retention: refusing to prune because the current backup directory is missing."
    return 1
  fi
  current_resolved="$(cd "$current_dir" && pwd -P)" || {
    log "Retention: refusing to prune because the current backup could not be resolved."
    return 1
  }
  if [[ -z "$current_resolved" || "$current_resolved" == "/" || "$(dirname "$current_resolved")" != "$root" ]]; then
    log "Retention: refusing to prune because the current backup is not inside ${root}."
    return 1
  fi

  shopt -q nullglob && had_nullglob=1
  shopt -s nullglob
  for path in "$root"/*; do
    base="${path##*/}"
    [[ -L "$path" ]] && continue
    [[ -d "$path" ]] || continue
    is_timestamp_deploy_backup_name "$base" || continue
    newest_first+=("$base")
  done
  if (( had_nullglob == 0 )); then
    shopt -u nullglob
  fi

  if ((${#newest_first[@]} == 0)); then
    log "Retention: no timestamped deploy backups found under ${root}."
    return 0
  fi

  local sorted_names=""
  sorted_names="$(printf '%s\n' "${newest_first[@]}" | sort -r)" || {
    log "Retention: could not sort backup names. Nothing was removed."
    return 1
  }
  newest_first=()
  while IFS= read -r base; do
    [[ -n "$base" ]] && newest_first+=("$base")
  done <<< "$sorted_names"

  for base in "${newest_first[@]}"; do
    path="${root}/${base}"
    if ! is_timestamp_deploy_backup_name "$base"; then
      log "Retention: skipping unexpected name ${base}"
      continue
    fi
    if [[ -L "$path" || ! -d "$path" ]]; then
      log "Retention: skipping ${path} (not a real directory)."
      continue
    fi
    resolved="$(cd "$path" && pwd -P)" || {
      log "Retention: skipping ${path} (could not resolve)."
      continue
    }
    if [[ "$(dirname "$resolved")" != "$root" || "${resolved##*/}" != "$base" ]]; then
      log "Retention: skipping ${path} (not a direct child of the backup root)."
      continue
    fi

    if [[ "$resolved" == "$current_resolved" ]]; then
      log "Retention: keeping current deploy backup ${path}"
      kept=$((kept + 1))
      continue
    fi
    if (( kept < keep )); then
      log "Retention: keeping ${path}"
      kept=$((kept + 1))
      continue
    fi

    if [[ "$path" == "/" || "$path" == "$root" || "$path" != "${root}/${base}" ]]; then
      log "Retention: refusing to remove unexpected path ${path}."
      return 1
    fi
    log "Removing old deploy backup: ${path}"
    if ! rm -rf -- "$path"; then
      log "Retention: failed to remove ${path}. Leaving the remaining backups in place."
      return 1
    fi
    if [[ -e "$path" || -L "$path" ]]; then
      log "Retention: ${path} still exists after removal. Stopping cleanup."
      return 1
    fi
    removed=$((removed + 1))
  done

  if (( removed == 0 )); then
    log "Retention: no timestamp directories to remove. Kept ${kept}."
  else
    log "Retention: kept ${kept} timestamped deploy backup(s); removed ${removed}."
  fi
}

restore_on_failure() {
  local code=$?
  log "Failure detected (exit ${code}). Rolling back DB/.next and restarting ${APP_NAME}..."
  log "Backup retention was not run. Existing deploy backups were left in place."
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
command -v df >/dev/null || die "df missing"
command -v du >/dev/null || die "du missing"

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

print_disk_usage "before deployment"
print_backup_tree_size "before deployment"
require_free_space "writing the deploy backup" backup

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

require_free_space "npm install and build" install

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

log "Seeding Kojo & Fafa"
npx tsx scripts/seed-kojo-fafa-wedding.ts
log "Applying the published Edwin & Lordina design and Biblical track"
npx tsx scripts/apply-edwin-live-design.ts

log "Building Next.js (previous .next already backed up)"
rm -rf .next
export CELEVENTIC_BUILD_COMMIT="$NEW_COMMIT"
export CELEVENTIC_BUILD_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# Bake commit into the server bundle so a stale PM2/.env SHA cannot win.
node scripts/write-build-meta.mjs
npm run build
[[ -f .next/BUILD_ID ]] || die ".next/BUILD_ID missing after build"
[[ -f .next/celeventic-build-meta.json ]] || die ".next/celeventic-build-meta.json missing after build"
log "BUILD_ID=$(cat .next/BUILD_ID)"
log "BUILD_META=$(tr -d '\n' < .next/celeventic-build-meta.json)"

log "Restarting only ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env
pm2 restart celeventic-video-worker --update-env 2>/dev/null || true
pm2 save

sleep 3
curl -fsS "$HEALTH_LOCAL" >/dev/null || die "Local health failed: ${HEALTH_LOCAL}"
bash scripts/verify-build-commit.sh "$NEW_COMMIT" "$HEALTH_LOCAL" || die "Local build integrity check failed"
curl -fsS "$HEALTH_PUBLIC" >/dev/null || log "Public health check failed (DNS/firewall?) — local passed"
if curl -fsS "$HEALTH_PUBLIC" >/dev/null 2>&1; then
  bash scripts/verify-build-commit.sh "$NEW_COMMIT" "$HEALTH_PUBLIC" \
    || die "Public health commit mismatch — deployed process is stale or wrong host"
fi

log "Smoke: health + home"
curl -fsS -o /dev/null -w "live home %{http_code}\n" https://www.celeventic.com/ || true
curl -fsS -o /dev/null -w "live health %{http_code}\n" https://www.celeventic.com/api/health || true

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

# Retention is reachable only after build, PM2 restart, build-commit
# verification, and smoke checks. The ERR trap is already cleared, so a
# cleanup problem cannot roll back a deploy that succeeded.
log "Pruning old deploy backups."
if ! prune_old_deploy_backups "$BACKUP_DIR" "$KEEP_DEPLOY_BACKUPS"; then
  log "Retention cleanup failed. The deploy itself succeeded, so nothing was rolled back."
fi
print_backup_tree_size "after cleanup"
print_disk_usage "after cleanup"

pm2 logs "$APP_NAME" --lines 80 --nostream
pm2 status "$APP_NAME"
