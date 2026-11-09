# Celeventic progress tracker

Updated: 7 Nov 2026 after V2.3 quality gates (TypeScript 70→0, ESLint 11→0, build suppressions removed).

## Checkpoint

Working tree: `CELEVENTIC-main` with nested `.git` (no remote, no commits unless requested).

## Completed this V2.1 batch

- GET `/api/events/[id]` no longer returns guests, invitation `uniqueLink`, or ticket `qrToken`
- Guest directory requires `MANAGE_GUESTS` and strips QR tokens / gate codes / bearer links
- Seating plan and party payloads no longer include guest `qrToken`
- Wallet export writes an audit log
- Ticket-revenue ledger remains on EventWallet `TICKET` book (prior batch)
- PostgreSQL concurrency tests exist and skip without `CELEVENTIC_PG_TEST_URL`
- Data deletion requests are queued with discovery; no automatic erase
- Customer support tickets: create, list, reply, admin assign/status
- Private GitHub setup documented

## Tests executed

See the session completion report after `npm run test:integrity` and `npm run test:gifts`.

## Remaining P0

- Private GitHub remote and first Actions run (workflow now includes typecheck, lint, Prisma, gifts, integrity, admission, SQLite concurrency, production build)
- Paystack sandbox and provider settlement
- Full Playwright payment → QR → admission against seeded data (lifecycle spec added; mocked payments only)
- Live VPS `pm2 show celeventic` confirmation (ecosystem file is now explicit single-writer)
- Written authorization before production deploy
