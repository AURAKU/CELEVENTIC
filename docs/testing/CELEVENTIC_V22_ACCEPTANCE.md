# Celeventic V2.2 — Phase 1 production acceptance

Date: 7 November 2026  
Tree: `CELEVENTIC-main`  
Production deploy: not performed. Live payouts: off. Production migrations: not run.

Status categories: **VERIFIED** | **IMPLEMENTED — ACCEPTANCE PENDING** | **BLOCKED** | **FAILED**

Phase 1 is **not complete**. Critical external gates remain open.

---

## 1. Actual database provider

**VERIFIED**

Celeventic currently uses **SQLite**, not PostgreSQL, in both the Prisma schema and the production deploy scripts.

| Surface | Finding |
|---|---|
| `prisma/schema.prisma` datasource | `provider = "sqlite"` |
| `prisma/migrations/migration_lock.toml` | `provider = "sqlite"` |
| Local `.env.local` / `.env.example` | `DATABASE_URL` scheme `file:` |
| `.env` / `.env.production` in this tree | absent |
| VPS deploy scripts | `DB_PATH=prisma/production.db` on `/var/www/CELEVENTIC` |
| Local Docker Postgres `:5432` | listening, **not** wired as `DATABASE_URL` |

There is one Prisma schema. Development and production are not split providers. PostgreSQL remains a future migration, not the current production engine.

`prisma db push` cannot create a fresh SQLite file because `digital_business_cards.socials JSONB DEFAULT {}` is invalid SQLite. Isolated tests clone applied DDL from `prisma/dev.db` into `/tmp` and never copy rows.

Detail: `docs/architecture/CELEVENTIC_DATABASE_ARCHITECTURE.md`

---

## 2. PostgreSQL or production-equivalent concurrency

**VERIFIED on SQLite (the production engine).**  
**BLOCKED for PostgreSQL** (`CELEVENTIC_PG_TEST_URL` unset; switching providers is not authorized).

Command: `npm run test:accept-sqlite`

Isolated empty database under `/tmp`. No writes to `prisma/dev.db` or `prisma/production.db`.

| Case | Result |
|---|---|
| 1. Forty buyers / capacity 10 | PASS — 10 holds, no oversell |
| 2. Concurrent final-ticket reservations | PASS — one winner |
| 3. Duplicate order confirmations | PASS — one mint |
| 4. Repeated payment webhooks | PASS — one ledger sale, net 9500 |
| 5. Concurrent ledger posting | PASS — idempotent |
| 6. Duplicate refunds | PASS — one reversal, soldCount 0 |
| 7. Promo redemption races | PASS — maxUses 1 |
| 8. Transaction rollback | PASS — no stray orders |
| 9. Reservation expiration | PASS — hold released |
| 10. Payment after expiration | PASS — no mint |
| 11. Service-level event lifecycle | PASS — not browser E2E |
| 12. Gift vs ticket book isolation | PASS |

Fixes applied during this run:

- Pending ticket holds now expire after 15 minutes (`TICKET_RESERVATION_TTL_MS`). Confirming an expired hold no longer rolls back the `EXPIRED` write.
- SQLite `file:` URLs get `socket_timeout=30`.
- Purchases for the same ticket type are serialized in-process. This matches a single Node/PM2 `celeventic` process. It does **not** cover a multi-process cluster on one SQLite file.

---

## 3. Paystack sandbox

**BLOCKED**

`.env.local` has empty `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`. Fixture HMAC tests still pass. No sandbox initialize, charge, webhook, or settlement was executed. Nothing was fabricated.

Internal ledger balance is **not** proof that Paystack settled funds. Provider reconciliation remains open.

---

## 4. TypeScript and production build

Re-checked on the live tree 7 Nov 2026 after V2.3 quality gates. Ledger, HMAC, and event GET were not rebuilt. Detail: `docs/testing/CELEVENTIC_V23_ACCEPTANCE.md`.

| Check | Command | Result |
|---|---|---|
| Heap / environment | `NODE_OPTIONS=--max-old-space-size=4096` | **VERIFIED** as environmental. Default ~2GB heap previously OOM'd on this 8GB machine. 4GB completes. |
| `tsc --noEmit` | `NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck` | **VERIFIED** — 0 errors, exit 0 (was 73/70 invitation/studio mismatches; source-fixed in V2.3) |
| ESLint | `npm run lint` | **VERIFIED** — 0 errors, 0 warnings (was 11 existing Errors) |
| Prisma validate | `DATABASE_URL=file:./dev.db npx prisma validate` | **VERIFIED** |
| Unit / integrity | `npm run test:gifts` / `test:integrity` | **VERIFIED** — 70 gift pass; 77 integrity pass, 2 PostgreSQL skipped |
| Build suppressions | `next.config.ts` | **VERIFIED removed** — no `typescript.ignoreBuildErrors`, no `eslint.ignoreDuringBuilds` |
| Production build | `NEXT_DIST_DIR=.next-verify NODE_OPTIONS=--max-old-space-size=4096 npm run build` | **VERIFIED** unsuppressed — compile, typecheck, lint, static generation, route generation, `BUILD_EXIT: 0` |

Strict checks stay on. Application files were not excluded.

---

## 5. CI status

**IMPLEMENTED — ACCEPTANCE PENDING**

`.github/workflows/ci.yml` exists (Prisma validate/generate, typecheck at 6GB heap, gifts, integrity, admission, lint). There is no GitHub or Origin remote. GitHub Actions has **not** run. The workflow file is not a green check.

---

## 6. Git status

**IMPLEMENTED — ACCEPTANCE PENDING**

- Nested git at `CELEVENTIC-main`
- Branch `main`, **zero commits**, **no remote**
- `.env`, `.env.local`, `prisma/*.db`, `credentials.json` are gitignored
- `.env.example` is safe (empty payment keys)

Initial commit plan (not executed, push not authorized):

```bash
git add .gitignore .env.example .github .nvmrc README.md package.json package-lock.json \
  tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs playwright.config.ts \
  instrumentation.ts docker-compose.yml ecosystem.config.js prisma src scripts docs e2e public \
  backend brand-source
git status   # confirm no .env, no prisma/*.db, no .next
# commit only after explicit authorization
```

Do not add `.env.local`, `prisma/*.db`, `.next/`, `node_modules/`, `public/uploads/**`.

---

## 7. Backup restore

**IMPLEMENTED — ACCEPTANCE PENDING** (isolated copy **VERIFIED**; app reconnect and staging host **not** proven)

Command: `npm run test:recovery`

| Field | Value |
|---|---|
| Timestamp (UTC) | 20261107T072400Z |
| Work directory | `/tmp/celeventic-v22-recovery-20261107T072400Z-tLWn` |
| Source | read-only copy of `prisma/dev.db` (4,149,248 bytes) |
| Integrity | `PRAGMA integrity_check = ok` |
| Restoration duration | 1 second |
| Production files touched | none |
| Schema / counts | events 3, invitations 2, tickets/orders/payments/ledger 0 |
| Application connectivity | not tested (running next-server left on its existing URL) |

Limitation of the empty-copy drill: local `dev.db` has no ticket or ledger rows, so that run proves copy/schema/count fidelity only.

Populated disposable restore (`npm run test:recovery:populated`) **VERIFIED** later the same day: synthetic event, ticket soldCount 3, gift book 2500, ticket book 9500, ledger sum 12000, `PRAGMA integrity_check = ok`, Prisma reconnect to the restored temp file, `prisma/dev.db` and production untouched. Live VPS restore is still open.

---

## 8. Security regression (`GET /api/events/[id]`)

**VERIFIED**

- Route uses `toEventApiResponse`
- `getEventById` does not include `guests` or `invitations`; tickets omit `qrToken`
- Integrity tests: anonymous 401, unauthorized 403, members 200 without guest graph / `uniqueLink` / `qrToken`
- `GET /api/guests` requires `MANAGE_GUESTS` and strips secrets
- Seating routes remain permissioned and stripped
- Companion studio still returns `uniqueLink` for `EDIT_INVITATIONS` only (studio bearer, not the general event GET)

---

## 9. Event lifecycle E2E

**IMPLEMENTED — ACCEPTANCE PENDING**

Service-level isolated SQLite path (event → invitation → RSVP guest → payment row → ticket confirm → QR row → ledger 9500, gift book 0) **passed**.

`e2e/phase1-lifecycle.spec.ts` exists (desktop + 390×844, mocked payment intercepts). A full Playwright money-path run has **not** been recorded as passing. Do not treat unit, service, or mocked-route coverage as Paystack sandbox or full browser acceptance.

Failure path covered at service level: expired reservation refuses payment confirmation.

---

## 10. Remaining blockers

1. Paystack **test** keys and sandbox charges, including provider settlement vs internal ledger
2. GitHub/Origin remote and an actual Actions run
3. Browser E2E of the full money path against seeded data (Playwright spec exists; not a recorded pass)
4. Live VPS confirmation of `pm2 show celeventic` (ecosystem file is explicit `instances: 1` / `exec_mode: fork`)
5. PostgreSQL provider change (optional future; not current production)
6. Authorized initial git commit and (later) private remote

---

## 11. Phase 1 readiness

**Not ready to declare Phase 1 complete.**

| Gate | Status |
|---|---|
| Financial implementation (ledger, isolation, idempotency, HMAC, promos, auth) | VERIFIED at unit + isolated SQLite |
| Production-engine concurrency (SQLite) | VERIFIED |
| Event GET guest-graph leak | VERIFIED |
| Paystack sandbox + provider settlement | BLOCKED |
| TypeScript clean + unsuppressed production build | VERIFIED locally; GitHub Actions has not run |
| GitHub CI | IMPLEMENTED — ACCEPTANCE PENDING |
| Staging backup restore with app reconnect | IMPLEMENTED — ACCEPTANCE PENDING |
| Browser event-lifecycle E2E | IMPLEMENTED — ACCEPTANCE PENDING |

Do not deploy. Do not enable live payouts. Do not run production migrations.
