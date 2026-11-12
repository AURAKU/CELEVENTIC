# CeleYou Connect implementation log

## 12 Nov 2026

- Audited Connect Back, inbox, jobs, email, flags, billing, tests, deploy path. See `IMPLEMENTATION_AUDIT.md`.
- Created `feat/celeyou-connect`.
- Release 1 implemented locally:
  - Additive schema + `scripts/sql/apply-celeyou-sqlite.ts` (never production `db push`).
  - Guest Connect Back consent, honeypot silent path, company/title, optional thank-you opt-in.
  - Exchange Cards with preview, explicit confirm, public snapshots, dual inbox rows, `pairKey` idempotency.
  - Owner in-app + email notices; visitor in-app on exchange.
  - Per-card follow-up automations (default off, consent required by default, durable `BackgroundJob.runAfter`).
  - Connections inbox search, notes, exchange source, pagination unchanged at 20.
  - Notification preferences API.
  - Flags: exchange / follow-up / notifications on; timeline / enrichment / CRM / enterprise off.
- CRM, enrichment, enterprise, Resend webhooks: BLOCKED (no sandboxes / no delivery events).
- No production deploy. No `prisma db push` on production.db. No git commit unless asked.

## Commands run

Recorded in the session after `prisma generate`, local SQL apply on `prisma/dev.db`, and `npm run test:celeyou`.
