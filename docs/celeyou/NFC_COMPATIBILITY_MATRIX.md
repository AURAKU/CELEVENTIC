# CeleYou NFC compatibility matrix

Increment 2, 3, 7, and 10. **Not tested** on physical devices in Increment 1.

## Web claims that stay false

- iPhone to iPhone NFC
- iPhone to Android NFC
- Android to Android NFC through the website
- Safari NFC tag writing
- Automatic BLE advertising

## Encoded URL (Increment 1)

Physical tags must store `https://www.celeventic.com/n/{nfcToken}`. Builder: `celeYouNfcScanUrl`. **Verified by automated tests.** Not verified by writing a tag.

## Expected device behavior (not yet measured)

| Pair | Today |
|---|---|
| Any phone to programmed NDEF URL tag | OS should offer the HTTPS link. Recipient needs no app. |
| Chrome Android write | Web NFC when the browser exposes `NDEFReader`. Increment 3. |
| iPhone Safari write | Must show an honest fallback. Increment 3. |

Record exact model, OS, browser, tag type, detect, open, and correct profile before claiming Gate B GO.
