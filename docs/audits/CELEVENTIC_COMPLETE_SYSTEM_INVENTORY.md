# Celeventic complete system inventory (V2.0)

Date: 7 Nov 2026  
Root: `/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main`  
Method: filesystem enumeration plus code inspection. Not a production VPS audit.

Complete path lists (nothing omitted from discovery):

- `docs/audits/inventory/pages.txt` (150 `page.tsx` files)
- `docs/audits/inventory/api-routes.txt` (350 `route.ts` files)
- `docs/audits/inventory/prisma-models.txt` (208 Prisma models)

Git: this tree is gitignored by `/Users/auratheking/Documents/.gitignore` (`Aura Group Innovative/`). Apparent git root is AuraTapPay `main`. No independent Celeventic branch can be created here.

---

## Platform shape

| Surface | Count | Notes |
|---|---|---|
| App pages | 150 | Dashboard 52, admin 31, invitation create 13 |
| Layouts | 10 | Root plus dashboard/admin/auth/legal |
| API routes | 350 | Admin 61, events 33, public 20 |
| Prisma models | 208 | SQLite datasource |
| Test files | 188 | `tsx --test` suites, not one Jest project |
| Background workers | 1 | `scripts/video-jobs-worker.ts` via PM2 `celeventic-video-worker` |
| Health | `/api/health` | Present |

---

## Subsystem inventory

Status labels: COMPLETE AND VERIFIED / IMPLEMENTED BUT UNVERIFIED / PARTIALLY IMPLEMENTED / BROKEN / MISSING.

| Name | Purpose | Key paths | Status | Security | Tests | Recommended next |
|---|---|---|---|---|---|---|
| Auth / sessions | NextAuth Prisma adapter | `src/lib/auth.ts`, `src/middleware.ts` | IMPLEMENTED BUT UNVERIFIED | `/api` not in middleware | `src/lib/auth/__tests__` | Keep route-level auth |
| Event access helpers | Tenant membership + permission keys | `src/lib/workspace/event-access.ts` | COMPLETE AND VERIFIED helpers | Usage uneven | Permission matrix unit tests added this batch | Finish remaining `verifyEventAccess`-only routes |
| Events | Create, publish, cancel | `src/services/events`, `src/app/api/events` | PARTIALLY IMPLEMENTED | GET dumps guest graph | Missing E2E | Strip `qrToken` from event GET |
| Invitations | Design, publish, guest links | `src/services/invitations`, `src/app/invite` | PARTIALLY IMPLEMENTED | Blocks GET now gated | Template tests | Unify renderers |
| RSVP | Accept/decline/plus-ones | `src/app/api/rsvp` | PARTIALLY IMPLEMENTED | guestId now requires invitation proof | Deadline/proof unit tests | Prisma journey test |
| Ticketing | SKU, orders, QR | `src/services/tickets` | PARTIALLY IMPLEMENTED | Orders now `MANAGE_TICKETS` | Inventory/lifecycle unit tests | Prisma concurrency |
| Guest Entry Pass | Signed QR, offline pack, sync | `src/lib/admission`, `src/services/admission` | COMPLETE AND VERIFIED | Token hash stored | Integration tests | Keep as only staffed gate |
| Legacy `/api/qr` | Ticket/guest QR | `src/services/qr` | PARTIALLY IMPLEMENTED | Verify now requires `eventId` + `SCAN_QR` | Partial | Retire after clients move |
| Event wallet | Mutable balance | `src/services/wallet` | PARTIALLY IMPLEMENTED | Now `MANAGE_FINANCES` | None for ticket wallet | Double-entry |
| Gift ledger | Double-entry gifts | `src/services/gifts` | COMPLETE AND VERIFIED | Finance gate | Gift tests | Keep |
| Paystack | Init, verify, HMAC webhook | payment adapter | IMPLEMENTED BUT UNVERIFIED | HMAC | No sandbox E2E | Sandbox retry |
| Hubtel | Mobile money | payment.service | HARDENED | Shared secret required | Unit webhook guard | |
| Studio Editor | Invitation design | `src/components/invitation-studio` | PARTIALLY IMPLEMENTED | Auth on save | No studio tests | Autosave persistence |
| Template marketplace | Buy/sell templates | `src/services/template-engine` | PARTIALLY IMPLEMENTED | Paid buy 402 | None | Checkout |
| Vendor marketplace | Directory, booking | `src/services/vendor-os`, `marketplace` | PARTIALLY IMPLEMENTED | Public DTO strips contact | None | Calendar persist |
| Seating | Dual-stage studio | `src/lib/seating`, `src/app/api/events/[id]/seating` | COMPLETE AND VERIFIED engine | GET now `EDIT_SEATING`, no `qrToken` | Engine unit tests | Journey test |
| Entitlements | Packages, quotas | `src/services/entitlements`, `src/lib/packages` | IMPLEMENTED BUT UNVERIFIED | Server quota on guests/invites | Quota constants | Enforce ticket/SMS caps |
| Feature flags | Split stores | invitation/marketplace/services | PARTIALLY IMPLEMENTED | `isServiceEnabled` unused | None | Wire or delete unused helper |
| i18n | Custom EN/FR | `src/lib/i18n` | IMPLEMENTED BUT UNVERIFIED | Admin translations | No unit tests | |
| Legal/privacy | Policies, consent, export | `src/services/legal`, privacy-center | IMPLEMENTED BUT UNVERIFIED | Deletion is request-only | Gift privacy only | Erase pipeline |
| Support tickets | Customer cases | MarketplaceDispute unused | MISSING | | | Do not invent cash rewards |
| Referrals | Viral footer attribution | invitation-order attributionRef | PARTIALLY IMPLEMENTED | File promos | None | Prisma promos |
| AI tools | Planner/design suggest | `src/services/ai`, invitation-os | PARTIALLY IMPLEMENTED | Optional, mocks | None | Keep optional |
| SEO | robots/sitemap | `src/app/robots.ts`, `sitemap.ts` | PARTIALLY IMPLEMENTED | Private paths disallowed | Social OG tests | |
| Analytics | Invitation events | invitation-os analytics | IMPLEMENTED BUT UNVERIFIED | Aggregates | None | Platform-wide |
| Backups | Deploy-time SQLite `.backup` | `scripts/deploy-vps.sh` | IMPLEMENTED BUT UNVERIFIED | Not drilled | | Staging restore |
| CI | GitHub Actions | `.github/workflows/ci.yml` | IMPLEMENTED BUT UNVERIFIED | | | Needs Celeventic remote |
| Observability | Health, no Sentry | `/api/health` | PARTIALLY IMPLEMENTED | | | Error monitoring |

---

## External integrations (from code, not live-verified)

Paystack, Hubtel, Resend, SMS provider, WhatsApp Cloud, S3/MediaConvert (video), optional OpenAI planner. PostHog and Sentry are retired in `RETIRED_PROVIDERS`.

---

## Environment

Do not copy secrets. Names live in `.env.example` / `.env.local`. `DATABASE_URL` is SQLite `file:./dev.db` in the example. Production VPS uses a separate SQLite file. Never push or reset production.db from this session.

---

## Known P0 defects still open after this V2 batch

- Ticket-revenue wallet is not a ledger.
- Promo codes are JSON files.
- Account deletion is a request, not an erase.
- Support ticket queue is missing.
- `GET /api/events/[id]` still includes guest records for any member.
- Funeral candles GET by raw eventId.
- Admin service disable toggles may be no-ops.
- No scheduled backup restore evidence.
