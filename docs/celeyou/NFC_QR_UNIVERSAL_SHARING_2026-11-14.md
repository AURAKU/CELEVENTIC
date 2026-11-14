# CeleYou NFC, QR, and Universal Sharing

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Status:** Implemented in local source. Not committed. Not deployed.

Existing public destinations are unchanged: `/u/{slug}`, `/card/{slug}`, `/c/{publicToken}`, `/n/{nfcToken}`.

## Identity

| Artifact | Stored on | Guest destination |
| --- | --- | --- |
| Profile link | `DigitalBusinessCard.slug` | `/u/{slug}` rewrites to `/card/{slug}` |
| Smart QR | `DigitalBusinessCard.publicToken` | `/c/{publicToken}` redirects to `/card/{slug}` |
| NFC tap | `SmartCardNfcDevice.publicToken` | `/n/{token}` redirects or shows a paused/lost/replaced screen |

Design restore and profile edits do not rotate `publicToken`. NFC replace mints a new `/n` token and leaves the QR token and slug alone. Lost and replaced tags never open a profile. Hardware tag UID is never read on the tap path.

## What changed

- **Admin NFC:** Register, pause, resume, lost, replace, and revoke on the existing CeleYou admin card action API, with AuditLog plus lifecycle events. Organizers are rejected. Lost, replace, and revoke require a reason.
- **Admin Sharing tab:** NFC device list, print PNG/SVG, and the stable `/c/` destination. Copy states that a design change does not invalidate QR or NFC.
- **Owner studio:** Download QR PNG (2048, guide, ECC H, 8-module quiet zone, no logo) and SVG. WhatsApp and Email share the public profile URL. Native share still falls back to clipboard.
- **NFC tap:** Metadata and the tap page share one `findUnique` per request via React `cache`. Tags still store only the HTTPS `/n/` URL.
- **Compatibility copy:** Unchanged and still honest. Desktop and iPhone copy the NFC link. Chrome on Android can write an NDEF URL.

## Privacy and subscription

QR and NFC payloads are tokens only. Guest pages still withhold unpublished, suspended, deactivated, and courtesy private reach. Code-protected links stay hashed and off public JSON. Expired cards follow the existing lifecycle, not a new rule.

## Compatibility matrix

| Surface | Verified here | Result |
| --- | --- | --- |
| Local `/u/kojo-mensah` and `/card/kojo-mensah` | HTTP 200 on `:3012` | Pass |
| Smart QR image PNG/SVG | `/api/qr/image` guide 512 PNG and 2048 SVG | Pass |
| Owner studio share desk | Browser on `:3012` | Copy link, WhatsApp, Email, PNG, SVG, Copy NFC link |
| iPhone Safari NFC write | Unit `detectNfcWriteSupport` | Cannot write. Copy link. |
| Desktop Chrome NFC write | Unit + studio | Cannot write. Copy NFC link. |
| Android Chrome NFC write | Source + unit | Write only when `NDEFReader` exists |
| Second-device camera scan | Not run | Existing `/c/{token}` destination unchanged |
| Physical NFC tap | Not run | Existing `/n/{token}` destination unchanged |
| Desktop Safari / Edge | Not run in this session | Same HTTPS destinations |
| Playwright e2e | Chromium download still stalled | Not claimed |

## Regression tests

`npm run test:celeyou` **293/293**.

Coverage includes stable tokens vs slug, print QR guide settings, admin NFC permission denial, lost/replaced tap outcomes, WhatsApp/email hrefs without private phone numbers, and honest Web NFC copy.

## Out of scope on purpose

- No production deploy, Prisma push, or entitlement change.
- No new warehouse table of blank tags. Admin register is per CeleYou card and reuses `SmartCardNfcDevice`.
- Tag UID is not stored and is not authentication.
- Public `/c` and `/n` landings still rewrite onto the live Celeventic origin, not localhost.
