# CeleYou post-implementation verification

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Audit source:** Celeventic Profile Test Report, 13 November 2026  
**Live target:** https://celeventic.com/u/owuraku-afari (unchanged, not deployed)  
**Local cards:** `/u/kojo-mensah` on ports 3011 (isolated production build) and 3012 (current source)

This is an evidence report. Nothing was committed or deployed.

## Verdict

**Source is ready for a controlled rebuild and deploy. Live production is not updated.**

Do not treat celeventic.com as fixed. The 20 findings are in local source, with unit coverage, local HTTP checks, and Cursor-browser QA. Playwright Chromium could not be installed in this session (download stalled at 0% of 178.7 MiB), so the new `e2e/celeyou-profile-audit.spec.ts` was not executed.

A replaced NFC destination was 500 on the isolated production build. That is now fixed in source (`"use client"` on `DigitalCardNfcTapView`) and verified 200 on port 3012.

## Build and automated tests

| Check | Evidence | Result |
| --- | --- | --- |
| `npm run test:celeyou` | 279/279 pass, 0 fail | PASS |
| NFC + profile-audit after NFC fix | 27/27 pass | PASS |
| Isolated production build `.next-audit` | Next.js 15.5.19, succeeded earlier this session | PASS |
| `next start` :3011 of that build | `/u/kojo-mensah` 200 | PASS |
| Latest source `next dev` :3012 | Ready; includes NFC client fix, jpeg OG type, Connect email-or-phone, lucide `optimizePackageImports` | PASS |
| Playwright `e2e/celeyou-profile-audit.spec.ts` | Spec written; Chromium install blocked | BLOCKED |
| Existing `e2e/celeyou-adaptive.spec.ts` | 12 viewports including 320–1440 | Not re-run (same Chromium gap) |
| Live `celeventic.com/u/owuraku-afari` | Browser tab `chrome-error://chromewebdata/` | BLOCKED |

## Compatibility of existing artifacts

| Artifact | Evidence | Result |
| --- | --- | --- |
| `/u/kojo-mensah` and `/card/kojo-mensah` | 200, same identity | Preserved |
| Smart QR `/c/cmw9ryoql08kdb5gq7hisd05w` | 307 → `https://www.celeventic.com/card/kojo-mensah` | Preserved |
| Active NFC `/n/cmwaogena03fwb57vgkyttjwa` | 307 → same public card | Preserved |
| Replaced NFC `/n/cmwaq6k5p01psb52ez98t0l3r` | Was 500 on :3011. Now 200 on :3012: “This NFC card was replaced” | Fixed in source |
| VCF `/u/kojo-mensah/contact.vcf` | `BEGIN:VCARD`, FN Kojo Mensah, public URL | Preserved |
| Wallet `/u/kojo-mensah/wallet` | 200, MoMo copy, Alipay locked | Preserved |
| Bank / MoMo values | GCB `1234567890`, MoMo `0240000000` | Unchanged |
| Dummy `ama-serwaa` | Still admin-only | Preserved |
| Public HTML cache | `private, no-cache, no-store` | Preserved (required for privacy/expiry) |

## Performance (measured)

Production start on :3011, uncompressed (Next `compress: false`; gzip is Nginx’s job):

| Metric | Report 13 Nov (live) | Local production :3011 |
| --- | --- | --- |
| HTML-referenced JS files | 24 | 26 |
| JS bytes | ~1.08 MB gzip | 1.19 MB uncompressed |
| First Load JS `/card/[slug]` | not in PDF | 315 kB (route 14 kB + shared 103 kB) |
| OG image | ~1.07 MB PNG | **45.4 KB JPEG, 1200×630** |
| Static JS Cache-Control | no-store | `public, max-age=31536000, immutable` |
| HTML Cache-Control | no-store | no-store (intentional) |
| Dev :3012 JS | n/a | ~9.3 MB unbundled (ignore for prod) |

Safe optimization applied this pass: `experimental.optimizePackageImports: ["lucide-react"]`. Effect needs a new production build to measure. No public HTML CDN cache was added.

## Security

| Control | Status |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Present |
| `Referrer-Policy: strict-origin-when-cross-origin` | Present |
| `X-Frame-Options: SAMEORIGIN` | Present |
| `Permissions-Policy` camera/mic/geo/payment | Present |
| `X-Powered-By` | Absent (`poweredByHeader: false`) |
| QR `?data=https://evil.example/phish` | 400 `destination not allowed` |
| QR celeventic destination | 200 |
| HSTS | BLOCKED (Nginx) |
| Content-Security-Policy | BLOCKED (needs Paystack/maps/CDN allowlist) |
| Connect Back | Consent, honeypot, rate limit, email-or-phone client+server |
| Private Alipay | Locked, secret not shown on profile or wallet |

## Browser QA (Cursor browser, not Playwright)

Emulated 320×568 and 390×844, plus desktop and wallet:

- 320: `overflowX = 0`, plate 296×187 (ratio 1.585 ≈ ID-1), QR 74×74 loaded (`naturalWidth` 1024)
- 390 fullscreen: entire plate on screen, QR visible, close visible, Escape restores
- Bank dialog: z-index 200, dock `visibility: hidden`
- MoMo: `BUTTON`, zero `tel:` links, copy sheet
- Wallet: “calling does not complete payment”, Alipay locked
- Connect Back: `type=email` / `type=tel`, labels, consent, hidden honeypot
- Replaced NFC: honest replacement page, no 500
- Meeting/Business: omitted on Kojo (no meeting configured). DEMO_CARD unit tests cover the published sitting

Physical scan of the on-screen QR from a second phone: BLOCKED.

---

## Table: all 20 findings

| # | Description | Status | Root cause | Files | Test evidence | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Fullscreen card cropping | **Fixed and tested** | Portrait hold used scan-lock crop | `hold-viewport.ts`, `use-celecard-silent-hold.ts`, `digital-card-public-view.tsx`, `globals.css` | Unit sizes 320–768. Browser 390: plate inside viewport, QR  visible, close control, Escape | Physical second-device scan. Playwright spec not executed |
| 2 | Empty Business / missing meeting | **Fixed and tested** (unit). Browser N/A on Kojo | Meeting row collapsed; empty section still painted | `digital-card-reach-grid.tsx`, `profile-sections.ts`, `meetings.ts` | DEMO_CARD meeting published; empty Business hidden; Kojo has no meeting so Business omitted | Confirm on live Owuraku after deploy |
| 3 | Bank modal under dock | **Fixed and tested** | Sheet `mb-[4.75rem]`, low z-index | `digital-card-reach-grid.tsx`, `digital-card-public-view.tsx` | Dialog z=200, dock hidden, Escape | None in source |
| 4 | MoMo starts a phone call | **Fixed and tested** | `tel:` href | `socials.ts`, reach-grid, wallet-view, `wallet-quality.ts` | `href === ""`. Browser/wallet: copy, not call | None in source |
| 5 | Icon hit targets / captions | **Fixed and tested** | Sub-44px icons | `globals.css`, reach-grid | 48px CSS; visible GCB/MoMo/Alipay captions | Contrast of captions on every theme not re-measured |
| 6 | Dock covers footer | **Fixed and tested** | Fragile fixed offset | public-view ResizeObserver, `globals.css` | CSS `--celecard-dock-h`. Cookie banner can still cover dock until dismissed | Cookie banner overlap is separate |
| 7 | Android sees iPhone save copy | **Fixed and tested** | One instruction string | public-view, `extra-translations.ts` | `file_ready` + platform hint. VCF still downloads | None in source |
| 8 | Local phone numbers | **Fixed and tested** | No international parser | `phone-format.ts`, socials, vcard | `024…` + 233 sibling → `+233`. UK local stays local | Live Owuraku numbers after deploy |
| 9 | Connect Back a11y/validation | **Fixed and tested** | Missing labels/types; server allowed empty contact | public-view, `connect/route.ts` | Browser types/labels/consent. Server `Email or phone is required` | Isolated `.next-audit` build predates the server rule; rebuild before deploy |
| 10 | 1.07 MB clipped OG image | **Fixed and tested** | Cover-fit PNG | `og-image.tsx`, `og-markup.tsx`, `share.ts` | JPEG 1200×630, 45.4 KB. Metadata `image/jpeg` | Social crawler fetch after deploy |
| 11 | Blank page until animation | **Fixed and tested** | opacity 0 enter | `globals.css` | Source; first paint visible on :3011/:3012 | None in source |
| 12 | JS weight + no-store assets | **Partially fixed** | Shared client graph + HTML no-store | `next.config.ts` | Static JS immutable cache. First Load 315 kB. HTML-referenced JS still 1.19 MB uncompressed | Nginx gzip. Measure lucide import split after rebuild. Do not cache `/u` HTML |
| 13 | Headers + open QR `data=` | **Partially fixed** | Missing headers; arbitrary QR URLs | `next.config.ts`, `api/qr/image/route.ts`, `share-identity.ts` | Headers present. Evil QR 400. Valid QR 200 | HSTS + CSP on Nginx |
| 14 | WhatsApp username rewrite | **Fixed and tested** | Risk of number substitution | `socials.ts` | Username `owuraku` kept | None in source |
| 15 | Unbalanced About quotes | **Fixed and tested** | Display of wrapping quote | `profile-sections.ts` | `formatGuestAbout` unit | None in source |
| 16 | “Plate” guest copy | **Fixed and tested** | Internal noun leaked | `extra-translations.ts`, zh-messages | Browser “查看全屏名片” | Internal `live-plate` ids stay by design |
| 17 | Heading / contrast | **Fixed and tested** | No `h1` | public-view | `h1` Kojo Mensah, section `h2` | Full theme contrast sweep not repeated |
| 18 | Desktop two-column | **Fixed and tested** | Single column on large screens | `globals.css` | Desktop screenshot: sticky card + content | Sparse right column when a card has few sections |
| 19 | Contact row padding | **Fixed and tested** | Uneven pad, clipped arrow | `globals.css` | Source CSS. Kojo public reach is icon-only | Browser row check needs a card with stack rows |
| 20 | Long names vs QR | **Fixed and tested** | Fixed type size | `type-voice.ts`, `digital-card-face.tsx` | `celecardNameFitCqw` unit. 320 name 107px, QR 74px, no overflow | Extreme names not visually sampled |

## Extra defect found in this verification (not in the original 20)

| Issue | Status | Evidence | Fix |
| --- | --- | --- | --- |
| Replaced NFC `/n/{token}` 500 | **Fixed and tested** in source | :3011 500 `useLocale() from the server`. :3012 200 “This NFC card was replaced” | `"use client"` on `digital-card-nfc-tap-view.tsx`. Unit asserts the directive |

## Deployment blockers

1. **Do not deploy the stale `.next-audit` build.** Rebuild so the NFC client fix, Connect server rule, OG `image/jpeg` type, and lucide import optimization are included.
2. **Nginx:** HSTS, gzip/brotli for `/_next/static`, staged CSP.
3. **Playwright Chromium** was not installed here. Run `e2e/celeyou-profile-audit.spec.ts` against the rebuilt `next start` before calling the 20 findings browser-complete.
4. **No VPS/git push** until explicitly requested.
5. Unrelated uncommitted work (i18n, payments, funeral seed, deleted invitation photos) is in the same working tree. Review the diff before any CeleYou-only ship.

## Recommended next step

After explicit approval: rebuild (`NODE_OPTIONS='--max-old-space-size=8192' npm run build`), start that build, run `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> npx playwright test e2e/celeyou-profile-audit.spec.ts`, then deploy only after that pass. Re-test https://celeventic.com/u/owuraku-afari on a physical phone.
