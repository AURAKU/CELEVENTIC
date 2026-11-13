# CeleYou Tap Mode MVP audit

Date: 12 November 2026  
Scope: Universal account-free contact exchange on the existing web application.  
Decision: reuse Connect Back, proximity sessions, and two-way exchange. Do not invent a second networking stack. Do not emulate NFC or fabricate proximity.

## Existing implementation (before this MVP)

| Area | Finding |
| --- | --- |
| Host UI | `/dashboard/business-card/tap` renders `CeleYouTapConnect`. Teal stage, plate, QR, join code, BLE nearby list (empty in browsers). |
| Join route | `/tap/[code]` redirected anonymous visitors to `/auth/login`. This blocked Scenario A. |
| Sessions | `CeleYouProximitySession` with hashed 6-character join codes, server expiry, cancel, and security events. QR encoded `https://…/tap/{CODE}` only. |
| TTL | Was 3 minutes. Spec asks for 5 minutes. |
| Connect Back | `POST /api/digital-business-cards/connect` already stored guest name, email, phone, company, title, note, consent, honeypot, and IP rate limits. Source defaulted to `connect_back`. |
| Two-way exchange | `DigitalCardConnectExchange` + `pairKey` upsert. Requires sign-in and an eligible card. |
| Inbox | Paginated `/api/digital-business-cards/[id]/connections`. Labels missed Tap Mode QR. |
| Physical NFC | Permanent `/n/{token}` and `/u/{slug}` remain the NFC destination. Web does not emulate tags. |
| Real-time | Host already polls `GET /api/digital-business-cards/proximity/sessions/{id}` every 1.5s. No SSE/WebSocket in this tree. |
| Native BLE | `phoneToPhoneReady: false` in browsers. Nearby list stays empty without the native app. |

## Reuse

- `createSmartCardConnection` with `source: "tap_mode_qr"`
- `finalizeGuestConnectBack` follow-up and notifications
- `confirmCeleYouExchange` / `pairKey` duplicate prevention
- `buildGuestReach` for public-only snapshots
- `saveDigitalCardContact` vCard
- Existing proximity tokens, hashes, purge, and host poll
- Existing NFC programmer studio and permanent public URLs

## Required changes (this MVP)

1. Stop forcing login on `/tap/[code]`. Serve a mobile-first guest connection page.
2. Keep member Exchange Cards as an optional signed-in path on that page.
3. Set session TTL to 5 minutes with Refresh QR.
4. Record privacy-safe host receipts (first name + time only) after a committed Connect Back or exchange.
5. Label inbox sources honestly. Never call a public URL visit an NFC tap.
6. Gate Tap Mode with admin flags `tap_mode_enabled` and `tap_guest_exchange`.
7. Preserve premium teal Tap Mode visual identity. Copy: Connect Beyond the Tap. / Scan. Connect. Exchange. Instantly.
8. Let published trial cards exchange authorized snapshots. Do not require paid-live for Scenario B.
9. Give admins TTL, create-limit, and exchange toggles without exposing guest emails.

## Honesty constraints

- QR payloads contain only the HTTPS join URL.
- Host presentation screens never show guest email or phone.
- Physical NFC cards continue to open permanent profile URLs.
- The website cannot emulate an NFC tag or invent nearby phones.
