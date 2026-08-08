#!/usr/bin/env bash
# Canonical live deploy entrypoint for Hostinger VPS (celeventic.com).
#
# Install / refresh on the server:
#   sudo install -m 755 /var/www/CELEVENTIC/scripts/deploy-celeventic-live.sh /root/deploy-celeventic-live.sh
#   # or symlink:
#   sudo ln -sfn /var/www/CELEVENTIC/scripts/deploy-celeventic-live.sh /root/deploy-celeventic-live.sh
#
# Run ON the VPS only:
#   bash /root/deploy-celeventic-live.sh
#   bash /root/deploy-celeventic-live.sh --skip-install
#
# Restarts ONLY pm2 process "celeventic" (+ optional video worker).
# Never touches Spark & Drive. Never runs: prisma migrate reset, pm2 restart all,
# or force-push.
#
# Every deploy:
#   1. Sets CELEVENTIC_BUILD_COMMIT=$(git rev-parse HEAD)
#   2. Bakes that SHA into the Next.js build via scripts/write-build-meta.mjs
#   3. Restarts with: pm2 restart celeventic --update-env
#   4. Fails if /api/health build.commit does not match git HEAD
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${CELEVENTIC_APP_DIR:-/var/www/CELEVENTIC}"

# When installed as /root/deploy-celeventic-live.sh, prefer the app-tree script
# after pull so updates ship with the repo.
if [[ -f "${APP_DIR}/scripts/deploy-vps.sh" ]]; then
  exec bash "${APP_DIR}/scripts/deploy-vps.sh" "$@"
fi

if [[ -f "${SCRIPT_DIR}/deploy-vps.sh" ]]; then
  exec bash "${SCRIPT_DIR}/deploy-vps.sh" "$@"
fi

printf '[deploy-celeventic-live] ERROR: deploy-vps.sh not found under %s or %s\n' \
  "$APP_DIR" "$SCRIPT_DIR" >&2
exit 1
