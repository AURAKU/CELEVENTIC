# CeleCard database design

Provider: SQLite. Additive migrations only. Do not `db push` on `digital_business_cards` (JSON default history). Do not run against production without authorization.

## Keep

`DigitalBusinessCard` is the root. Do not duplicate it. Child tables already follow `smartcard_*` + `cardId` + `onDelete: Cascade`.

## Visibility

Stored in `socials.reachVisibility` JSON so existing cards stay PUBLIC with zero column change.

```
{ "phone-0": "CODE_PROTECTED", "momo-0": "REQUEST_ACCESS" }
```

Missing key = PUBLIC.

## New tables (additive)

### smartcard_access_codes

`id`, `cardId`, `label`, `codeHash`, `codeKind` (`DIGITS` | `LETTERS`), `itemKeys` JSON array, `expiresAt`, `revokedAt`, `maxRedemptions`, `redemptionCount`, timestamps.

Never store plaintext codes.

### smartcard_access_grants

`id`, `cardId`, `tokenHash` unique, `itemKeys` JSON, `source` (`CODE` | `REQUEST`), `expiresAt`, `revokedAt`, timestamps.

Cookie holds the raw token. Database holds the hash.

### smartcard_access_requests

`id`, `cardId`, `itemKeys` JSON, `visitorName`, `visitorContact`, `message`, `status` (`PENDING` | `APPROVED` | `DECLINED` | `REVOKED`), `grantId`, timestamps.

No User FK. Anonymous visitors.

Reuse `SmartCardInteraction.kind` for `access_code_ok`, `access_code_fail`, `access_request`, `access_grant` instead of a sixth analytics table.
