#!/usr/bin/env bash
# Deploy latest main to Hostinger VPS production (celeventic.com).
# Run ON the VPS (or paste into Hostinger AI terminal), never from a laptop
# without SSH access to /var/www/CELEVENTIC.
#
# Usage:
#   bash scripts/deploy-vps.sh
#   bash scripts/deploy-vps.sh --skip-install   # if node_modules already current
set -euo pipefail

APP_DIR="${CELEVENTIC_APP_DIR:-/var/www/CELEVENTIC}"
SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
  esac
done

cd "$APP_DIR"
echo "==> Deploying Celeventic in $APP_DIR"

echo "==> Fetching origin/main"
git fetch origin main
git checkout main
git pull --ff-only origin main
echo "==> HEAD: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> Installing dependencies"
  npm ci --omit=dev || npm install --omit=dev
fi

echo "==> Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy || npx prisma db push

echo "==> Building Next.js"
npm run build

echo "==> Restarting pm2 (celeventic only — never 'pm2 restart all')"
pm2 restart celeventic --update-env
pm2 restart celeventic-video-worker --update-env 2>/dev/null || true
pm2 save

echo "==> Health check"
sleep 2
curl -fsS -o /dev/null -w "api/health %{http_code}\n" http://127.0.0.1:3000/api/health || true
curl -fsS -o /dev/null -w "home %{http_code}\n" http://127.0.0.1:3000/ || true
curl -fsS -o /dev/null -w "templates/fa %{http_code}\n" \
  http://127.0.0.1:3000/invitations/templates/forever-afaris-wedding || true

echo "==> Deploy complete"
pm2 status celeventic
