# Dual-Stage Smart Seating — Deploy & Rollback

## What shipped

Wedding events can now hold independent **Main Ceremony** (chairs/rows) and **Reception** (table-only or table-and-chair) plans.

- Party **allowance** drives expected people (not invitation-record counts)
- Assignments auto-save per guest/plan
- Save draft vs Publish remain separate
- Guest seating cards show ceremony + reception when published

## Prisma migration

```bash
cd /var/www/CELEVENTIC
npx prisma migrate deploy
npx prisma generate
```

Migration: `prisma/migrations/20260731140000_dual_stage_seating`

Changes:

- `SeatingPlan.planType` (`RECEPTION` | `CEREMONY`) with unique `(eventId, planType)`
- `SeatingAssignment` uniqueness is now `(guestId, seatingPlanId)` so one guest can hold both plans

## Backfill

```bash
npx tsx scripts/backfill-dual-stage-seating.ts --dry-run
npx tsx scripts/backfill-dual-stage-seating.ts
```

Existing plans default to `RECEPTION`. Ceremony plans are created only when an organiser opens/saves the Ceremony tab.

## Deploy

```bash
cd /var/www/CELEVENTIC && bash scripts/deploy-vps.sh
```

Or:

```bash
git pull --ff-only origin main
npm ci --omit=dev || npm install --omit=dev
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart celeventic --update-env
```

## Rollback

```bash
git checkout <previous-good-sha>
npx prisma migrate resolve --rolled-back 20260731140000_dual_stage_seating   # only if migrate was applied and you must reverse
# Prefer forward-fix over destructive SQL unless ops explicitly approves a down migration.
npm run build
pm2 restart celeventic --update-env
```

If you must reverse the schema manually on Postgres:

1. Ensure no guest has both ceremony and reception rows (delete ceremony assignments/plans first).
2. Restore unique index on `seating_assignments.guestId`.
3. Drop `planType` / enum only after data is safe.

## Organiser notes

1. Dashboard → Seating → switch **Main Ceremony** / **Reception**
2. Ceremony: generate rows/chairs, assign adjacent party blocks
3. Reception: choose Table only or Table + chair
4. Save draft while editing; Publish when guests should see it
