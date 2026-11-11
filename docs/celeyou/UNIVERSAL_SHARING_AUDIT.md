# CeleYou universal sharing audit

Increment 1 of the November 2026 web MVP. Production URL generation and public card eligibility only.

Status vocabulary: **Implemented** | **Verified by automated tests** | **Verified on physical devices** | **Blocked** | **Not tested**.

## Platform reality

Phone-to-phone NFC, Safari NFC write, and browser BLE advertising are **not** web capabilities. The website must not claim them. Native BLE remains a January 2027 app contract (`a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01`).

## Source of truth (inspected, not rebuilt)

| Concern | Location |
|---|---|
| Card model | `prisma/schema.prisma` `DigitalBusinessCard` |
| Slug / public token / NFC token | `src/lib/digital-business-card/share-identity.ts` |
| Guest origin | `src/lib/app-url.ts` `celeYouProductionOrigin` |
| Eligibility | `src/lib/digital-business-card/access.ts` `resolveCeleYouPublicShare` |
| Lifecycle / trial / grace | `src/lib/digital-business-card/lifecycle.ts` |
| Public profile | `src/app/card/[slug]/page.tsx` |
| QR redirect | `src/app/c/[token]/page.tsx` |
| NFC redirect | `src/app/n/[token]/page.tsx` |
| Tap sessions | `src/app/dashboard/business-card/tap/page.tsx`, `src/services/digital-business-card/proximity.service.ts` |
| Paystack | `src/services/payments/payment.service.ts` (not consulted for public open) |

## Increment 1 findings

| Feature | Status | Evidence |
|---|---|---|
| Canonical HTTPS guest origin | Implemented, verified by automated tests | `src/lib/__tests__/app-url.test.ts`, `share-identity.test.ts` |
| Localhost / private IP / preview rewrite | Implemented, verified by automated tests | `celeYouProductionOrigin` never returns those hosts |
| HTTP Celeventic host upgraded to HTTPS | Implemented, verified by automated tests | `http://www.celeventic.com` → `https://www.celeventic.com` |
| Single public eligibility resolver | Implemented, verified by automated tests | `resolveCeleYouPublicShare` used by `/c`, `/n`, `/card`, vCard, public events, Tap host |
| Published trial shareable without Paystack | Implemented, verified by automated tests | `public-share.test.ts` deletes `PAYSTACK_SECRET_KEY` |
| Paid / grace / unpublished / suspended / expired | Implemented, verified by automated tests | `lifecycle.test.ts`, `access.test.ts`, `public-share.test.ts` |
| Live production `/c` `/n` `/card` | Not tested on this increment | Live VPS still served `b2a7d85` after a rolled-back deploy. Do not claim live GO. |
| Physical NFC / camera QR on phones | Not tested | Increment 2–4 and 10 |
| Payments | Blocked | Gate C. See `PAYMENT_READINESS.md` |

## Sharing channels after Increment 1

1. Physical NFC URL format: `https://www.celeventic.com/n/{token}` when encoded. Resolver still honors pause / lost / replaced.
2. Smart QR: `https://www.celeventic.com/c/{token}` when encoded. Lands on `/card/{slug}`.
3. Public profile: `/card/{slug}` and `/u/{slug}`.
4. Tap-to-Connect: web session QR / join code. Hosting now requires guest-shareable. Not BLE.
5. System share / AirDrop / Quick Share: existing `navigator.share`. Not audited in this increment.

## What this increment did not do

- No NFC hardware write changes.
- No Paystack credential work.
- No prisma db push, no price changes, no studio rebuild.
- No production deploy.
