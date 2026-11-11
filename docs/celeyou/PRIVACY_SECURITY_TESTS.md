# CeleYou privacy and security tests

Increment 6 is not the current increment. Existing coverage remains in place.

## Implemented and verified by automated tests

- Guest payload redaction: `src/lib/digital-business-card/__tests__/access.test.ts`
- Courtesy payload never includes private reach
- Owner-only fields excluded from public JSON
- Access codes hashed: existing `src/lib/digital-business-card/__tests__/access.test.ts` and privacy tests
- Guest share reasons never mention Paystack or prices: `public-share.test.ts`

## Not tested this increment

- Server-rendered HTML scrape for leaked phone numbers
- Cached CDN responses
- Physical vCard on iPhone / Android
- Rate-limit soak for unlock codes

Do not treat Increment 1 as Gate A privacy GO on a live host.
