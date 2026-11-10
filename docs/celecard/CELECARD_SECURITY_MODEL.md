# CeleCard security model

## Guests vs owners

Guests receive `DigitalCardPublicPayload` only. Owners receive Prisma rows over session APIs scoped by `userId`.

## Protected destinations

CSS hiding is not protection. Protected phones, emails, links, and payment details must be absent from:

- Public JSON
- RSC / HTML
- vCard
- Open Graph / metadata
- Unlock API responses

## Access codes

Four-character codes are low-entropy. They are not passwords.

- Normalize: 4 digits or 4 A–Z letters
- Store SHA-256(`pepper + cardId + normalized code`)
- Do not bcrypt (guessing plus CPU becomes a DoS)
- Constant-time compare of hashes
- Rate limit 5 / 5 min per card+IP and 20 / 5 min per IP
- Expiry, revoke, optional redemption cap
- Never log codes or hashes alongside raw input
- Never put codes in localStorage

## Grants

Unguessable token in an HttpOnly, SameSite=Lax cookie. Database stores hash + itemKeys + expiry. Revoke and expiry stop access on the next request.

## Request access

Anonymous. Rate limited. Owner approval creates a grant URL the owner can send. Do not put destinations in email previews.

## Payments

CeleCard shares owner destinations. It is not a custodial wallet. Never store card PANs. Never mix with Event Wallet. Keep live checkout disabled until sandbox acceptance.

## Uploads

Existing avatar and pay-QR routes: type, size, session. Do not fetch owner-submitted URLs from the server.
