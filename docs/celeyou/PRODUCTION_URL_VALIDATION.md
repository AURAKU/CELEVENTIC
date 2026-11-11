# CeleYou production URL validation

Increment 1. Encoded guest URLs only.

## Canonical origin

`https://www.celeventic.com` (`DEFAULT_PRODUCTION_URL` in `src/lib/app-url.ts`).

Approved hosts: `celeventic.com`, `celeventic.org`, `celeventic.online` and their `www` forms. Encoded QR, NFC, and vCard URLs always use `https://`.

## Builder

`celeYouProductionOrigin(candidate)` in `src/lib/app-url.ts`.

Used by:

- `celeYouGuestOrigin`
- `getCeleYouShareOrigin`
- `celeYouCameraScanUrl` / `celeYouNfcScanUrl`
- `celeYouScanLandingUrl`
- `celeYouAbsoluteGuestPayload` for `/c`, `/n`, `/card`, `/u` paths
- NFC manager `nfcUrl` via `celeYouNfcScanUrl`

## Rejected encodings (verified by automated tests)

| Input | Result |
|---|---|
| `http://localhost:3000` | canonical production |
| `http://127.0.0.1:3000` | canonical production |
| `http://192.168.1.20:3000` | canonical production |
| `https://celeyou-preview.vercel.app` | canonical production |
| `https://user:pass@www.celeventic.com` | canonical production |
| `http://www.celeventic.com/` | `https://www.celeventic.com` |

`isCeleYouProductionGuestUrl` requires HTTPS, an approved host, a CeleYou path, and no `access` query.

## Live website

**Not tested** on this increment. After the 11 November 2026 Hostinger attempt, live health still reported commit `b2a7d85`. Do not mark Gate A GO until a later authorized deploy serves `978f328` or newer and `/c/{token}` / `/n/{token}` / `/card/{slug}` are checked on `https://www.celeventic.com`.

## Open redirects

Scan landing only builds `/card/{slug}` on an approved origin. Token lookup 404s when the card is missing. Physical-device redirect timing is **not tested**.
