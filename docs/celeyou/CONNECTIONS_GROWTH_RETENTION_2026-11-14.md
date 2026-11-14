# CeleYou connections, business growth, and retention

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Status:** Discovery plus a small increment on existing Connect, meetings, share, and analytics. Not committed. Not deployed.

Official CeleYou mark, teals, original landscape plate, profile URLs, QR `/c/{token}`, and NFC `/n/{token}` were not replaced.

## Architecture summary

CeleYou already had a private connection graph (`SmartCardConnection`), consent-gated Connect Back, two-way exchange, follow-up email jobs, owner notes, lead statuses, paginated inbox, a local meeting desk that blocks taken slots, other-page booking links (Calendly and similar), location, payments, share/QR/NFC, owner-only analytics, and prepaid entitlements.

This increment reuses that graph. It does **not** add a second CRM, a fake Google Calendar, a rewards program, or organization tables.

```
Public card  → Connect Back / Exchange / Meeting / Tap
                    ↓
         SmartCardConnection (owner scoped)
                    ↓
     Labels · notes · reminders · export · delete
                    ↓
         Owner studio inbox (paginated)
```

Permanent identity stays username + `/c` + `/n`. Connections are a private layer on top.

## Phase 1 discovery

| Area | Status before this increment |
| --- | --- |
| Connect Back | EXISTS. Public form, honeypot, consent for contact details, owner notice |
| Contact management | PARTIAL. Paginated inbox, search, status, private notes. No owner labels, export, or delete |
| Meeting booking | EXISTS. Local desk with durations, WhatsApp place, request form, notifications. Other pages for Calendly. Does not sync Google Calendar |
| Business profiles | PARTIAL. Bio, company, location, website, payments, other pages. No optional hours/services toggle |
| Social sharing | EXISTS. Share, copy link, WhatsApp, email, QR PNG/SVG, NFC copy/write |
| Analytics | EXISTS. Views, QR, NFC, vCard tap vs download, connect, booking, social taps. Owner-only |
| Notifications | EXISTS. New connection alerts, exchange, follow-up, weekly summary. Marketing default off |
| Subscriptions | EXISTS. Pro prepaid. Unpublished Business/Teams catalog. `teamManagement` entitlement is catalog-only |
| Privacy | EXISTS. Reach visibility, hashed access codes, no auto-enroll marketing |

## Features implemented (this increment only)

- Owner labels on connections. Fingerprint tags stay internal and are stripped from API views.
- Source filters, follow-up reminder (1 day / existing reminder table), delete, CSV export of **consented** contacts only.
- Connection list still paginated (20) and owner-authorized.
- Copy email signature (plain text, no tracking pixel).
- Invite-a-colleague URL with `intent=celecard&from={username}`. Copy states there is no reward program. Guests still view public cards without registering.
- Optional business extras (hours + up to six services). Off until enabled. Personal cards stay personal.
- Honest meeting copy: times come from the CeleYou desk, not Google Calendar.
- Product metric catalog with once-per-user/card/term rules and ISO-week cohorts.

Not implemented as live product (documented only): organization accounts, employee card assignment, org NFC pools, referral rewards, Google Calendar OAuth, unsolicited guest email.

## Files changed

- `src/lib/celeyou-connect/workspace.ts`
- `src/services/celeyou-connect/workspace.service.ts`
- `src/app/api/digital-business-cards/[id]/connections/route.ts`
- `src/app/api/digital-business-cards/[id]/connections/export/route.ts`
- `src/components/digital-business-card/digital-card-connection-inbox.tsx`
- `src/lib/celeyou-growth/signature.ts`
- `src/lib/celeyou-growth/referral.ts`
- `src/lib/celeyou-growth/product-metrics.ts`
- `src/lib/digital-business-card/business-profile.ts`
- `src/lib/digital-business-card/socials.ts`
- `src/components/digital-business-card/digital-card-studio-client.tsx`
- `src/components/digital-business-card/digital-card-share-desk.tsx`
- `src/components/digital-business-card/digital-card-meeting-desk.tsx`
- `src/lib/celeyou-connect/__tests__/workspace.test.ts`

## Database changes

None. Additive JSON only:

- Connection `tags` already existed. Owner labels use `label:{name}` beside internal fingerprints.
- `CeleYouConnectReminder` already existed and is now used from the inbox.
- Optional `socials.business` on the existing card JSON.

No Prisma migrate. No production.db. No destructive SQL.

## API changes

| Endpoint | Change |
| --- | --- |
| `GET /api/digital-business-cards/:id/connections` | Owner only. Adds source and label filters. Returns labels and next reminder. Strips fingerprint tags |
| `PATCH` same | Labels, reminder hours, complete reminder, delete. Existing status/note/meeting reply remain |
| `GET .../connections/export` | Owner only. Rate limited. CSV of consented contacts. Anonymous or unconsented rows omitted |

## Team and organization architecture (Phase 7, not built)

Do not add schema until Super Admin publishes a Teams/Business plan.

Proposed later, additive:

1. `Organization` (id, name, billingOwnerUserId, brand defaults).
2. `OrganizationMember` (orgId, userId, role: owner / admin / publisher / member).
3. `DigitalBusinessCard.organizationId` nullable. Personal cards stay `null`.
4. NFC devices stay on the card. Org admin may pause/replace using existing NFC APIs with an org permission check.
5. Subscription remains per card unless a future org seat SKU is approved. Do not invent pricing.
6. Reporting: reuse `SmartCardInteraction` scoped by `organizationId IN (member orgs)`. Never mix personal and org rows in one export without an explicit switch.
7. Migration: backfill nothing. Owners opt a card into an org. Existing `/u` `/c` `/n` stay on the card.

Until then `CELEYOU_TIER_CATALOG.teamManagement` stays unpublished.

## Test results

`npm run test:celeyou`: **327 / 327 passed**. Workspace, growth, business, and cohort tests live in `src/lib/celeyou-connect/__tests__/workspace.test.ts`.

## Security findings

- Export and inbox remain session-scoped to the card owner.
- Fingerprint tags are not returned to the client.
- Export omits anonymous and zero-consent rows.
- Invite `from=` is a public username, not an account id.
- Signature HTML has no image beacon.
- Marketing preference still defaults false and is not set by Connect Back.

## Performance findings

- Connection lists stay 20 per page with existing `cardId+createdAt` and `searchText` indexes.
- Export capped at 500 rows.
- Public profile does not fetch the connection inbox.
- Business extras are JSON on the card, not extra public queries.

## Remaining work

- Wire `releaseExpiredUsernameHolds` and a reminder-due job onto the existing worker (reminders are stored; due mail is not a new campaign in this increment).
- Record `first_successful_share` once per card in share engine without double-counting `share_tap`.
- Attribute `referral_converted` at first publish when `from=` is present on the user row (needs an additive `users.referredByUsername` if product wants persistence).
- Organization schema only after an approved Teams SKU.
- Native Google/Outlook calendar OAuth. Do not claim it until it exists.

## Recommended release order

1. Connections inbox labels, reminders, export, delete (this increment).
2. Signature and invite copy on the share desk.
3. Optional business extras behind the studio toggle.
4. Product-metric dashboards using the catalog in `product-metrics.ts`.
5. Team accounts only after catalog publication and a dedicated migration window.

Do not deploy from this session.
