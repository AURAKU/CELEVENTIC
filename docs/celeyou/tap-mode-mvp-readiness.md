# CeleYou Tap Mode MVP deployment readiness

Status: **ready for staging** after the usual VPS migrate/build. **Not production-authorized.** This agent must not deploy.

## A. Architecture

Tap Mode stays on existing proximity sessions. The cardholder opens `/dashboard/business-card/tap`, which creates a 5-minute `CeleYouProximitySession`. The QR encodes `/tap/{pairingToken}` (256-bit). The six-character `joinCode` remains for typed entry only.

Anyone who scans that URL lands on a guest page. No CeleYou account is required. Guests can save the public vCard, share the public profile, or send contact details through the existing Connect Back API with `source: tap_mode_qr`. Signed-in CeleYou members can confirm a two-way exchange of authorized snapshots.

The cardholder screen keeps polling the session. After the server commits the guest row, the session stores a first-name receipt. The host sees Connection Received without private guest fields.

Physical NFC cards still open permanent `/n/{token}` or `/u/{slug}` URLs. This web MVP does not write NFC tags or emulate phone-to-phone NFC.

## B. Features completed

- Account-free guest connection page on `/tap/[code]`
- Secure hashed join codes, 5-minute TTL, refresh, cancel, expiry
- Guest Save Contact, View Full Card, Share, Exchange Contact
- Connect Back reuse with `tap_mode_qr`, consent, honeypot, rate limits, duplicate suppression
- Optional signed-in Exchange Cards on the same page
- Privacy-safe host Connection Received state
- Inbox source labels: QR Connection, Physical NFC (only when stored as NFC), CeleYou Exchange, Connect Back
- Admin flags `tap_mode_enabled` and `tap_guest_exchange`
- Admin desk controls for TTL (60 to 900 seconds), session create limit, guest exchange, and two-way exchange
- Host states: Initializing, Ready, Waiting for Scan, Connection Received, Awaiting Confirmation, Exchange Successful, Session Expired, Session Cancelled, Connection Failed, Offline
- Username (`@slug`) on host and guest screens
- Member card picker when the visitor has more than one eligible CeleYou
- Published trial cards can exchange authorized public snapshots
- Analytics events `SESSION_CREATED`, `GUEST_PAGE_OPENED`, `GUEST_CONNECT`, `SESSION_EXPIRED`
- Permanent NFC/public URLs unchanged

## C. Important files

- `src/app/tap/[code]/page.tsx`
- `src/components/digital-business-card/celeyou-tap-guest-view.tsx`
- `src/components/digital-business-card/celeyou-tap-connect.tsx`
- `src/services/digital-business-card/proximity.service.ts`
- `src/app/api/digital-business-cards/proximity/guest/route.ts`
- `src/app/api/digital-business-cards/connect/route.ts`
- `src/app/api/digital-business-cards/connect/exchange/route.ts`
- `src/lib/celeyou-connect/pair.ts`
- `src/lib/celeyou-connect/flags.ts`
- `src/lib/celeyou-proximity/product.ts`
- `src/app/api/admin/celecard/tap/route.ts`
- `src/components/digital-business-card/celecard-tap-admin-form.tsx`
- `src/components/digital-business-card/digital-card-connect-exchange.tsx`

## D. Database changes

Additive columns on `celeyou_proximity_sessions`: `pairingToken`, `pairingTokenHash` (unique). Guest receipts stay in `capabilityJson.guestReceipts`. Connections reuse `smartcard_connections`. No destructive migration.

## E. API endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/digital-business-cards/proximity/guest?code=` | Public. Rate limited. Returns public host snapshot + expiry. |
| POST | `/api/digital-business-cards/connect` | Optional `tapJoinCode`. Writes `tap_mode_qr`. |
| POST | `/api/digital-business-cards/connect/exchange` | Optional `tapJoinCode` for host receipt. |
| POST | `/api/digital-business-cards/proximity/sessions` | Existing host create. Now 5-minute TTL. |
| GET | `/api/digital-business-cards/proximity/sessions/{id}` | Existing authenticated poll. Includes `guestReceipt`. |

## F. Security

- QR pairing uses a 256-bit URL token. Short join codes stay for typing and are hashed separately.
- QR never contains email, phone, or private fields.
- Guest landing uses `buildGuestReach` and public-share checks. Disabled, unpublished, or expired cards do not open a session.
- Expired, cancelled, and paused sessions return 410/404.
- Connect Back keeps consent, honeypot, per-card and per-IP rate limits, and a 6-hour duplicate window.
- Host receipts store first name and timestamp only, and only after the connection row commits.
- Cross-origin Tap submissions are rejected.
- Redis `INCR` is used when `REDIS_URL` is reachable. Without Redis, limits are per process.
- Admin flags can pause Tap Mode or guest exchange without a schema change.

## G. Testing

Executed locally:

```
npm run test:celeyou
ℹ tests 232
ℹ pass 232
ℹ fail 0
```

Browser verification on local HTTPS-equivalent `http://127.0.0.1:3000`:

- `/tap/ABCDEF` opens without login and shows the expired session state.
- Host Tap Mode generated join code `J5KVMV`.
- Guest opened `/tap/J5KVMV` with no account wall, sent contact as Ama Serwaa, and saw You’re Connected.
- Host poll then showed Connection Received / Ama / time only. No guest email on the presentation screen.

Device verification still required on a real iPhone and Android camera before production: QR scan, vCard save, and mobile browser share.

Device verification still required on a real iPhone and Android camera before production: QR scan, vCard save, and mobile browser share.

## H. Known limitations

- Real-time confirmation uses the existing 1.5s authenticated poll, not SSE or WebSockets.
- Native BLE nearby discovery still requires the CeleYou app. Browsers cannot advertise.
- This website cannot emulate NFC tags or start AirDrop/Quick Share by touching phones.
- Session lifetime defaults to 5 minutes and can be changed by admins between 1 and 15 minutes.
- Failed session diagnostics use existing `CeleYouProximitySecurityEvent` rows. This desk does not show guest emails.
- `generateMetadata` and the page both resolve the session. Open is recorded once from the page render.

## I. Deployment readiness

Staging: yes, after `npx prisma migrate deploy` (no new Tap Mode migration) and a standard build.  
Production: not authorized. Do not deploy from this agent.

Live VPS remains on the previously deployed commit until the operator pushes and runs `cd /var/www/CELEVENTIC && bash scripts/deploy-vps.sh`.

## J. Remaining actions

1. Push only when asked.
2. Test QR scan on iOS Camera and Android Camera against staging HTTPS.
3. Confirm vCard save on iPhone Add to Contacts and Android share/download.
4. Confirm a guest exchange appears in the owner inbox as QR Connection.
5. Confirm a member exchange does not duplicate `pairKey` rows.
6. Optional later: SSE, admin TTL controls, and native BLE when `phoneToPhoneReady` is true.
