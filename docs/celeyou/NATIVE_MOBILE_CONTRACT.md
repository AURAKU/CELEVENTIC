# CeleYou native mobile contract

January 2027. Phase A documented. Phase B stubbed. Phase C **not tested** on hardware.

## Preserve

- BLE service UUID `a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01`
- Session characteristic `a1c3ce11-7e10-4c0e-9e10-ce1e70c0de01`
- Handshake characteristic `a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01`
- Advertisement: service UUID only (iOS 28-byte foreground budget)
- GATT hello/ack after connect. No account tokens on BLE.
- Rotating discovery ids, short-lived join codes, explicit approval, backend verification
- Deep / Universal / App Links onto `/card/{slug}`, `/c/{token}`, `/n/{token}`

## Do not simulate

The website must not fake nearby-device lists or BLE success. `bleAdvertise` and `nativeBlePeer` stay false in web session capability JSON.

`CeleYouProximityEngine` returns an empty peer list when `canAdvertise` is false.

A native app still cannot force an uninstalled recipient phone to accept arbitrary BLE or NFC payloads. Recipients keep zero-install HTTPS as the fallback.

RSSI is not proof of physical contact.

## Auth and profile APIs (reuse web)

- NextAuth session cookies are web-only. Native should use a dedicated token exchange that is not sent over BLE.
- Public profile: existing `GET /api/digital-business-cards/public/[slug]`
- Proximity sessions: existing `/api/digital-business-cards/proximity/sessions`
- Eligibility: `resolveCeleYouPublicShare`

## Stores

Do not submit to App Store or Google Play without authorization.
