# CeleYou mobile

Native Tap-to-Connect lives here. The website remains the public MVP. Recipients without this app still open `https://www.celeventic.com/card/{slug}` or `/n/{token}`.

This folder is excluded from the Next.js web build. Do not import it from `src/`.

## What exists

- Shared protocol in `../src/lib/celeyou-proximity/`
- Honest TypeScript engine that returns **zero peers** in browsers (`canAdvertise: false`)
- iOS Core Bluetooth peripheral + central in `ios/CeleYouProximity.swift`
- Android BLE advertiser, GATT server, and scanner in `android/CeleYouProximity.kt`
- Advertisements carry only the CeleYou service UUID. Join codes move on GATT after connect.
- Handshake characteristic UUID is reserved for ECDH public keys plus the matching verify code. Private keys never leave the device.

## What is not claimed yet

- A passing iPhone ↔ Android hardware run with recorded models and OS versions
- Background or lock-screen discovery
- Phone-to-phone NFC
- App Store or Play listings

Do not mark phone-to-phone sharing complete until those physical tests pass.

## Copy

Main line: Bring Closer. Connect Instantly.

Support: Nearby discovery needs the CeleYou app on both phones. Without it, use QR, a link, AirDrop, Quick Share, or an NFC card.

Never show Connected Successfully until the backend has verified the one-time token.
