# CeleYou contact sharing release gate

Do not deploy without authorization.

## Files changed

- `src/lib/digital-business-card/vcard.ts`
- `src/lib/digital-business-card/save-contact.ts`
- `src/app/card/[slug]/contact.vcf/route.ts`
- `src/lib/celeyou-share/engine.ts`
- `src/lib/celeyou-share/namedrop.ts`
- `src/lib/celeyou-share/index.ts`
- `src/components/digital-business-card/celeyou-namedrop-setup.tsx`
- `src/components/digital-business-card/digital-card-share-desk.tsx`
- `src/components/digital-business-card/digital-card-public-view.tsx`
- tests under `src/lib/digital-business-card/__tests__` and `src/lib/celeyou-share/__tests__`
- `docs/celeyou/VCARD_COMPATIBILITY.md`
- `docs/celeyou/APPLE_NAMEDROP_GUIDE.md`
- `docs/celeyou/UNIVERSAL_CONTACT_SHARING_TESTS.md`
- `docs/celeyou/CONTACT_SHARING_RELEASE_GATE.md`

## Reused

Authentication, DigitalBusinessCard model, public payload sanitizer, public profile routes, QR, NFC tokens, share sheet, subscription eligibility, guest-shareable trials, prepaid catalog (GH₵49 / 129 / 239 / 449).

## New

- Sanitized permanent website URL in every eligible vCard
- Share Contact File action
- Set Up NameDrop guidance with Apple’s limit stated plainly
- Context-aware action order that still keeps every method visible

## Automated tests

`npm run test:celeyou` — **189/189 pass** on 11 Nov 2026.

Local iPhone-Safari user-agent against `/card/kojo-mensah/contact.vcf`: `200`, `text/vcard`, `Content-Disposition: inline`, `private, no-store`, website `https://www.celeventic.com/card/kojo-mensah`.

## Device tests

Not run on a physical iPhone, Samsung phone, or Android Chrome in this increment. Do not treat the user-agent header check as AirDrop, NameDrop, or Contacts import.

## Known platform limits

- The website cannot write Contacts silently.
- CeleYou cannot force AirDrop or Quick Share to appear.
- NameDrop field selection is Apple’s. The website field may be omitted.
- Android Quick Share is vendor-specific.
- Browser `.vcf` import differs by iOS version and browser.

## Remaining blockers

- Physical iPhone Safari import and AirDrop checks
- Physical Samsung / Android Chrome import and Quick Share checks
- Production deploy (not authorized here)
