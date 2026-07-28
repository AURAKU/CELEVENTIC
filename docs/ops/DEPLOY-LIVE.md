# Deploy Celeventic to live (Hostinger VPS)

Live site: https://www.celeventic.com  
App dir: `/var/www/CELEVENTIC`  
Process: `pm2` app name `celeventic`

## Why pages 500 after a merge

GitHub `main` is not auto-deployed. Until the VPS runs `git pull` + `npm run build` + `pm2 restart celeventic`, production keeps serving the previous build.

## One-shot deploy (paste into Hostinger VPS terminal / AI ops)

```bash
cd /var/www/CELEVENTIC && bash scripts/deploy-vps.sh
```

If `scripts/deploy-vps.sh` is not on the server yet (first pull of this file):

```bash
cd /var/www/CELEVENTIC
git fetch origin main && git checkout main && git pull --ff-only origin main
npm ci --omit=dev || npm install --omit=dev
npx prisma generate
npx prisma migrate deploy || npx prisma db push
npm run build
pm2 restart celeventic --update-env
pm2 save
curl -sS -o /dev/null -w "%{http_code}\n" https://www.celeventic.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://www.celeventic.com/invitations/templates/forever-afaris-wedding
```

**Never run `pm2 restart all`** on this box.

## Verify from laptop

```bash
node scripts/smoke-live-pages.mjs
```

Expect every listed route to print `ok` (not `FAIL` / 5xx).
