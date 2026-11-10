# CeleCard API contracts

## Public (no auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/digital-business-cards/public/[slug]` | Guest DTO only. Honors grant cookie. |
| POST | `/api/digital-business-cards/connect` | Connect Back. Rate limited. |
| POST | `/api/digital-business-cards/public/[slug]/unlock` | 4-character code. Sets grant cookie. Never returns destinations in the unlock body. |
| POST | `/api/digital-business-cards/public/[slug]/access-request` | Anonymous request. |

Unlock responds `{ ok: true }` and sets an HttpOnly grant cookie. Request-access responds `{ ok, requestId }`. Destinations appear only on the next public GET after a valid grant.

## Owner (session)

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/digital-business-cards` | List / create |
| GET/PATCH/DELETE | `/api/digital-business-cards/[id]` | Owner match required |
| POST | `/api/digital-business-cards/avatar` | Portrait |
| POST | `/api/digital-business-cards/pay-qr` | Receive QR image |
| GET | `/api/digital-business-cards/billing` | Subscription |
| POST | `/api/digital-business-cards/[id]/subscribe` | Paystack init |
| GET/POST | `/api/digital-business-cards/[id]/access-codes` | Create / list (hashes never returned as codes) |
| POST | `/api/digital-business-cards/[id]/access-codes/[codeId]/revoke` | Revoke |
| GET | `/api/digital-business-cards/[id]/access-requests` | Pending + history |
| POST | `/api/digital-business-cards/[id]/access-requests/[requestId]/decide` | approve \| decline \| revoke |
| GET | `/api/digital-business-cards/[id]/connections` | Connect Back inbox |

## Errors

JSON `{ error: string }` with 400 / 401 / 403 / 404 / 429. Unlock failures use the same 401 body whether the code is wrong or locked out, plus `retryAfter` when rate limited.
