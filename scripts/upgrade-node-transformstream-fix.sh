#!/usr/bin/env bash
# Upgrade ONLY the Celeventic runtime to Node >= 24.15.0 to permanently fix
# TypeError: controller[kState].transformAlgorithm is not a function
# (nodejs/node#62036 / #62040). Does NOT restart Spark & Drive or other PM2 apps.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/CELEVENTIC}"
TARGET_NODE="${TARGET_NODE:-24.15.0}"
APP_NAME="${APP_NAME:-celeventic}"
WORKER_NAME="${WORKER_NAME:-celeventic-video-worker}"

log() { printf '[node-upgrade] %s\n' "$*"; }
die() { printf '[node-upgrade] ERROR: %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR"
[[ -f package.json ]] || die "package.json not found in ${APP_DIR}"

PREV_NODE="$(node -v 2>/dev/null || true)"
log "Current Node: ${PREV_NODE:-unknown}"
log "Target Node: v${TARGET_NODE}"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
elif [[ -s /root/.nvm/nvm.sh ]]; then
  # shellcheck disable=SC1091
  . /root/.nvm/nvm.sh
else
  die "nvm not found. Install nvm, then re-run. Or install Node ${TARGET_NODE} another way and re-run from a shell where node -v is v${TARGET_NODE}."
fi

nvm install "$TARGET_NODE"
nvm alias default "$TARGET_NODE"
hash -r
NEW_NODE="$(node -v)"
log "Active Node: ${NEW_NODE}"
[[ "$NEW_NODE" == "v${TARGET_NODE}" ]] || die "Expected v${TARGET_NODE}, got ${NEW_NODE}"

# Point PM2 at this Node (npm/npx from PATH).
export PATH="$(dirname "$(command -v node)"):$PATH"

log "Probing TransformStream race (must be 0 hits)…"
node scripts/probe-transformstream-race.cjs

log "Reinstalling deps + rebuilding Celeventic…"
npm ci
npx prisma generate
npm run build
[[ -f .next/BUILD_ID ]] || die ".next/BUILD_ID missing after build"

log "Restarting only ${APP_NAME} (and ${WORKER_NAME} if present)…"
pm2 restart "$APP_NAME" --update-env
pm2 restart "$WORKER_NAME" --update-env 2>/dev/null || log "Worker ${WORKER_NAME} not running — skipped"
pm2 save

log "Post-restart probe…"
node scripts/probe-transformstream-race.cjs

log "Done. Previous Node: ${PREV_NODE:-unknown} → ${NEW_NODE}"
log "Rollback: nvm install ${PREV_NODE#v} && nvm alias default ${PREV_NODE#v} && npm ci && npm run build && pm2 restart ${APP_NAME} --update-env"
