# CeleCard architecture

Modular monolith inside Celeventic. CeleCard owns product modules. Celeventic owns identity, payments infrastructure, QR image generation, uploads, and mail.

```
Guest browser
  /card/{slug}  /c/{token}  /n/{token}
        │
        ▼
  toGuestPublicPayload  ←  DigitalBusinessCard + grants
        │
        ├── public destinations only
        └── locked stubs (brand + mode, no href)

Owner browser
  /dashboard/business-card
        │
        ▼
  session User  →  DigitalBusinessCard (userId)
```

## Boundaries

| CeleCard owns | Celeventic shares |
|---|---|
| Profiles, reach, privacy, grants | NextAuth `User` |
| Guest DTOs | Paystack initialize/webhook (subscription only) |
| Access codes / requests | `/api/qr/image` |
| Connect Back CRM (planned) | Upload storage, rateLimit, sha256Hex |
| Themes / studio UI | Dashboard shell |

Do not credit Event Wallet. Subscription settlement already returns before `walletService.settlePayment`. Keep that early return.

Do not fork authentication. Do not add microservices. Do not switch SQLite to Postgres in this MVP.

## Public DTO rule

`DigitalCardPublicPayload` is the only guest shape. It must never include `userId`, subscription, `viewCount`, hashes, or protected destinations. Protected items appear as `{ id, brand, visibility }` stubs until a valid grant cookie is present.

## Identifiers

- Human handle: `slug` → `/card/{slug}`
- Stable QR: `publicToken` → `/c/{token}` → slug
- Stable NFC device token: `SmartCardNfcDevice.publicToken` → `/n/{token}`
- Handle changes must not rotate `publicToken`

## Privacy storage

- Visibility map: `socials.reachVisibility` keyed by reach item id (`email-0`, `momo-0`, …). Missing key = PUBLIC.
- Codes, grants, requests: `smartcard_access_*` tables. Codes stored as SHA-256 hashes with server pepper. Never plaintext.
