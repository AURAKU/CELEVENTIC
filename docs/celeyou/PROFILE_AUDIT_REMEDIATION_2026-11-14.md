# CeleYou Profile Audit Remediation

**Source:** Celeventic-Profile-Test-Report.pdf (13 November 2026)  
**Target profile:** https://celeventic.com/u/owuraku-afari  
**Local verification card:** `/u/kojo-mensah` on `http://127.0.0.1:3011`  
**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Status:** Implemented in local source. Not committed. Not deployed.

This report records what was verified against current code and a production `next start` of the isolated `.next-audit` build. Live `celeventic.com/u/owuraku-afari` was not changed.

## Safety

- Public profile URLs (`/u/{slug}`, `/card/{slug}`, `/c/{token}`, `/n/{token}`) are unchanged.
- No production payment details were edited.
- No destructive migrations, Prisma push, VPS deploy, or git commit.
- Public HTML remains `Cache-Control: private, no-cache, no-store` so visibility, expiry, and private reach cannot be CDN-cached.
- Dummy slug `ama-serwaa` stays admin-only.

## Verification baseline

| Check | Result |
| --- | --- |
| `npm run test:celeyou` | 279/279 pass |
| Isolated production build `NEXT_DIST_DIR=.next-audit npm run build` | Succeeded (Next.js 15.5.19) |
| `next start` of that build on port 3011 | Ready, public profile 200 |
| Browser QA at 390×844 and desktop | Fullscreen, bank sheet, MoMo sheet, Connect Back |
| Physical second-device QR scan | BLOCKED (no second phone in this session) |
| Live `celeventic.com` | BLOCKED (no deploy) |

Two additive fixes landed after the isolated build and are covered by unit tests: Connect Back now requires email or phone on the server, and Open Graph metadata types the share image as `image/jpeg` to match the generated file.

---

## A. Issue Resolution Matrix

### 1. Full-screen digital card cropping — HIGH — PASS

**Root cause:** Portrait hold used a scan-lock crop that clipped the ID-1 card, QR, photo, and name.

**Fix:** Fullscreen always contain-fits the ID-1 ratio (`85.6/54`) inside the visual viewport with safe-area inset. Close control, Escape, dialog semantics, focus restore, and scroll lock. Contain-fit chosen over a 90° rotate so the card stays readable without forcing device orientation.

**Files:** `src/lib/digital-business-card/hold-viewport.ts`, `src/components/digital-business-card/use-celecard-silent-hold.ts`, `src/components/digital-business-card/digital-card-public-view.tsx`, `src/app/globals.css`

**Test:** Unit sizes at 320/375/390/430/768. Browser 390×844: entire card, QR, photo, name, company, and close button visible. No horizontal overflow.

**Result:** PASS (physical scan of that QR from another device remains BLOCKED)

### 2. Empty Business section and missing meeting booking — HIGH — PASS

**Root cause:** Meeting data existed but the Business row stayed collapsed. Empty sections could still render.

**Fix:** Meeting groups always expand `DigitalCardMeetingDrop`. `guestIdentitySections` omits Business when there is no live location or meeting. Owner `enabled` / private / expired rules unchanged.

**Files:** `src/components/digital-business-card/digital-card-reach-grid.tsx`, `src/lib/celeyou-share/profile-sections.ts`, `src/lib/digital-business-card/meetings.ts`

**Test:** DEMO_CARD publishes the sitting/meeting item. Empty Business hidden. Local Kojo has no meeting/location, so Business does not render. Alipay stays locked.

**Result:** PASS (live Owuraku booking still needs a deploy to confirm on production data)

### 3. Bank details modal layering — HIGH — PASS

**Root cause:** Payment sheets used `mb-[4.75rem]` and sat under the dock. Backdrop did not cover the viewport.

**Fix:** Sheets portal to `document.body` at `z-[200]`. Dock hides via `body[data-celecard-sheet]`. Escape, close, focus trap, scroll lock. Same architecture for bank, MoMo, share, and Connect Back.

**Files:** `src/components/digital-business-card/digital-card-reach-grid.tsx`, `src/components/digital-business-card/digital-card-public-view.tsx`, `src/app/globals.css`

**Test:** Bank dialog 390×844, `z-index: 200`, `position: fixed`, 0,0 390×844. Dock `visibility: hidden`. Escape closed it. Save/Connect/Share were not clickable while open.

**Result:** PASS

### 4. MTN MoMo payment interaction — HIGH — PASS

**Root cause:** MoMo `href` was `tel:`, so the icon started a phone call.

**Fix:** Pay wallets (MoMo, Telecel, AirtelTigo, M-Pesa, GCash) use an empty href and open a copy sheet with provider, number, account name when present, copy action, and explicit “copy does not complete payment” copy. No invented MTN payment URL. Wallet page uses the same completeness rules.

**Files:** `src/lib/digital-business-card/socials.ts`, `src/components/digital-business-card/digital-card-reach-grid.tsx`, `src/components/digital-business-card/digital-card-wallet-view.tsx`, `src/lib/digital-business-card/wallet-quality.ts`

**Test:** `digitalCardSocialHref("momo", …) === ""`. Browser: MoMo is a `BUTTON`, zero `tel:` links, sheet shows `MTN MoMo`, `0240000000`, copy, and payment instructions.

**Result:** PASS

### 5. Social and payment icon accessibility — MEDIUM — PASS

**Root cause:** Icons were smaller than 44px and captions were easy to miss.

**Fix:** Dock taps are 48×48 where space allows, with visible captions and accessible names.

**Files:** `src/app/globals.css`, `src/components/digital-business-card/digital-card-reach-grid.tsx`

**Test:** Source asserts `min-width: 48px` and captions. Browser names: GCB Bank, MTN MoMo, Alipay.

**Result:** PASS

### 6. Fixed bottom action bar obscures content — MEDIUM — PASS

**Root cause:** Footer used a fragile fixed offset under the dock.

**Fix:** `ResizeObserver` writes `--celecard-dock-h`. Footer padding is `calc(var(--celecard-dock-h, 6.75rem) + 0.45rem)` plus safe-area.

**Files:** `src/components/digital-business-card/digital-card-public-view.tsx`, `src/app/globals.css`

**Test:** Source + local profile. Cookie banner can still cover the dock until dismissed; that banner is separate from the reported footer overlap.

**Result:** PASS

### 7. Device-specific Save Contact experience — MEDIUM — PASS

**Root cause:** Android visitors received iPhone wording, and the UI claimed the contact was saved after a VCF download.

**Fix:** Platform hint via `detectTapPlatform()`. Toast uses `celeyou.file_ready` and auto-dismisses. VCF payload unchanged.

**Files:** `src/components/digital-business-card/digital-card-public-view.tsx`, `src/lib/i18n/extra-translations.ts`

**Test:** Source. VCF download from `/u/kojo-mensah/contact.vcf` still works.

**Result:** PASS

### 8. International phone number support — MEDIUM — PASS

**Root cause:** Local Ghana numbers were left as `024…` in `tel:` and VCF without a calling-code rule that also works for other countries.

**Fix:** `phone-format.ts` builds E.164 when `+` / `00` is present, or when a sibling number already carries a calling code. No Ghana default. WhatsApp vs WhatsApp Business labels in VCF are preserved.

**Files:** `src/lib/digital-business-card/phone-format.ts`, `src/lib/digital-business-card/socials.ts`, `src/lib/digital-business-card/vcard.ts`

**Test:** `0241234567` + hint `233` → `tel:+233241234567`. UK `02079460000` without a sibling stays local.

**Result:** PASS

### 9. Connect Back form — MEDIUM — PASS

**Root cause:** Missing persistent labels, input types, duplicate-submit guard, and a server rule that at least one of email or phone is required.

**Fix:** Visible labels with required/optional. `type="email"` / `type="tel"` plus autocomplete. Client and server require email or phone. Duplicate-submit guard. Consent, honeypot, and rate limits kept (`5/300s` per card+IP, `30/300s` per IP).

**Files:** `src/components/digital-business-card/digital-card-public-view.tsx`, `src/app/api/digital-business-cards/connect/route.ts`

**Test:** Browser fields: name required, email or phone required, company/title/note optional, consent checkbox, submit “发送联系方式”. Autocomplete `name`, `email`, `tel`, `organization`.

**Result:** PASS

### 10. Social share preview image — MEDIUM — PASS

**Root cause:** 1200×630 PNG ~1.07 MB with clipped branding.

**Fix:** Contain-fit ID-1 plate in the OG canvas, JPEG quality 78 (mozjpeg). Versioned absolute URLs from `updatedAt`. Metadata type is now `image/jpeg`.

**Files:** `src/lib/digital-business-card/og-image.tsx`, `src/lib/digital-business-card/og-markup.tsx`, `src/lib/digital-business-card/share.ts`

**Test:** Local `/u/kojo-mensah/og` is JPEG 1200×630, **45.4 KB**. `og:image` is an absolute `https://www.celeventic.com/card/kojo-mensah/og?v=…` URL. Sample: `docs/celeyou/share-preview-kojo-mensah-1200x630.jpg`.

**Result:** PASS (WhatsApp/Twitter crawler fetch of live production still needs deploy)

### 11. Blank page during entrance animation — MEDIUM — PASS

**Root cause:** `.celecard-enter` started at opacity 0, so content stayed invisible if animation frames were delayed.

**Fix:** Enter and `@keyframes celecard-rise` start at opacity 1. `prefers-reduced-motion` respected.

**Files:** `src/app/globals.css`

**Test:** Source. Local first paint of `/u/kojo-mensah` showed the card without a blank stage.

**Result:** PASS

### 12. JavaScript weight and caching — MEDIUM — PASS with follow-up

**Root cause:** Report measured ~1.08 MB compressed JS across 24 files and `cache-control: no-store` on assets.

**Fix:** `poweredByHeader: false`. Long-cache only `/_next/static`. Public `/u` HTML stays no-store on purpose. Route First Load JS for `/card/[slug]` is 14 kB route + **315 kB** first load (shared 103 kB).

**Measured on local production start (Next `compress: false`, so these are uncompressed bytes):**

| Metric | Report baseline | This build |
| --- | --- | --- |
| HTML-referenced JS files | 24 | 26 |
| JS transferred locally | ~1.08 MB gzip (live) | **1.19 MB uncompressed** |
| First Load JS `/card/[slug]` | not given | **315 kB** |
| Static JS Cache-Control | no-store | `public, max-age=31536000, immutable` |
| HTML Cache-Control | no-store | `private, no-cache, no-store` (kept) |

Do not claim a live gzip win until Nginx compresses `/_next/static` on the VPS.

**Files:** `next.config.ts`

**Result:** PASS for caching policy. JS byte reduction vs the live gzip baseline is **not claimed**.

### 13. Security hardening — HIGH/MEDIUM — PASS with infra blockers

**Root cause:** Missing browser headers, `X-Powered-By`, and a public QR `?data=` endpoint that accepted arbitrary URLs.

**Fix in Next:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`, `poweredByHeader: false`. `/api/qr/image?data=` allowlists Celeventic/CeleYou destinations only.

**Verified:**

```
GET /api/qr/image?data=https://evil.example/phish  → 400 {"error":"destination not allowed"}
GET /api/qr/image?data=https://www.celeventic.com/u/kojo-mensah → 200
```

**Not in this Next layer (needs Nginx / a staged CSP rollout):** HSTS, Content-Security-Policy. CSP was not enforced here because Paystack, maps, and media CDNs must be inventoried first.

**Files:** `next.config.ts`, `src/app/api/qr/image/route.ts`, `src/lib/digital-business-card/share-identity.ts`

**Result:** PASS for headers in Next and QR allowlist. HSTS/CSP BLOCKED pending infrastructure.

### 14. WhatsApp destination reliability — LOW — PASS

**Root cause:** Risk of rewriting a configured username to an unverified number.

**Fix:** Username destinations stay as configured. No silent number substitution.

**Files:** `src/lib/digital-business-card/socials.ts`

**Test:** `digitalCardSocialHref("whatsapp", "owuraku")` keeps `owuraku` and does not inject `233`.

**Result:** PASS

### 15. About quote formatting — LOW — PASS

**Root cause:** Unbalanced leading quote in About / VCF notes.

**Fix:** `formatGuestAbout` strips wrapping quotes and a lone leading quote. Owner text is otherwise unchanged.

**Files:** `src/lib/celeyou-share/profile-sections.ts`

**Result:** PASS

### 16. Confusing “plate” terminology — LOW — PASS

**Root cause:** Guest copy said “plate”.

**Fix:** User-facing strings use Digital Card / View fullscreen card / Share card. Internal identifiers (`data-celeyou-live-plate`, capture helpers) stay.

**Files:** `src/lib/i18n/extra-translations.ts`, `src/lib/i18n/zh-messages.ts`

**Test:** Browser fullscreen control is “查看全屏名片”.

**Result:** PASS

### 17. Page heading and contrast — LOW — PASS

**Root cause:** No single main heading and weak structure.

**Fix:** One `h1.sr-only` with `displayName`, section `h2` kickers.

**Files:** `src/components/digital-business-card/digital-card-public-view.tsx`

**Test:** Browser heading level 1 is “Kojo Mensah”. Payment section is `h2`.

**Result:** PASS (full WCAG contrast audit of every theme ink pair was not re-run in this session)

### 18. Desktop layout refinement — LOW — PASS

**Root cause:** Single column on large screens with wasted space.

**Fix:** At `min-width: 1024px`, two columns `minmax(20rem, 24rem) minmax(0, 1fr)` with a sticky card.

**Files:** `src/app/globals.css`

**Test:** Desktop screenshot of Kojo: card left, payment icons right. Sparse right column is expected when the card has no About/Business/contact rows.

**Result:** PASS

### 19. Contact card spacing — LOW — PASS

**Root cause:** Uneven horizontal padding and clipped action arrows.

**Fix:** Balanced `--reach-pad-x` / `--reach-pad-y` and visible `.celecard-reach-go`.

**Files:** `src/app/globals.css`

**Result:** PASS (Kojo’s public reach is icon-only; row padding is covered by source tests)

### 20. Long names and card text overflow — LOW — PASS

**Root cause:** Long names collided with the QR and clipped descenders.

**Fix:** `celecardNameFitCqw` shrinks display size. Company wraps via `celecardCompanyDisplayLines`. ID-1 ratio stays.

**Files:** `src/lib/digital-business-card/type-voice.ts`, `src/components/digital-business-card/digital-card-face.tsx`

**Result:** PASS

---

## B. Visual verification

Local production preview: `http://127.0.0.1:3011/u/kojo-mensah` (locale was Chinese from an existing cookie; product copy is i18n, not a regression).

| Surface | Observed |
| --- | --- |
| Fullscreen card @ 390×844 | Entire ID-1 card, QR, photo, name, company, CeleYou lockup, close (×) on a dark stage |
| Business section | Hidden on Kojo (no meeting/location). Unit-tested on DEMO_CARD |
| Bank modal | Dialog with GCB Bank, KOJO MENSAH, account `1234567890`, copy-all. Dock hidden. Escape works |
| MoMo modal | Dialog with MTN MoMo, `0240000000`, copy, “copy does not complete payment”. Not a phone call |
| Bottom navigation | Save Contact / Connect Back / Share above safe-area. Hidden while a sheet is open |
| Connect Back | Labels, required/optional, email or phone, consent, honeypot `website`, primary submit |
| Share preview | `docs/celeyou/share-preview-kojo-mensah-1200x630.jpg` (1200×630 JPEG, 45.4 KB) |
| Mobile layout | Card, captions under GCB / MoMo / Alipay, footer, dock |
| Desktop layout | Sticky card column + content column |

Alipay remains locked until an access code, so private payment details stay hidden.

---

## C. Performance comparison

| Metric | Report (live 13 Nov 2026) | Local production build 14 Nov 2026 |
| --- | --- | --- |
| JS files on public profile | 24 | 26 referenced `/_next/static` scripts |
| JS payload | ~1.08 MB compressed | 1.19 MB uncompressed (Next `compress: false`) |
| First Load JS `/card/[slug]` | not measured in the PDF | 315 kB (route 14 kB + shared 103 kB) |
| OG image | ~1.07 MB, 1200×630, clipped | **45.4 KB JPEG, 1200×630, contain-fit** |
| HTML caching | no-store | no-store (intentional) |
| Static JS caching | no-store | immutable 1 year |
| Layout | content gated by opacity 0 | content visible at opacity 1 |

OG image size is a verified improvement. JS transfer vs the gzipped live baseline is not claimed as a win.

---

## D. Security verification

| Control | Result |
| --- | --- |
| HTTPS / HSTS | BLOCKED: Next does not set HSTS. Must be Nginx on the VPS |
| CSP | BLOCKED: not enforced; needs an integration allowlist |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| X-Frame-Options | `SAMEORIGIN` |
| Permissions-Policy | `camera=(self), microphone=(), geolocation=(), payment=()` |
| X-Powered-By | removed (`poweredByHeader: false`) |
| QR `?data=` allowlist | 400 for `evil.example`; 200 for celeventic.com |
| Private reach | Alipay locked; protected fields stay out of public payload/VCF (existing privacy tests) |
| Connect Back | consent required, honeypot, rate limit, email-or-phone on client and server |
| Public HTML cache | no-store, so unpublished / expired / private changes are not CDN-cached |

---

## E. Remaining work

1. **Deploy** this tree to production when asked. Until then `celeventic.com/u/owuraku-afari` still serves the pre-audit build.
2. **Nginx:** HSTS, gzip/brotli for `/_next/static`, and a staged Content-Security-Policy covering Paystack, maps, and media CDNs.
3. **Physical QR scan** of the fullscreen card from a second phone.
4. **JS weight:** First Load is 315 kB, but HTML still references 1.19 MB of uncompressed chunks (including polyfills and layout). Further splitting is optional follow-up, not a blocker for the 20 findings.
5. **OG jpeg metadata** and **server email-or-phone** landed after the isolated `.next-audit` compile. Rebuild before the next deploy.
6. Cookie consent can cover the dock until dismissed. Out of the original 20 findings.
7. Unrelated local work (i18n, payments, funeral seed, deleted invitation photos) is also uncommitted. Do not mix it into a CeleYou-only deploy without review.

**Recommended next step:** After explicit approval, rebuild, deploy the CeleYou-related files only, then re-test https://celeventic.com/u/owuraku-afari on a physical phone.

---

## Definition of Done

| Item | Status |
| --- | --- |
| All 20 findings investigated | Yes |
| Applicable issues fixed in source | Yes |
| Mobile QR presentation contain-fits | Yes (390×844 visual + unit sizes) |
| Payment actions no longer `tel:` | Yes |
| Public profile renders | Yes (local production) |
| Accessibility improved | Yes (headings, labels, 48px targets, dialogs) |
| Performance measured | Yes (OG 45.4 KB; JS documented honestly) |
| Security tested | Yes (headers + QR allowlist). HSTS/CSP infra still open |
| URLs and data preserved | Yes |
| `test:celeyou` | 279/279 |
| Production build | Yes (`.next-audit`) |
| Implementation report | This file |
| Auto-deploy | Not done (by design) |
