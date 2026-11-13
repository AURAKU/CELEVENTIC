# CeleYou Adaptive UI System

Brand, plate ratio, teal, Cinzel/Cormorant/Poppins, and product behavior stay. Layouts adapt to the viewport. Essential actions wrap onto extra rows. They are never hidden.

## Breakpoints used

Content-driven. Testing categories:

| Category | Width |
| --- | --- |
| Small mobile | 320–374 |
| Standard mobile | 375–430 |
| Large mobile | 431–599 |
| Small tablet | 600–767 |
| Tablet | 768–1023 |
| Laptop | 1024–1439 |
| Desktop | 1440–1919 |
| Large desktop | 1920+ |

Landscape phones (`orientation: landscape` and `max-height: 540px`) use a two-column Tap layout. Public cards still cover-fill on landscape hold. Tap Mode does not.

## Shared foundations

- Fluid titles: `clamp(1.35rem, 1.05rem + 1.8vw, 2.35rem)`, tighter under 430px
- Touch target: 2.75rem
- Safe-area padding on Tap and guest stages
- `100dvh` / `--app-viewport-min-height`
- Sheets and exchange panels scroll inside `min(86dvh, 42rem)`
- Identity copy wraps; CTA labels stay on one line
- QR wells keep `aspect-ratio: 1` and `object-fit: contain`
- Tap landscape keep connection QR and actions visible (cover-hold is public-card only)

## Surfaces

Public card, Tap Mode, guest `/tap/{token}`, wallet, studio, connection inbox, admin Tap and pricing desks.

## Files

- `src/app/celeyou-adaptive.css` (loaded after `globals.css` from `src/app/layout.tsx`)
- Tap host/guest, Connect panel, wallet, inbox, admin desks
- Playwright spec: `e2e/celeyou-adaptive.spec.ts`
- Device checklist: `docs/celeyou/adaptive-device-checklist.md`

## Automated tests

```
npm run test:celeyou
npx playwright test --config=playwright.config.ts e2e/celeyou-adaptive.spec.ts
```

Unit tests: **237 pass, 0 fail** (2026-11-13, local). Adaptive assertions included.

Playwright Chromium: **NOT RUN**. The Playwright cache on this machine has no Chromium binary (`~/Library/Caches/ms-playwright` only contains a lock file). Do not treat the spec as passed.

## Viewport captures reviewed (local Chromium CDP)

Clipped screenshots in `e2e/screenshots/`:

| File | Viewport | Overflow | Visual review |
| --- | --- | --- | --- |
| `adaptive-public-card-320.png` | 320×568 | scrollWidth 320 | Plate ID-1 1.585, dock visible |
| `adaptive-public-card-390.png` | 390×844 | 390 | Plate 354×223, QR square |
| `adaptive-public-card-landscape-hold-667.png` | 667×375 hold | 667 | Cover-fill, no mint bar |
| `adaptive-public-card-1440.png` | 1440×900 | 1440 | Plate capped ~380px, actions in a row |
| `adaptive-tap-guest-390.png` | 390×844 | 390 | Expired state, heading and CTA complete |
| `adaptive-tap-guest-landscape-667.png` | 667×375 | 667 | Expired state, CTA visible |
| `adaptive-tap-host-390.png` | 390×844 | 390 | Waiting for Scan, QR 279×279 |
| `adaptive-tap-host-landscape-667.png` | 667×375 | 667 | Two-column plate + connection QR |
| `adaptive-plans-390.png` | 390×844 | 390 | Hero and primary CTAs readable |

DOM overflow passing does not prove a premium look. The images above were inspected.

## Accessibility findings (this pass)

- Focus-visible rings: teal on Tap/guest, brand teal on studio (`:focus-visible`)
- Touch targets: 2.75rem on coarse pointers for Tap actions
- `prefers-reduced-motion` disables sheet/receipt animation
- Viewport meta keeps `width=device-width` and does not disable zoom
- 200% zoom and 200% text resize: **NOT RUN**
- Screen-reader pass: **NOT RUN**
- Contrast: existing CeleYou dark Tap and Gold Folio public theme were not recalculated in this pass

## Performance findings

- Adaptation is CSS-first (no extra resize listeners added)
- Landscape Tap reuses existing silent-hold session start; cover-hold CSS is overridden rather than adding JS
- Image/QR endpoints unchanged
- CLS: plate aspect-ratio 1.585 and QR `aspect-ratio: 1` reserved before paint

## Remaining issues

1. Playwright adaptive suite not executed (Chromium missing).
2. Physical-device checklist is blank. Do not mark iPhone/Android/iPad/Firefox as passed.
3. Connect Back sheet, studio desks, wallet, inbox, and admin tables were wired to the adaptive layer but not screenshot in this pass.
4. Landscape host connection QR is height-capped (`min(14rem, 52dvh)`). Camera scan on a real phone is unverified.
5. Join-code tracking on landscape can look sparse (`V G H 3 4 C`). Functional, not a wrap defect.
6. Guest Tap expired `/tap/ABCDEF` is a closed-session fixture, not a live guest Connect Back form.

## Production-readiness

**Not production-ready for deploy.** Local CSS and component wiring are in the development tree only. Live VPS stays on the currently authorized commit until the user deploys. No production Prisma push. No SSH.

Staging HTTPS and real-device QR scan remain **BLOCKED / NOT RUN**.
