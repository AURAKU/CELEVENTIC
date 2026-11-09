# Celeventic production readiness

Status: NOT READY to declare production-complete.

## What exists

- Manual VPS scripts: `scripts/deploy-vps.sh`, `scripts/deploy-celeventic-live.sh`
- PM2: `ecosystem.config.js` (`celeventic`, `celeventic-video-worker`)
- Health: `src/app/api/health/route.ts`, admin system health
- SQLite backup restore trap inside the deploy script
- Ops notes under `docs/ops/`

## What is missing or unverified

- GitHub Actions / CI gate (workflow expanded; not run on GitHub, no Celeventic remote)
- Staging environment (requirements documented in `CELEVENTIC_STAGING_RECOVERY.md`)
- Documented rollback rehearsal with a recorded result
- Isolated SQLite backup copy drill recorded (7 Nov 2026). Staging host + app reconnect still open
- Production `next build` compiled locally to `.next-verify` (TS/ESLint still ignored in `next.config.ts`)
- Error monitoring (Sentry retired)
- Live payout enablement (must stay off until financial tests pass)
- Independent Celeventic git remote (local git workflow documented; push unauthorized)
- Paystack sandbox charges

## Authorization

Do not deploy to the live VPS, run production Prisma push, process live charges, or enable payouts without an explicit written approval after this report is reviewed.

## Recommended next ops work (after code P0)

1. Create a Celeventic-only git repository
2. Add CI: lint, `test:integrity`, `test:admission`, build
3. Add a staging host that is not production
4. Rehearse backup restore on staging
5. Only then request production deploy approval
