# Celeventic requirements traceability (V1 + V2.0)

Date: 7 Nov 2026  
Completion uses the V2.0 labels. Presence of source code is not enough.

| Requirement ID | Description | Priority | Existing status | Implementation | Tests | Evidence | Completion | Risks |
|---|---|---|---|---|---|---|---|---|
| CEL-INV-001 | Event creation with categories, draft/publish | P0 | Partial | `event.service.ts`, `/api/events` | Missing E2E | Code exists | PARTIALLY COMPLETE | No journey test |
| CEL-INV-002 | Invitation publish and personalized guest experience | P0 | Partial | invitation services, `/invite/[link]` | Template/unit | Guest Entry Pass verified separately | PARTIALLY COMPLETE | Two renderers |
| CEL-RSVP-001 | RSVP accept/decline, plus-ones, duplicate protection | P0 | Partial | `/api/rsvp`, `submitRsvp` | deadline, proof, idempotency unit | Integrity suite 7 Nov 2026 | PARTIALLY COMPLETE | No Prisma E2E |
| CEL-RSVP-002 | RSVP deadline + CSV export | P0 | Implemented | Event.rsvpDeadline, `/api/events/[id]/rsvp-export` | CSV formula test | Export requires MANAGE_GUESTS | IMPLEMENTED — TESTING PENDING | Browser login blocked |
| CEL-TKT-001 | Ticket purchase with inventory hold | P0 | Partial | `ticket.service.ts` + in-process SQLite gate | inventory + isolated SQLite 40/10 | `npm run test:accept-sqlite` 7 Nov 2026 | IMPLEMENTED — TESTING PENDING | PostgreSQL skipped; browser E2E pending |
| CEL-TKT-002 | Idempotent payment confirm | P0 | Implemented | PENDING→PAID claim + sticky payment | inventory + payment-status | Code + unit | IMPLEMENTED — TESTING PENDING | Paystack sandbox pending |
| CEL-TKT-003 | Cancel / refund / transfer | P0 | Implemented | order PATCH | lifecycle unit | Provider refunds off | IMPLEMENTED — TESTING PENDING | Live refund BLOCKED |
| CEL-QR-001 | Online admission | P0 | Verified (Guest Entry Pass) | `src/lib/admission` | guest-pass.integration | Prior suite | COMPLETE — VERIFIED | Legacy QR still present |
| CEL-QR-002 | Offline sync and conflict policy | P0 | Verified (Guest Entry Pass) | IndexedDB pack | integration | Prior suite | COMPLETE — VERIFIED | Disconnected scanners cannot globally dedupe |
| CEL-QR-003 | Legacy QR verify must bind event + SCAN_QR | P0 | Fixed this batch | `/api/qr/verify` | permission matrix | eventId required | IMPLEMENTED — TESTING PENDING | Clients that omitted eventId will 400 |
| CEL-WALLET-001 | Gift double-entry ledger | P0 | Verified | event-wallet.service | gift tests | Prior suite | COMPLETE — VERIFIED | |
| CEL-WALLET-002 | Ticket/event wallet ledger | P0 | Implemented | EventWallet TICKET book + ticket-ledger.service | ticket-ledger.test.ts + isolated SQLite | Integer minor units, no live payouts | IMPLEMENTED — TESTING PENDING | Paystack settlement not proven |
| CEL-SEC-001 | Tenant isolation helpers | P0 | Verified helpers | event-access.ts | permission-matrix + tenant-isolation | Helpers complete | PARTIALLY COMPLETE | Not all routes use permissions |
| CEL-SEC-002 | RSVP guestId IDOR | P0 | Fixed this batch | guest-proof.ts | guest-proof.test.ts | Integrity suite | IMPLEMENTED — TESTING PENDING | InvitationId now required |
| CEL-SEC-003 | Seating GET must not leak qrToken | P0 | Fixed this batch | seating route | none API | qrToken removed | IMPLEMENTED — TESTING PENDING | |
| CEL-SEC-004 | Public vendor contact leak | P0 | Fixed this batch | public-vendor.ts | public-vendor.test.ts | Integrity suite | IMPLEMENTED — TESTING PENDING | Other `/api/vendors` catalog may still leak |
| CEL-SEC-005 | Webhook signature | P0 | Paystack HMAC; Hubtel secret | payment.service, paystack.ts | webhook-guard + paystack.test.ts | Integrity suite | IMPLEMENTED — TESTING PENDING | Sandbox HMAC not live |
| CEL-SEC-006 | Account deletion erase | P0 | Request tracked | DataDeletionRequest + discovery | none E2E | PENDING_REVIEW, no auto-erase | BLOCKED — BUSINESS DECISION | Retention policy undecided |
| CEL-SEC-007 | GET /api/events/[id] must not return guest graph or credentials | P0 | Fixed this batch | event-dto.ts, getEventById | event-dto.test.ts | Integrity suite 7 Nov 2026 (77 pass) | COMPLETE — VERIFIED | Guest CRM is /api/guests |
| CEL-PERF-001 | Pagination helpers | P1 | Verified helpers | pagination.ts | pagination-client test | ~174 unbounded findMany remain | PARTIALLY COMPLETE | Inbox 500 |
| CEL-STUDIO-001 | Studio create/save/preview/publish | P1 | Partial | invitation-studio | none | | PARTIALLY COMPLETE | |
| CEL-TPL-001 | Template marketplace paid purchase | P1 | Partial | 402 until checkout | none | Paid unlock blocked | PARTIALLY COMPLETE | Checkout missing |
| CEL-VENDOR-001 | Vendor directory and booking | P1 | Partial | vendor-os, marketplace | none | Contact stripped this batch | PARTIALLY COMPLETE | Calendar stub |
| CEL-ADMIN-001 | Admin command center | P1 | Partial | `/admin`, 61 APIs | none | Invitation analytics scoped | PARTIALLY COMPLETE | |
| CEL-ENT-001 | Packages and entitlements | P1 | Partial | entitlement.service, package-quota | quota constants | Billing GET only | PARTIALLY COMPLETE | ticketLimit unused |
| CEL-REF-001 | Referrals and promos | P2 | Partial | Prisma TicketPromo + CAS usedCount | promo.test.ts | File import on first list | IMPLEMENTED — TESTING PENDING | Per-user cap optional |
| CEL-SEAT-001 | Seating designer | P1 | Engine verified | seating-studio-client | seating unit tests | GET permission tightened | PARTIALLY COMPLETE | No studio E2E |
| CEL-AI-001 | Optional AI design | P2 | Partial mocks | ai services | none | Missing credentials must not break | PARTIALLY COMPLETE | Mocks |
| CEL-I18N-001 | EN/FR locale | P1 | Implemented | lib/i18n | none | Custom, not next-intl | IMPLEMENTED — TESTING PENDING | |
| CEL-LEGAL-001 | Privacy, terms, consent, export | P0 | Implemented | legal + privacy-center | none | Deletion not erase | PARTIALLY COMPLETE | Legal review required |
| CEL-SUP-001 | Support ticket workflow | P1 | Implemented | CustomerSupportTicket APIs | support-auth.test.ts | User/admin routes | IMPLEMENTED — TESTING PENDING | No UI yet |
| CEL-DR-001 | Backups and restore drill | P0 | Deploy-time SQLite backup | deploy-vps.sh + `test:recovery` + `test:recovery:populated` | isolated copy + populated Prisma reconnect | Disposable staging only | IMPLEMENTED — TESTING PENDING | Live VPS restore still open |
| CEL-FLAG-001 | Central feature flags | P1 | Split stores | admin-feature-flags, marketplace flags | none | isServiceEnabled unused | PARTIALLY COMPLETE | |
| CEL-API-001 | Rate limit, validation, pagination | P1 | Partial | rate-limit.ts, zod on many routes | gift/ticket/RSVP limits | | PARTIALLY COMPLETE | |
| CEL-SEO-001 | robots, sitemap, OG, noindex private | P2 | Partial | robots.ts, sitemap.ts, invite OG | social tests | Added this batch | IMPLEMENTED — TESTING PENDING | Sitemap is static |
| CEL-A11Y-001 | Reduced motion | P1 | Verified on experience engine | motion-profile, Femmora e2e | experience-engine test | Not all templates | PARTIALLY COMPLETE | |
| CEL-OPS-001 | CI and safe deploy | P0 | CI file expanded V2.3 | `.github/workflows/ci.yml` | not run on GitHub | typecheck+lint+build+sqlite accept in workflow | BLOCKED — EXTERNAL DEPENDENCY | No Celeventic remote |
| CEL-COMMS-001 | Email/SMS/WhatsApp delivery | P0 | Partial | campaigns | none | WhatsApp first-contact text will fail | PARTIALLY COMPLETE | Template send needed |

Do not mark the platform production-ready from this matrix.
