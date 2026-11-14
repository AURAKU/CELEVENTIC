# CeleYou final system audit and production readiness

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Local runtime:** `next dev` on `127.0.0.1:3012` with `DATABASE_URL=file:prisma/dev.db`  
**Isolated production build:** `NEXT_DIST_DIR=.next-gate`  
**Live production:** not deployed, not mutated  
**Dummy card:** `ama-serwaa` remains admin-only  

This is the final quality gate after:

1. The original 20-issue profile remediation  
2. Advanced Digital Card Studio  
3. NFC and QR / universal sharing  
4. Subscriptions and renewal  
5. Analytics and engagement  

Nothing was committed, pushed, or deployed. No production records, balances, or payment rows were changed. No Prisma migrate or `db push` was run against production.

## Verdict

**DO NOT DEPLOY.**

Status: **NOT PRODUCTION-READY**.

The five CeleYou phases are integrated in local source, unit-tested, typechecked with an 8 GB heap, linted, and production-built into `.next-gate`. Guest, owner, NFC, billing catalog, and shared Celeventic surfaces that could be exercised on this machine passed. Critical gaps remain: Playwright never ran, Safari and Firefox were not tested, a full admin operator session was not driven, expired and unpublished HTTP states were not live-probed, and the uncommitted tree still contains unrelated invitation-template deletions plus a `STRIPE` enum that is not part of CeleYou prepaid checkout.

Do not treat celeventic.com as updated. Stop at this approval gate.

## Gate scores

| Gate | Status | Evidence |
| --- | --- | --- |
| Integration of five phases | **PASS** | Conflicts found in renewal typing; Paystack-only subscribe, stable `/u` `/c` `/n`, no analytics paywall, no `publicToken` rotation on design restore |
| User journey | **PASS with gaps** | Studio, publish, public profile, MoMo sheet, Alipay lock, Save Contact, NFC replaced/unknown. Fresh signup and expired HTTP not live-run |
| Admin journey | **PASS (authz) / BLOCKED (operator UI)** | Organizer redirected to `/dashboard?error=admin_forbidden`. Admin APIs 403. Operator desk not driven with an admin session |
| Cross-device | **PASS (Chromium) / BLOCKED (other browsers)** | Desktop and emulated 390×844. Playwright Chromium install previously stalled. Safari, Firefox, real iOS/Android not run |
| Security | **PASS with residual gaps** | Headers, QR allowlist, NFC token auth, owner NFC rate limit, Paystack HMAC unit tests. CSP and HSTS belong to Nginx and were not verified |
| Performance | **PASS with notes** | Public API 492 ms, VCF 230 ms, OG JPEG 34.7 KB, `/card/[slug]` First Load JS 316 kB. Evil QR reject was 13.7 s on a cold route |
| Database safety | **PASS** | No production DB work. CeleYou phases need no migration. Additive unused `STRIPE` enum is unrelated |
| Regression | **PASS** | `test:auth` 21/21, `test:integrity` 85 pass / 2 skip, `test:financial` 114 pass / 2 skip, invitation catalogue 16 templates, organizer dashboard |
| Automated quality | **PASS** | `test:celeyou` 307/307, lint exit 0 (warnings only), `tsc --noEmit` exit 0 with 8 GB heap, `next build` `.next-gate` exit 0 |
| Playwright / e2e | **BLOCKED** | Chromium download previously stalled at 0% of 178.7 MiB. Specs exist and were not executed |
| Live production smoke | **BLOCKED** | Not deployed. Live tabs often `chrome-error`. Prior health check is stale relative to this source |

## 1. Integration review

### 1.1 Conflicts found and resolved this gate

| Conflict | Resolution | Status |
| --- | --- | --- |
| `runSmartCardRenewalReminders` used `subscriptionStatus: { in: ["ACTIVE", "EXPIRED"] as const }`, which Prisma rejects as readonly | Dropped `as const` so `include: { user }` type-checks | **PASS** |
| Tests passed `"USER"` into `RbacContext.role` (`UserRole` has no `USER`) | Tests now use `"GUEST"` (maps to logical USER, cannot extend) | **PASS** |
| `metadata.openGraph?.type` is not on the Next `OpenGraph` union | Test reads type through a narrow cast | **PASS** |
| Next auto-appended `.next-gate/types` and `.next-audit/types` to `tsconfig.json` | Include list restored to the committed set | **PASS** |
| First production build died `ENOSPC` at 4.3 GB free | Removed leftover `.next-audit`, `.next-github-verify`, `.next-ship-check`. Retry succeeded | **PASS** |
| Second production build worker OOM during typecheck | Retry with `NODE_OPTIONS=--max-old-space-size=8192` succeeded | **PASS** |

### 1.2 Invariants that still hold

| Invariant | Evidence | Status |
| --- | --- | --- |
| Identity trio `/u/{slug}`, `/card/{slug}`, `/c/{publicToken}`, `/n/{nfcToken}` | Kojo `publicToken=cmw9ryoql08kdb5gq7hisd05w`, active NFC `cmwaogena03fwb57vgkyttjwa`, replaced `cmwaq6k5p01psb52ez98t0l3r` | **PASS** |
| Design restore does not rotate `publicToken` | `nfc-qr-share.test.ts` asserts restore writes theme/socials only | **PASS** |
| Hardware UID is not auth | `NFC_HARDWARE_UID_IS_NOT_AUTH = true`; local SQLite NFC table has no hardware UID column | **PASS** |
| CeleYou checkout methods `card \| mobile_money \| bank_transfer` | Subscribe Zod schema; Alipay is not a CeleYou checkout method | **PASS** |
| Catalog GH₵49 / 129 / 239 / 399 + concierge 800 | Studio DOM: Monthly ₵49, Quarterly ₵129, Half-Yearly ₵239, Yearly ₵399 | **PASS** |
| Paid term cannot be cancelled | Billing copy in studio: “A paid term runs until expiry and cannot be cancelled.” | **PASS** |
| Analytics reuses `SmartCardInteraction`, no paid lock | Indexes `cardId+createdAt` and `kind`; analytics route has no entitlement gate | **PASS** |
| Premium templates are not gated | Studio shelves over existing 64 themes; tests forbid `requiresPro` | **PASS** |
| SQLite remains the Prisma provider | Local `file:prisma/dev.db` | **PASS** |

### 1.3 Unrelated uncommitted work that must not ship with CeleYou

| Item | Risk | Status |
| --- | --- | --- |
| `PaymentProvider.STRIPE` added to `prisma/schema.prisma` | Additive enum. CeleYou prepaid stays Paystack. Gift/ticket Stripe rails are a separate workstream | **Do not treat as CeleYou-required** |
| Deleted invitation template JPEGs under `public/templates/` | Unrelated local change. Shipping it would break invitation covers | **BLOCKER if mixed into a CeleYou commit** |

## 2. Completed features (source, not live)

| Phase | What is in source | Report |
| --- | --- | --- |
| 20-issue profile remediation | Hold contain-fit, dock, MoMo copy sheet, QR allowlist, OG JPEG, security headers, Connect Back | `PROFILE_AUDIT_REMEDIATION_2026-11-14.md` |
| Advanced studio | Live device previews, `designAfterThemeChange`, local drafts, industry shelves page size 12, unpublished-only server autosave | `ADVANCED_STUDIO_2026-11-14.md` |
| NFC / QR / sharing | Stable tokens, print QR ECC H margin 8, replace mints `/n`, lost/replaced copy, owner+admin NFC actions | `NFC_QR_UNIVERSAL_SHARING_2026-11-14.md` |
| Subscriptions | Paystack-only methods, open checkout reuse, renewal pages of 100 up to 5,000, admin payment history, courtesy blur | `SUBSCRIPTIONS_BILLING_RENEWAL_2026-11-14.md` |
| Analytics | Attempted vs completed taxonomy, QR vs NFC, trend/popular/device mix, 30 s poll, 1 event/kind/2 s dedupe | `BUSINESS_ANALYTICS_ENGAGEMENT_2026-11-14.md` |

## 3. User journey

Local card: Kojo Mensah, published, `subscriptionStatus=TRIAL`, NFC enabled. Locale on this session was Chinese (`celeventic_locale`).

| Step | Evidence | Status |
| --- | --- | --- |
| Account already signed in | Organizer `celecard.browser.209@local.test`. `/auth/register` redirected to `/dashboard` | **PASS** (existing session). Fresh registration **BLOCKED** |
| Card creation | Studio “New card” present. Existing Kojo card used; a new card was not inserted | **PASS** (control present). New-card insert **not live-run** |
| Profile customization | Identity, Design shelves (“Start from a look”), live Phone/Tablet/Desktop/Card/Guest previews, Reach, Connections, Follow-ups | **PASS** |
| Publishing | “Published / Guests can open this CeleYou” checked | **PASS** |
| Public profile | `/u/kojo-mensah` 200, title `Kojo Mensah on CeleYou`, one H1, QR on plate, wallet row, dock | **PASS** |
| QR sharing | Studio “QR live”. Allowed destination PNG 200. `/c/{token}` encodes production origin by design | **PASS** |
| NFC opening | Replaced tag 200 with “此 NFC 卡已被替换”. Unknown tag 200 with “无法识别此 NFC 卡”. Active token previously 307 to the public card | **PASS** |
| Contact saving | Dock “保存联系人” busy after tap. VCF 200 `BEGIN:VCARD`, FN Kojo Mensah, URL `https://www.celeventic.com/card/kojo-mensah`, bank and MoMo, no Alipay secret | **PASS** |
| Business interactions | MoMo opens copy sheet (“复制不会完成付款”), not `tel:`. Alipay is access-code locked. Connect and Share present on dock | **PASS** |
| Subscription renewal | Catalog buttons and “Activate Yearly · ₵399”. Term copy: activated 9 Nov 2026, expires 23 Nov 2026 | **PASS** (UI). Live Paystack charge **not run** |
| Expired | Unit tests: courtesy after grace, withheld unpublished/suspended, identity kept | **PASS** (unit). Live HTTP **BLOCKED** (only one published local card; not mutated) |
| Disabled / private | Alipay locked behind access code; public JSON `email`/`phone` null; Alipay secret absent | **PASS** |
| Unauthorized | Analytics 401, subscribe 401, admin API 403 for organizer | **PASS** |

## 4. Admin journey

| Area | Evidence | Status |
| --- | --- | --- |
| Access control | Organizer session hitting `/admin/celecard` landed on `/dashboard?error=admin_forbidden`. `src/app/admin/layout.tsx` uses `canAccessAdminPanel` | **PASS** |
| Admin API | `GET /api/admin/celecard` 403 `Forbidden` while organizer-authenticated | **PASS** |
| User management | `/admin/users` and `/api/admin/celecard/users` exist; RBAC unit tests deny organizers | **PASS** (code + unit). Operator UI **BLOCKED** |
| Card management | `/admin/celecard`, `/admin/celecard/[id]`, command directory filters grace/courtesy/expiring | **PASS** (code + unit). Operator UI **BLOCKED** |
| NFC assignment | Owner `POST /api/digital-business-cards/[id]/nfc` session + 20/hour rate limit. Admin NFC actions on existing command API with `createAuditLog` | **PASS** (code + unit) |
| Subscription management | `canPerformCeleCardAction` denies GUEST/ORGANIZER `extend` / `complimentary`; ADMIN allowed | **PASS** (unit) |
| Payment review | `listCeleYouPaymentsForCard` paginated; client success never activates | **PASS** (unit) |
| Analytics | Admin overview `publishedCards` + 30-day engagement in command service | **PASS** (unit) |
| Audit logs | Claim, suspend, and admin NFC paths call `createAuditLog`. `/admin/audit-logs` exists | **PASS** (code). Operator UI **BLOCKED** |

## 5. Cross-device, sharing, accessibility

| Check | Evidence | Status |
| --- | --- | --- |
| Desktop Chromium | Two-column guest layout, plate + wallet, dock | **PASS** |
| Emulated 390×844 | Stacked plate, QR visible, dock Save / Connect / Share | **PASS** |
| QR visibility | Visible on plate in both viewports | **PASS** |
| Modal behavior | MoMo copy sheet and Alipay unlock sheet portaled above the page | **PASS** |
| Contact download | VCF served; Save Contact control busy | **PASS** |
| Sharing | Studio Share My Card / Copy Profile Link present; guest Share on dock | **PASS** |
| Navigation | Studio sections Activity through Share; Celeventic dashboard and invitation catalogue | **PASS** |
| Accessibility | One main heading on the public profile; 48 px dock targets covered by unit tests; locale switch works | **PASS** with residual lint a11y warnings elsewhere in the repo |
| Safari / Firefox / real phones | Not executed | **BLOCKED** |
| Playwright viewports 320–1440 | Specs exist, browser binary missing | **BLOCKED** |

## 6. Security

| Control | Evidence | Status |
| --- | --- | --- |
| Authentication | `getServerSession` on subscribe, analytics, NFC mutate, admin | **PASS** |
| Authorization | Organizer cannot open admin. Analytics owner-only. NFC mutate scoped to `listNfcDevicesForUser` | **PASS** |
| Public profile exposure | Public JSON 1235 B, email/phone null, no Alipay secret. HTML `private, no-store` | **PASS** |
| Private links / protected content | Alipay “使用访问码显示”. Unlock sheet does not reveal the value | **PASS** |
| Payment verification | `celeYouPaymentEvidenceMatches` requires Paystack success + pesewas + currency. Client success never enough. HMAC unit tests pass | **PASS** |
| QR destination validation | `?data=https://evil.example/phish` and `javascript:alert(1)` both 400 `destination not allowed`. Celeventic `/c/{token}` 200 PNG | **PASS** |
| NFC assignment security | Token URL is auth. UID is not. Lost/replaced tags do not open the profile. Replace mints a new `/n` token | **PASS** |
| Rate limiting | Public events 40/min + 1/kind/2 s dedupe. Unlock 5/card/5 min. NFC mutate 20/hour. Connect, meet, reconnect limited | **PASS** |
| Security headers | `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` camera=(self) mic/geo/payment=(), no `X-Powered-By` | **PASS** |
| HSTS | Nginx, not Next | **BLOCKED** |
| Content-Security-Policy | Not set in Next. Needs a Paystack / maps / CDN allowlist at the proxy | **BLOCKED** |

## 7. Performance

Measured on local `3012` after the production build finished (dev server, not gzip). Next `compress: false` is intentional; gzip is Nginx.

| Metric | Measurement | Status |
| --- | --- | --- |
| Public JSON `/api/digital-business-cards/public/kojo-mensah` | 200, 492 ms, 1235 B, `private, no-store` | **PASS** |
| VCF | 200, 230 ms, 477 B | **PASS** |
| OG `/card/kojo-mensah/og` | 200, 728 ms, **34.7 KB JPEG** | **PASS** |
| Allowed QR PNG | 200, 1588 ms, 71 KB | **PASS** |
| First Load JS `/card/[slug]` | 14 kB route + 103 kB shared = **316 kB** | **PASS** (unchanged vs prior 315 kB) |
| Studio `/dashboard/business-card` | 27.2 kB + shared = **500 kB** | Acceptable for an authenticated desk |
| Billing | **326 kB** | Acceptable |
| NFC `/n/[token]` | **182 kB** | **PASS** |
| Invitation catalogue | **322 kB** | Regression intact |
| Interaction query path | `@@index([cardId, createdAt])`, `@@index([kind])`, trend clamp 4000 rows / 90 days | **PASS** |
| Cache | Static `/_next/static` immutable 1y. HTML and public JSON no-store | **PASS** |
| Evil QR reject | 400 in **13.7 s** on first hit | **FAIL** as a cold-route latency; not a security miss. Recheck on a warm production start before ship |
| Dashboard | Activity showed 604 views, 8 QR opens, 4 NFC taps, 22 save-contact, live poll | **PASS**. Trend / Popular / Load more were not confirmed in the visible viewport on this client bundle |

No additional product optimization was applied in this gate. The only verified bottleneck worth a follow-up is cold QR-reject latency and a Next restart so the Activity client bundle picks up trend/popular if it is still stale.

## 8. Database safety

| Rule | This gate | Status |
| --- | --- | --- |
| Do not delete production records | Local `prisma/dev.db` only | **PASS** |
| Do not reset production databases | No reset | **PASS** |
| Do not run destructive migrations | No migrate / `db push` | **PASS** |
| Do not change subscription balances | Kojo remains TRIAL | **PASS** |
| Do not modify production payment records | None touched | **PASS** |

CeleYou phases 2–5 add **no new Prisma model**. Analytics writes to existing `SmartCardInteraction`. Billing uses existing card and payment rows.

The only schema diff in the working tree is `enum PaymentProvider { STRIPE }`. On SQLite that is a string union, additive, and unused by CeleYou subscribe. If it ships with a later payments change, rollback is “stop using the value”; no table rewrite.

## 9. Regression

| Surface | Evidence | Status |
| --- | --- | --- |
| Auth | `npm run test:auth` 21/21 | **PASS** |
| Payments / tickets / gifts | `npm run test:financial` 70 gift + 44 payment/ticket, 2 PostgreSQL skips without `CELEVENTIC_PG_TEST_URL` | **PASS** |
| Integrity / crypto / privacy | `npm run test:integrity` 85 pass, 2 skip (same PG gap; SQLite is the provider) | **PASS** |
| Organizer dashboard | Welcome Kojo, events/guests/tickets/gifts/CeleYou nav intact | **PASS** |
| Invitation catalogue | `/invitations/catalogue` 16 templates, RSVP/maps/wishes copy, pagination | **PASS** |
| Guest Entry Pass / gift ledger / unique music | Not redesigned. Financial tests still cover gift ledger | **PASS** (not expanded) |

## 10. Production build and automated tests

| Check | Command | Result | Status |
| --- | --- | --- | --- |
| CeleYou unit | `npm run test:celeyou` | 307/307, 0 fail, ~20 s | **PASS** |
| Auth | `npm run test:auth` | 21/21 | **PASS** |
| Integrity | `npm run test:integrity` | 85 pass, 2 skip | **PASS** |
| Financial | `npm run test:financial` | 114 pass, 2 skip | **PASS** |
| Lint | `npm run lint` | exit 0, existing unused-var / hook warnings, no errors | **PASS** |
| Typecheck | `NODE_OPTIONS=--max-old-space-size=8192 npm run typecheck` | exit 0 in 135 s after gate fixes. Default ~2 GB heap previously OOM | **PASS** (requires 8 GB heap) |
| Production build | `NODE_OPTIONS=--max-old-space-size=8192 NEXT_DIST_DIR=.next-gate npx next build` | Next 15.5.19, compiled, typechecked, route table written, exit 0. First attempts: ENOSPC then SIGABRT OOM | **PASS** |
| Playwright | `e2e/celeyou-profile-audit.spec.ts` and adaptive specs | Browser binary not installed | **BLOCKED** |
| Browser tests | Cursor Chromium against :3012 | Guest, studio, NFC, catalogue, dashboard | **PASS** as a substitute, not a replacement for Playwright |

Default `tsc --noEmit` without an enlarged heap is an operational **FAIL** on this machine. CI and the VPS build must set `NODE_OPTIONS=--max-old-space-size=8192` (or equivalent).

## Remaining issues

1. Playwright and real Safari / Firefox / iOS / Android are unverified.  
2. Fresh account registration was not executed (session already authenticated).  
3. Expired, unpublished, and suspended HTTP states were not live-probed; they are unit-covered only.  
4. Admin operator UI (user, card, NFC assign, payments, analytics, audit) was not driven with an ADMIN session.  
5. Activity trend / popular / Load more were not confirmed on screen; counts and QR/NFC split were. Restart `next dev` before a visual recheck. Do not `pm2 restart all`.  
6. First-hit QR reject took 13.7 s. Recheck on a warm `next start` of `.next-gate`.  
7. CSP and HSTS are not in Next.  
8. Working tree mixes CeleYou with unrelated invitation JPEG deletions and a `STRIPE` enum.  
9. Disk hit 98% during this gate. Isolated leftover dist dirs were required to finish the build.  
10. `qr_evil` and some HTML routes stall when a production build is compiling on the same machine.

## Deployment blockers

1. **Do not deploy automatically.** This report is the approval gate.  
2. Playwright not run.  
3. Do not commit invitation template JPEG deletions with CeleYou.  
4. Decide separately whether `STRIPE` ships; CeleYou prepaid must remain Paystack GHS.  
5. Production build needs ≥8 GB Node heap and ≥10 GB free disk.  
6. Restart the serving Next process so clients receive the analytics bundle, then smoke `/u`, `/c`, `/n`, VCF, OG, billing.  
7. Nginx must add HSTS (and a reviewed CSP) at the proxy.  
8. Backup `prisma/production.db` before any VPS release. No CeleYou migration is required; backup is still mandatory.

## Rollback

CeleYou phases 2–5 are **code-only** relative to the current SQLite schema.

| If this ships | Rollback |
| --- | --- |
| Application code | Restore the previous `.next` build artifact and process. No `prisma migrate down` |
| `STRIPE` enum (if included) | Leave the value; stop selecting it. Do not rewrite SQLite |
| Payment / subscription rows | Do not hand-edit. Reverse only through the existing Paystack-verified path |
| NFC replace tokens | Replacing a tag mints a new `/n` token. Rolling back code does not restore an old tag URL; keep the current device row |

Do not `git reset --hard`, force-push, or `pm2 restart all`.

## Recommended release sequence

1. Isolate a CeleYou-only commit (exclude invitation JPEG deletions; treat `STRIPE` as a separate payments PR).  
2. CI: `NODE_OPTIONS=--max-old-space-size=8192` for `typecheck` and `next build`.  
3. Install Playwright Chromium and run `e2e/celeyou-profile-audit.spec.ts` plus adaptive viewports.  
4. Drive one ADMIN session through users, cards, NFC, payments, analytics, audit.  
5. Staging `next start` of `.next-gate`: public profile, `/c`, `/n` active/replaced/unknown, VCF, OG, subscribe 401, admin 403, QR allowlist, billing catalog.  
6. Confirm Nginx gzip, HSTS, and optional CSP.  
7. Snapshot production SQLite.  
8. Deploy only after a human approval of this report.  
9. Smoke live `/u/{slug}`, `/c/{token}`, `/n/{token}`, VCF, OG, Paystack webhook signature path.  
10. If anything fails, restore the previous build artifact. Do not edit payment rows.

## Production-readiness recommendation

**Hold. Do not release CeleYou to celeventic.com from this gate.**

The product source is coherent and the automated local bar now passes: 307 CeleYou tests, auth, financial, integrity, lint, typecheck with 8 GB, and an isolated production build. Guest NFC, QR allowlist, protected Alipay, MoMo copy, VCF, studio catalog, and organizer-vs-admin authz were evidenced in the browser or over HTTP.

That is not enough to call the system production-ready. Playwright, other browsers, a real admin operator pass, expired-state HTTP, and proxy headers remain unverified. The working tree is also unsafe to ship as a single blob.

Approve a **CeleYou-only** follow-up release after the blockers in the sequence above are closed. Until then, live production stays as it is.
