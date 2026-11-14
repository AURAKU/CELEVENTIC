# CeleYou seamless onboarding and user activation

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Status:** Implemented locally. Not committed. Not deployed.

Official CeleYou mark, teals, original landscape Elegant Frost plate, profile URLs, QR `/c/{token}`, and NFC `/n/{token}` were not replaced.

## What shipped

A guided first-card path so a new CeleYou account can publish a working card without opening the full studio.

```
Registration  →  Unique username  →  Profile  →  Photo  →  Contacts
      →  Look (original default)  →  Preview  →  Publish  →  Welcome / first share
```

| Step | Route | Notes |
| --- | --- | --- |
| Account | `/auth/onboarding?intent=smartcard` | Existing register. Display names may repeat. Username optional here, required in the wizard. Duplicate email/phone still rejected. |
| First card | `/dashboard/business-card/start` | New post-signup destination for `productIntent=celecard`. |
| Studio | `/dashboard/business-card?studio=1` | Full desk. Unpublished owners without `studio=1` are sent to start. |
| Public | `/u/{username\|slug}`, `/c/{token}`, `/n/{token}` | Guests still view without an account. Tokens do not rotate. |

## Requirements

1. Official mark, teals, and original plate remain the default look (`elegant-frost`, classic landscape, gold edge).
2. Display names stay non-unique. Usernames stay unique (`3–30`, `[a-z0-9._]`).
3. Live availability and suggestions reuse `CeleYouUsernameField` (400ms debounce).
4. Photo upload and crop reuse `DigitalCardPortraitField` (camera, gallery, house marks).
5. Contact and business fields are progressive: name required, email / phone / WhatsApp / website skippable.
6. Existing template is the default. Other looks sit behind “Try another look”.
7. Optional customization does not dump a new user into studio.
8. First save creates the permanent card row, public token, and NFC device. Publish only flips `isPublished`.
9. Welcome desk offers the live profile link plus print QR of `/c/{token}`.
10. `/u`, `/card`, `/c`, `/n` stay guest-open for published cards.
11. Signup progress shows Username, Profile, Photo, Contacts, Look, Preview.
12. Drafts persist 14 days in `celeyou-onboarding-draft` and as an unpublished server card.
13. Layout is mobile-first, two-column welcome from `sm`, 44px actions.
14. Welcome actions respect current implementation: View / Share / QR / Save Contact only when guest-shareable; NFC only if `nfcEnabled`; Analytics only after publish. Unpublished Free catalog is not invented as a live plan.
15. Activation retries reuse the oldest retained card. Register still rejects duplicate email/phone.
16. After publish, welcome desk is the first-share surface (copy, WhatsApp, email, OS share).
17. Funnel events store only `{ kind, step }`. No emails, phones, usernames, or IPs in lifecycle meta. Rate limited. FirstShare is once per card.
18. Portrait, themes, and plate preview load per step rather than all at once. Fields are labelled. Invalid username is announced.
19. Existing published cards (including Kojo) are not duplicated. Start shows the welcome desk for those owners.
20. `test:celeyou` **335/335**. Auth dest tests pass. Local 3012: unauthenticated start redirects to sign-in; signed-in Kojo sees welcome; `/u/kojo-mensah` and `/card/kojo-mensah` return 200.

## Welcome desk

Shown after publish, and when a published owner returns to `/dashboard/business-card/start`.

| Action | When it appears |
| --- | --- |
| View My Card | Published and guest-shareable |
| Share My Card | Published and guest-shareable |
| Download QR | Published and guest-shareable (print PNG of `/c/{token}`) |
| Save Contact | Published and guest-shareable (`/card/{slug}/contact.vcf`) |
| Edit Card | Always (studio with `studio=1`) |
| Connect NFC Card | `nfcEnabled` (does not claim every device can write) |
| View Analytics | Published (owner analytics already exist; no new paid lock) |

## Files

- `src/lib/digital-business-card/activation.ts`
- `src/services/digital-business-card/activation.service.ts`
- `src/app/api/digital-business-cards/activation/route.ts`
- `src/app/dashboard/business-card/start/page.tsx`
- `src/components/digital-business-card/celeyou-first-card-onboarding.tsx`
- `src/components/digital-business-card/celeyou-welcome-desk.tsx`
- `src/lib/auth/safe-next-path.ts` (`smartCardStartPath`)
- `src/lib/auth/onboarding-intents.ts`
- `src/app/auth/onboarding/page.tsx`
- `src/services/workspace/onboarding.service.ts`
- `src/components/digital-business-card/digital-card-studio-client.tsx`
- `src/lib/celeyou-growth/product-metrics.ts`
- `src/lib/digital-business-card/__tests__/activation.test.ts`

Studio `POST /api/digital-business-cards` is unchanged. “New card” still creates a separate card. Only the activation API is retry-safe.

## Blockers

- **Not deployed.** Intentional. No VPS, no production Prisma, no live `.env` write.
- **Abandonment before the first server draft** (username step with no card row yet) cannot store a lifecycle event, because events are keyed to `cardId`. Later steps record step ids only.
- **Brand-new account browser walk** was not completed in the signed-in 3012 session (that session is Kojo, already published). The wizard is covered by unit/source tests. Signup HTML on 3012 includes “help you publish” and “unique username”. A logged-out register → start → publish pass should be done before production.
- **NFC write** remains device-limited. Welcome “Connect NFC Card” opens the existing NFC manager. Phone-to-phone NFC is still not claimed.
- **Unpublished Free / Business / Teams catalog** is still catalog-only. Welcome does not invent those plans.

## Verification

```
npm run test:celeyou
# 335/335
```

Local HTTP (3012, not production):

- `GET /dashboard/business-card/start` unauthenticated → 307 to sign-in with `callbackUrl=/dashboard/business-card/start`
- Signed-in published owner → welcome desk, profile `http://127.0.0.1:3012/u/kojo-mensah`
- `GET /u/kojo-mensah` and `GET /card/kojo-mensah` → 200, no account required
- `GET /auth/onboarding?intent=smartcard` HTML → “help you publish”, “unique username”
