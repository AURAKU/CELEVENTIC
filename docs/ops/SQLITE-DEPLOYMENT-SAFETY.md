# SQLite deployment safety

Date: 7 November 2026  
Production provider: **SQLite** (`prisma/production.db` on the VPS, `provider = "sqlite"`).  
This document is configuration and local evidence. It is not a live SSH session.

## Actual PM2 process configuration

Inspected file: `ecosystem.config.js`.

| Process | Script | instances | exec_mode | Role |
|---|---|---|---|---|
| `celeventic` | `npm run start` | **1** (explicit) | **fork** (explicit) | Next.js HTTP/API writer |
| `celeventic-video-worker` | `npm run jobs:worker` | default 1 fork | default fork | FFmpeg job drain only |

The Next.js app is the SQLite writer for ticket purchases, RSVP, gifts, and admission. The video worker must not take ticket checkout traffic.

Never run `pm2 restart all`. Never set `instances` above 1 or `exec_mode: "cluster"` for `celeventic` while `DATABASE_URL` is a `file:` SQLite path.

Runtime guard: `src/lib/db/sqlite-runtime.ts` throws in production if `CELEVENTIC_WEB_INSTANCES > 1` unless `CELEVENTIC_ALLOW_MULTI_WRITER=1`.

## What the in-process ticket gate does and does not do

`withTicketGate` in `ticket.service.ts` serializes purchases for one ticket type **inside one Node process**. Isolated SQLite acceptance (12/12) depends on that.

It does **not** coordinate:

- PM2 cluster workers
- a second `next start` on the same database file
- a future multi-instance load balancer

Database-level safety still relies on `updateMany` compare-and-swap inside `prisma.$transaction`, SQLite's single writer, `PRAGMA busy_timeout=5000`, and WAL.

## Journal, timeout, backups, permissions, disk

On connect, Celeventic applies:

- `PRAGMA journal_mode=WAL`
- `PRAGMA busy_timeout=5000`
- `PRAGMA synchronous=NORMAL`
- `PRAGMA foreign_keys=ON`
- Prisma `file:` URLs get `socket_timeout=30`

Local `prisma/dev.db` was observed in DELETE journal mode before this guard. Production must use WAL so a backup can copy the `-wal` together with the main file, or checkpoint first.

Backup rules:

- Copy `production.db`, `production.db-wal`, and `production.db-shm` together, or `PRAGMA wal_checkpoint(FULL)` then copy the main file.
- Restore onto a disposable path first. Never overwrite live `prisma/production.db` in place without a snapshot.
- Isolated populated restore: `npm run test:recovery:populated`.
- Isolated empty-copy restore: `npm run test:recovery`.

File permissions: the Node user must own the database directory and be able to create `-wal`/`-shm` beside the main file. Disk exhaustion on that filesystem takes the whole platform down.

Corruption recovery: `PRAGMA integrity_check`. If it is not `ok`, restore the latest consistent snapshot onto a staging file, reconnect the app to that file, then cut over.

## What this phase must not do

- Do not switch Prisma `provider` to PostgreSQL automatically.
- Do not deploy to production from this batch.
- Do not treat a single-process PM2 layout as a substitute for transactional inventory checks.
