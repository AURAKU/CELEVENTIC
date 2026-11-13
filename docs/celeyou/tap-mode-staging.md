# CeleYou Tap Mode staging preparation

Status: **software-ready for a dedicated staging host**. No staging HTTPS host is provisioned in this repository. **Do not use production as a substitute.** **Do not deploy without authorization.**

## Database compatibility

Additive migration:

`prisma/migrations/20261113040000_tap_pairing_token/migration.sql`

- Adds `pairingToken` and `pairingTokenHash` to `celeyou_proximity_sessions`.
- Existing join codes keep working.
- Rollback of the app without dropping columns is safe. Do not run DROP COLUMN on live data.

Apply with:

```
npx prisma migrate deploy
```

Never `prisma db push` against production. Never open `prisma/production.db` from this agent.

## Environment

Required:

- `DATABASE_URL` pointing at the staging SQLite/Postgres file for that host only
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` as the staging HTTPS origin
- `ENCRYPTION_KEY` if access-code hints are in use

Recommended for cluster-wide abuse limits:

- `REDIS_URL`

If `REDIS_URL` is unset or Redis is down, rate limits are **per Node process**. Two PM2 workers then allow about twice the configured Tap and Connect Back quotas. That is documented, not a silent shared store.

## Build

```
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Health after start:

```
curl -sI https://<staging-host>/
curl -sI https://<staging-host>/tap/ABCDEF
```

`/tap/ABCDEF` must be 200 with no login redirect. Unknown codes show an expired/closed guest page.

## Backup and rollback

1. Copy the staging database file (or `VACUUM INTO`) before migrate.
2. Record `git rev-parse HEAD` and the PM2 process name.
3. Rollback: restore the backup file, check out the previous commit, rebuild, restart **only** the Celeventic process. Do not `pm2 restart all`.
4. Do not delete `smartcard_connections` or proximity sessions during rollback.

## Isolated verification (this repo)

Disposable file: `prisma/e2e-tap.db`

```
npm run test:e2e:tap
```

That suite never opens `prisma/production.db`.
