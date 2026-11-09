# Celeventic staging, backup, and rollback

Date: 7 Nov 2026  
Production deploy remains unauthorized.

## Staging requirements

- A host that is not the live VPS
- Its own `DATABASE_URL` (PostgreSQL preferred for production-shaped concurrency)
- Paystack **test** keys only
- Hubtel sandbox or disabled
- Copy of Prisma migrations applied forward-only
- No production `.env`, no production SQLite file, no live payouts

## Database migration strategy

1. Additive Prisma migrations under `prisma/migrations/`
2. Never `prisma db push` against production
3. Never rewrite SQLite JSON defaults on a live file (that previously corrupted `digital_business_cards`)
4. Apply one migration, run `npm run test:integrity` and `npm run test:gifts`, then the next
5. Ticket ledger migration: `20261107080000_ticket_ledger_and_promos`

## Backup

- SQLite (current local/dev): copy `prisma/dev.db` to a timestamped file **before** any migration
- Production SQLite (if still in use): the deploy script already snapshots before replace. Rehearse restore on staging, not production
- PostgreSQL (target): nightly `pg_dump --format=custom` to off-box storage, retain at least 14 days

## Backup restoration

SQLite:

```bash
cp prisma/dev.db "prisma/dev.db.bak-$(date +%Y%m%d%H%M%S)"
# restore
cp prisma/dev.db.bak-YYYYMMDDHHMMSS prisma/dev.db
```

PostgreSQL:

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup.dump
```

Isolated local drill (7 Nov 2026, 07:24 UTC):

- Command: `npm run test:recovery` (`scripts/phase12-backup-restore-drill.sh`)
- Source: read-only copy of `prisma/dev.db`
- Destination: `/tmp/celeventic-v22-recovery-20261107T072400Z-tLWn/restored.db`
- `PRAGMA integrity_check`: ok
- Restoration duration: 1 second
- Production files: not touched
- App reconnect: not tested
- Limitation: this local file had no ticket/ledger rows

A staging host restore with a populated financial database and `/api/health` after reconnect is still required.

## Deployment rollback

1. Keep the previous Next.js build and PM2 app name (`celeventic`)
2. Point PM2 back at the previous `standalone` output or previous release directory
3. Restore the database snapshot taken before the migration if the schema moved
4. Do not `pm2 restart all`
5. Confirm `/api/health` and a single ticket-ledger reconcile on a staging event

## Monitoring

- `/api/health` and admin system health
- Payment webhook `payment_logs` for `STATUS_UPDATE` / `WEBHOOK`
- Event wallet reconcile: gift book and ticket book `drifted === false`
- Sentry/PostHog are retired; do not claim they are live

## Incident recovery

1. Freeze withdrawals and payouts (already off for tickets)
2. Stop confirming new payments if HMAC or amount matching fails
3. Reconcile ticket and gift ledgers
4. Do not issue provider refunds until that path is accepted
5. Restore from the last known-good backup only on staging first
