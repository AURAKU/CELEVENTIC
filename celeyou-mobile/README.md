# CeleYou mobile (January 2027)

Phase B foundation only. **Does not advertise BLE from this folder yet.** Do not submit to the App Store or Google Play.

The website remains the November web MVP. Recipients without this app still open `https://www.celeventic.com/card/{slug}`.

This folder is excluded from the Next.js web build. Do not import it from `src/`.

## What exists

- Shared protocol in `../src/lib/celeyou-proximity/`
- Honest TypeScript engine that returns **zero peers** unless a native bridge with `canAdvertise: true` reports them
- Swift and Kotlin stubs that throw until Phase C wires Core Bluetooth / Android BLE
- No seeded fake device names

## What does not exist

- A passing iPhone ↔ Android hardware run
- Background discovery
- Phone-to-phone NFC
- Store listings

## Copy

Main line: Bring Closer. Connect Instantly.

Support: Nearby discovery needs the CeleYou app on both phones. Without it, use QR, a link, AirDrop, Quick Share, or an NFC card.

Never show Connected Successfully until the backend has verified the one-time token.

## Next authorized phase

Phase C: prove discovery on two physical phones with both apps in the foreground. Record models and OS versions. Do not invent rows.
