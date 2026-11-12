# CeleYou Connect commercial readiness

Date: 12 Nov 2026

This document proposes entitlements. It does **not** change live pricing, Paystack checkout, or existing guest Connect Back.

Current prepaid catalog (unchanged):

- Monthly GH₵49
- Quarterly GH₵129
- Half-yearly GH₵239
- Yearly GH₵449

There is no Free / Professional / Business / Enterprise SKU on CeleYou today. Cards are complimentary, promotional, manual, or paid against that catalog.

## Proposed entitlements (not activated)

| Capability | Complimentary / trial | Paid CeleYou (current catalog) | Future Business | Future Enterprise |
|---|---|---|---|---|
| Guest Connect Back | Yes | Yes | Yes | Yes |
| Connection inbox | Yes | Yes | Yes | Yes |
| Two-way Exchange Cards | Yes | Yes | Yes | Yes |
| Owner connection alerts | Yes | Yes | Yes | Yes |
| Automatic thank-you email | Off by default | On if owner enables | On | On |
| Reminders / timeline | Flag off | Flag off until R2 | Yes | Yes |
| CRM sync | No | No | HubSpot first | All connectors |
| Team shared connections | No | No | Optional | Policy-based |
| Enrichment | No | No | Authorized only | Authorized only |

Do not move Connect Back behind a paywall. Do not invent a new price without approval.

## Operational costs (order of magnitude)

- Email: Resend transactional. Thank-you + owner alert per connection. Volume follows public QR/NFC traffic.
- SMS / WhatsApp: not in Release 1. Unauthorized channels stay off.
- CRM: OAuth apps and HubSpot/Salesforce/Zoho subscription on the customer side. Celeventic stores refresh tokens server-side only when R3 is approved.
- Enrichment: no paid data vendor in R1.
- Storage: snapshots are small JSON on `smartcard_connections`. Indexes on `cardId`, `pairKey`, `status`.
- Jobs: existing SQLite worker. One extra queue. No Redis queue.

## Recommendation

Ship Release 1 on the current catalog. Keep auto follow-up off until the cardholder opts in. Revisit Business/Enterprise SKUs after HubSpot sandbox testing, not before.
