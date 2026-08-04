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
  echo "==> Installing dependencies (include dev for Prisma / build)"
  npm ci --include=dev || npm install
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
# PM2 celeventic listens on PORT from .env (production: 3001). Probe both.
for port in 3001 3000; do
  if curl -fsS -o /dev/null -w "api/health :$port %{http_code}\n" "http://127.0.0.1:${port}/api/health"; then
    curl -fsS -o /dev/null -w "home :$port %{http_code}\n" "http://127.0.0.1:${port}/" || true
    break
  fi
done
curl -fsS -o /dev/null -w "live home %{http_code}\n" https://www.celeventic.com/ || true
curl -fsS -o /dev/null -w "live health %{http_code}\n" https://www.celeventic.com/api/health || true

echo "==> Live party-isolation dry-run (all invitations — no mutations)"
npm run audit:party-isolation || true

echo "==> Deploy complete"
pm2 status celeventic
