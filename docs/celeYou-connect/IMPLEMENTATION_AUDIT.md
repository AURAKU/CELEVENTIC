# CeleYou Connect implementation audit

Date: 12 Nov 2026  
Branch: `feat/celeyou-connect`  
Database: SQLite via Prisma 6 (`provider = "sqlite"`). Additive SQL only. Never `prisma db push` on `prisma/production.db`.

This audit describes what exists in code. A route or table is not treated as complete unless the write path, authorization, and a guest or studio surface were verified.

## 1. Existing capabilities

### Platform

- Next.js 15.5.19, React 19, NextAuth JWT sessions, Prisma 6.19.3, SQLite.
- Auth: credentials + Google. Roles include `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`. Suspended accounts drop the JWT.
- Background jobs: `BackgroundJob` table + `scripts/video-jobs-worker.ts` (PM2 `celeventic-video-worker`). Redis is rate limit/cache, not a queue.
- Email: Resend through `communicationService.trySendDirect`. SMS Hubtel. WhatsApp Graph. Local keys are empty, so sends fail closed.
- In-app notifications: `Notification` + `/api/notifications` + header bell.
- Feature flags: `AdminSetting` JSON for invitations and marketplace only. CeleYou has no Connect flags yet.
- Billing: monthly GH₵49 through yearly GH₵449 (`SMARTCARD_PLANS`). Paystack. Guest Connect Back is not gated on a paid term beyond the live-card public gate.

### Connect Back (Type A, guest, no account)

Implemented end to end.

- Guest CTA on a live, non-dummy card: `DigitalCardPublicView`.
- Public `POST /api/digital-business-cards/connect`.
- Rate limits: 5 per slug+IP / 300s, 30 per IP / 300s.
- Dummy slug `ama-serwaa` never writes a row (404 for non-admins, fake `{ connectionId: "demo" }` for admins).
- Row: `SmartCardConnection` (`smartcard_connections`), `source: "connect_back"`, `status: "NEW"`, `consentAt` stamped automatically.
- Studio inbox: `#studio-inbox`, page size 20, statuses `NEW | CONTACTED | QUALIFIED | FOLLOW_UP | WON | ARCHIVED`.

### Related flows that already write the same table

- Courtesy reconnect (`source: "courtesy_reconnect"`): consent checkbox, owner in-app + email, 6 hour duplicate window.
- Meetings (`source: "meeting"`): owner notify + email, inbox confirm/decline.
- Tap-to-Connect: separate `CeleYouProximitySession` tables. Signed-in only. Does not insert `smartcard_connections`.

### Inbox, privacy, analytics

- Owner listing is session + card `userId` match.
- Guest payloads strip owner-only fields (`CELECARD_OWNER_ONLY_FIELDS`).
- Card analytics: `SmartCardInteraction` kinds including `connect`. First-party only.

## 2. Missing capabilities (vs this directive)

| Release | Gap |
|---|---|
| 1 | Two-way Exchange Cards with explicit confirm, snapshots, idempotency |
| 1 | Consent checkbox on Connect Back (today `consentAt` is automatic) |
| 1 | Owner in-app/email on Connect Back (meetings and courtesy already notify) |
| 1 | Automatic thank-you follow-up with per-card settings, durable jobs, delivery states |
| 1 | Guest company / title fields (schema exists, public form does not send them) |
| 1 | Inbox search, owner notes, exchange source label |
| 1 | Server-side Connect feature flags |
| 1 | Honeypot fake-success is unreachable (`website` max length 0 fails Zod first) |
| 2 | Relationship timeline UI, smart reminders, enrichment |
| 3 | HubSpot / Salesforce / Zoho. No OAuth CRM connectors exist |
| 4 | Org-scoped cards, team sharing, lead assignment. `Organization` exists for events, not CeleYou cards |
| All | Email/SMS provider credentials locally **BLOCKED**. Delivery is scheduled and audited; SENT means provider API accepted, never “delivered” without webhooks |

## 3. Relevant source files

- `prisma/schema.prisma`: `DigitalBusinessCard`, `SmartCardConnection`, `Notification`, `BackgroundJob`, `Organization`
- `src/app/api/digital-business-cards/connect/route.ts`
- `src/services/digital-business-card/digital-business-card.service.ts` (`createSmartCardConnection`)
- `src/services/digital-business-card/courtesy-reconnect.service.ts` (`listCardConnections`)
- `src/components/digital-business-card/digital-card-public-view.tsx`
- `src/components/digital-business-card/digital-card-connection-inbox.tsx`
- `src/lib/digital-business-card/leads.ts`
- `src/lib/digital-business-card/demo-card.ts`
- `src/lib/queue.ts`, `src/lib/job-handlers.ts`, `scripts/video-jobs-worker.ts`
- `src/services/communications/communication.service.ts`
- `src/services/notifications/notification.service.ts`
- `scripts/sql/apply-celeyou-sqlite.ts`, `scripts/deploy-vps.sh`

## 4. Database impact

Additive only.

- New nullable columns on `smartcard_connections` for exchange identity, snapshots, notes, follow-up consent, search text.
- New tables: automations, deliveries, events, notification preferences, reminders (R2-ready, unused until flagged).
- Optional `runAfter` on `background_jobs` so delayed follow-ups are durable.
- Existing Connect Back, courtesy, meeting, payment, QR, and NFC rows stay untouched.

## 5. Security risks (pre-change)

- Connect Back stamps consent without a checkbox.
- Honeypot cannot take the silent-success path.
- Connect Back does not notify the owner, so the inbox is pull-only (availability risk, not a leak).
- No reciprocal identity on the connection row, so a signed-in visitor cannot be matched later without a new exchange model.
- CRM tokens: none stored today. Do not add until OAuth sandboxes exist.

## 6. Migration requirements

- Prisma migration `20261112121500_celeyou_connect_release1` (CREATE IF NOT EXISTS / ADD COLUMN guarded).
- Duplicate-safe `scripts/sql/apply-celeyou-connect-sqlite.ts` for VPS (`apply-celeyou-sqlite.ts` pattern).
- `npx prisma generate` after schema change. Never production `db push`.

## 7. Dependencies

No new npm packages. Reuse Prisma, NextAuth, Zod, existing Resend adapter, existing `BackgroundJob` worker, existing notification table.

**BLOCKED without credentials:** live email/SMS/WhatsApp, Paystack checkout, Google OAuth, HubSpot/Salesforce/Zoho OAuth, Resend delivery webhooks.

## 8. Implementation order

1. Audit (this file) and commercial note.
2. Flags + additive schema + worker `celeyou-connect` queue.
3. Release 1: guest consent, owner notify, follow-up jobs, Exchange Cards, inbox search.
4. Tests for pair keys, consent, idempotency, templates, flags.
5. Release 2+ behind flags (`connect_relationship_timeline`, `connect_enrichment`, `connect_crm_integrations`, `connect_enterprise`).

## 9. Test strategy

- Unit: pair key, idempotency, consent, follow-up copy, delay clamp, flags, snapshot privacy.
- Source: Exchange Cards CTA, Connect automations panel, inbox search.
- Integration: SQLite create + duplicate exchange (local `prisma/dev.db` only).
- E2E guest Connect Back: existing public form plus consent. CRM and enterprise: **NOT RUN** (no sandbox).
- Never mark email “delivered”. `SENT` = `trySendDirect` returned `{ ok: true }`.

## 10. Deployment risks

- Worker must list `celeyou-connect` or follow-ups stay `SCHEDULED`.
- Resend key missing: jobs retry then `FAILED`. Connections still save.
- Do not restart `pm2` all. Do not deploy without authorization.
- Feature flags default: exchange, notifications, and auto-follow-up **code** on; per-card follow-up **off**.
