# Celeventic Seating Studio — Deploy & Rollback

## What shipped

Smart Seating Studio for organisers plus theme-aware guest seating cards, Find My Seat directions, draft/publish layout status, smart suggestions, auto-assign, conflict detection, venue features, zones, and live admission-aware capacity.

**Storage model (no Prisma migration):**

- `SeatingPlan.layout` JSON extended with studio tables, zones, elements, `status`, `revision`, `settings`
- `SeatingAssignment` unchanged (`guestId` → `tableNumber` / `seatLabel` / `zone`)
- Existing invitations, QR tokens, and published links are reused as-is

## Prisma migration

```bash
# None required for Seating Studio.
npx prisma generate   # still run on deploy so client stays current
```

## Backfill

```bash
# None required.
# Existing layout JSON remains valid; missing studio fields default via normalizeStudioLayout().
# Draft status defaults for new saves; older plans without status are treated as published for guest lookup.
```

## Deploy (Hostinger VPS)

Live is **not** auto-deployed from GitHub.

```bash
cd /var/www/CELEVENTIC && bash scripts/deploy-vps.sh
```

Or manually:

```bash
cd /var/www/CELEVENTIC
git fetch origin main && git checkout main && git pull --ff-only origin main
npm ci --omit=dev || npm install --omit=dev
npx prisma generate
npm run build
pm2 restart celeventic --update-env
pm2 save
```

Verify:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://www.celeventic.com/dashboard/seating
node scripts/smoke-live-pages.mjs
```

## Rollback

```bash
cd /var/www/CELEVENTIC
git fetch origin main
git checkout <previous-good-sha>
npm ci --omit=dev || npm install --omit=dev
npx prisma generate
npm run build
pm2 restart celeventic --update-env
```

Existing assignments remain valid because table labels and seat labels are unchanged. Draft/publish fields in layout JSON are ignored by older builds.

## Organiser notes after deploy

1. Open **Dashboard → Seating**.
2. Design tables / venue features on the canvas, assign guests, review conflicts.
3. **Save draft** while editing; **Publish plan** when guests should follow reveal rules.
4. Default guest reveal is **after admission** (configurable in layout settings).

## Remaining limitations (known)

- Full Auto-Assign wizard is a one-click preview/apply flow (not a 10-step modal).
- Version history is undo/redo + layout `revision` / `publishedAt` (no full before/after snapshot browser UI yet).
- Real-time updates use 15s silent polling in Studio (no WebSocket event bus yet).
- Mini-map, rulers, object grouping, and theatre-row advanced aisle editors are not fully implemented.
- Indoor live positioning is intentionally not claimed; Find My Seat uses organiser-defined directions.
