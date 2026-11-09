# Celeventic database architecture (as inspected 7 November 2026)

Status: **VERIFIED for configuration**. This is not a production VPS login.

Do not assume PostgreSQL is the production provider. The product schema, migration lock, local env, and VPS deploy scripts all point at **SQLite**.

## Prisma schema provider

- `prisma/schema.prisma` datasource `provider = "sqlite"`
- `prisma/migrations/migration_lock.toml` `provider = "sqlite"`
- Latest additive migrations in this tree:
  - `20261107080000_ticket_ledger_and_promos`
  - `20261107090000_deletion_requests_and_support`

There is **one** Prisma schema. Development and production are not split into different Prisma providers.

## Development configuration

- `.env.example` and `.env.local` both use `DATABASE_URL` with scheme `file:` (SQLite).
- There is no `.env` or `.env.production` in this working tree.
- `src/lib/prisma.ts` falls back to `file:./dev.db` only when `DATABASE_URL` is unset and the process is not a locked-down production runtime.
- Local file in use: `prisma/dev.db` (gitignored).

## Production configuration (from deploy scripts, not a live SSH session)

- `scripts/deploy-production-sqlite.sh` and `scripts/deploy-vps.sh` default `DB_PATH=prisma/production.db` on `/var/www/CELEVENTIC`.
- Those scripts snapshot SQLite before migrate/replace and restore that file on failure.
- They never call `prisma db push` in the happy path. They refuse `pm2 restart all`.
- This session did **not** open the live VPS, print production secrets, or run production migrations.

## PostgreSQL that exists locally but is not the product engine

- `docker-compose.yml` defines `postgres:16-alpine` on `:5432`.
- `pg_isready` reports that port is accepting connections.
- That instance is **not** wired as `DATABASE_URL` for Celeventic. Prisma cannot talk to it without changing `provider`, which this phase is **not** authorized to do.

## Transaction guarantees

- Application inventory uses SQL compare-and-swap (`updateMany` with `soldCount <= max - qty`) inside `prisma.$transaction`.
- SQLite serializes writers. That can hide races PostgreSQL would expose, and it can also deadlock under write storms.
- Passing SQLite tests does **not** prove PostgreSQL `READ COMMITTED` behaviour.
- Passing in-memory CAS tests does **not** prove either engine.
- Isolated SQLite acceptance (this phase) is the production-equivalent engine test. PostgreSQL remains a future provider-change project, not the current production database.

## What this phase must not do

- Do not switch Prisma `provider` to PostgreSQL automatically.
- Do not run production migrations.
- Do not `prisma db push` against `prisma/dev.db` or any production file (SQLite JSON default rewrites previously corrupted `digital_business_cards`).
- Isolated `prisma db push --accept-data-loss` is allowed only against a newly created empty file under `/tmp`.
- In practice `prisma db push` **fails** on empty SQLite because of `JSONB DEFAULT {}`. Isolated acceptance clones applied DDL from `prisma/dev.db` with no rows.

## Isolated SQLite acceptance (7 Nov 2026)

`npm run test:accept-sqlite` passed 12/12 against a disposable clone. Purchases for one ticket type are serialized in-process so SQLite's single writer does not time out under a 40-buyer stampede. That gate is per Node process. `ecosystem.config.js` now sets `celeventic` to `instances: 1` / `exec_mode: "fork"`. Runtime throws in production if `CELEVENTIC_WEB_INSTANCES > 1`. See `docs/ops/SQLITE-DEPLOYMENT-SAFETY.md`.
