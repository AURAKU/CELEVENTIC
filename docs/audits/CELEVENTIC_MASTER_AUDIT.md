# Celeventic master audit

Date: 7 Nov 2026  
Scope: `/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main`  
Method: repository inspection and existing tests. This is not a production VPS audit and not a load test.

Classification rules:

- COMPLETE AND VERIFIED: implementation and tests both exist for that slice
- IMPLEMENTED BUT UNVERIFIED: real code, no journey test
- PARTIALLY IMPLEMENTED: required path is stubbed, unwired, or incomplete
- BROKEN: code cannot do what the UI or docs claim
- MISSING: not found
- DEPRECATED: still reachable but superseded

Git: nested repository now exists inside `CELEVENTIC-main` (zero commits, no remote). Parent Documents still gitignores this folder. Push and GitHub Actions remain unauthorized.

---

## Feature inventory

| Area | Status | Evidence | Priority |
|---|---|---|---|
| Guest Entry Pass (signed QR, IndexedDB pack, sync, conflicts, duplicate policy) | COMPLETE AND VERIFIED | `src/lib/admission/*`, `src/services/admission/__tests__/guest-pass.integration.test.ts` | Keep |
| Invitation create / studio save / order publish | PARTIALLY IMPLEMENTED | `invitation.service.ts`, `invitation-order.service.ts`. Create goes `ACTIVE`. Two renderers. | P1 |
| Personalized guest names and seating | COMPLETE AND VERIFIED | `place-card.test.ts`, seating tests | Keep |
| Per-guest invitation photos | MISSING | `Guest` has no photo field | P2 |
| RSVP accept/decline and plus-ones | PARTIALLY IMPLEMENTED | Deadline, identical-submit reuse, CSV export landed this round. No Prisma journey test. | P0 |
| Ticketing purchase / inventory / issuance | IMPLEMENTED BUT UNVERIFIED | Transactional purchase/confirm, reservation TTL, in-process SQLite purchase gate. Isolated SQLite 40/10 concurrency passed. PostgreSQL still skipped. Browser E2E pending. | P0 |
| Paystack init + HMAC webhook | IMPLEMENTED BUT UNVERIFIED | HMAC-SHA512 of raw body, sticky SUCCESSFUL, charge-only parse. Fixture tests pass. Sandbox E2E pending. | P0 |
| Hubtel unsigned webhooks | HARDENED this round | Previously accepted when enabled with no secret. Now rejected. | P0 |
| Event wallet (`wallet.service.ts`) | IMPLEMENTED BUT UNVERIFIED | Ticket revenue posts to EventWallet TICKET book (gross credit + commission debit). Legacy Wallet rows remain a projection. Live payouts off. | P0 |
| Gift event-wallet ledger | COMPLETE AND VERIFIED | `event-wallet.service.ts` + ledger tests | Keep |
| Legacy `/api/qr/offline` plaintext tokens | HARDENED this round | Tokens now SHA-256 hashed. Guest Entry Pass remains the primary gate. | P0 |
| Studio Editor | PARTIALLY IMPLEMENTED | Preview canvas, autosave, in-memory undo, sessionStorage versions. No studio tests. | P1 |
| Template marketplace paid Buy | HARDENED this round | Was inserting a purchase with no Paystack. Paid unlock now returns 402. | P1 |
| Creator onboarding / moderation / earnings | MISSING or unwired | `submitDesignerTemplate` / `approveTemplate` never imported by a route | P1 |
| Vendor marketplace | PARTIALLY IMPLEMENTED | Discovery, bookings, reviews exist. Availability calendar is “coming soon”. Vendor verification submit is missing. | P2 |
| Communications | PARTIALLY IMPLEMENTED | Resend / SMS / WhatsApp Cloud. WhatsApp uses text messages. Campaigns have no retry. Hubtel secret historically in query string. | P0 |
| Admin analytics | IMPLEMENTED BUT UNVERIFIED | Invitation commerce analytics, not platform-wide. Unbounded `findMany` remains in admin catalog. | P1 |
| Pagination helpers | PARTIALLY IMPLEMENTED | `PUBLIC_GRID_LIMIT` used on public grids. Many `findMany` still unbounded. | P1 |
| CI | IMPLEMENTED BUT UNVERIFIED | `.github/workflows/ci.yml` added. Not run on GitHub yet (no Celeventic remote). | P0 |
| Observability | PARTIALLY IMPLEMENTED | `/api/health`, build fingerprint. Sentry/PostHog retired. | P1 |
| Production deploy | IMPLEMENTED BUT UNVERIFIED | `scripts/deploy-vps.sh`, PM2, SQLite backup restore trap. Not executed in this audit. | P0 |

---

## Security findings (code-backed)

1. Ticket `confirmPurchase` could mint extra QRs and increment `soldCount` on webhook retry. **Mitigated this round** with PENDING-to-PAID `updateMany` claiming.
2. Paid template unlock wrote a `templatePurchase` without payment. **Mitigated this round** with HTTP 402.
3. Legacy offline pack shipped raw admission tokens. **Mitigated this round** with SHA-256 hashes. Manual gate codes remain plaintext by design (short typed codes).
4. Hubtel webhook accepted unsigned callbacks when enabled. **Mitigated this round**.
5. Object-level event access exists (`verifyEventAccess`, `requireEventPermission`) but is not uniformly proven by tests across every API.
6. Public ticket purchase endpoint is unauthenticated (expected for guests) and still needs rate limiting review.
7. Promo codes are Prisma-backed with transactional `usedCount` CAS. Legacy JSON files are imported on first list. Per-user caps are optional and unused unless set.

---

## Performance findings

- Pagination helpers exist and are used on catalogue, discover, vendors, and design-studio grids.
- Unbounded `findMany` still appears in admin invitation catalog, campaign send, ticket stats, and several RSVP paths.
- Campaign send updates per recipient (N+1).
- Inbox loads 500 messages then paginates in memory.
- Core Web Vitals were **not measured** in this audit. Do not treat LCP/INP/CLS targets as current results.

---

## Acceptance gaps for the event money path

Required journey: Event creation → invitation → RSVP → payment → ticket → QR → offline sync → financial reconciliation.

| Step | Code | Automated proof |
|---|---|---|
| Event creation | Yes | Missing E2E |
| Invitation publish | Yes | Partial template tests |
| RSVP | Yes | Helper tests only |
| Payment verify | Paystack HMAC + verify API + sticky success | Fixture tests. Sandbox E2E pending |
| Ticket issue | Yes, now idempotent confirm | Inventory CAS + confirm-once tests |
| Online QR | Guest Entry Pass | Integration tests (prior suite) |
| Offline sync | Guest Entry Pass | Integration tests (prior suite) |
| Wallet reconcile | Gift ledger + ticket TICKET book | Gift tests + ticket-ledger tests |

---

## What this audit did not do

- No production SSH, PM2, Nginx, or live database inspection
- No payment sandbox charges
- No load test of QR scanning
- No dependency CVE scan
- No claim that remaining roadmap items are complete
