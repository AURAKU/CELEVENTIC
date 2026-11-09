# Account deletion policy gaps

Date: 7 Nov 2026  
Status: request workflow exists. Erase is not automatic.

## What is implemented

- Signed-in users can request deletion from Privacy Center (`POST /api/privacy-center` action `deletion`).
- A `DataDeletionRequest` row is stored with status `PENDING_REVIEW`.
- A personal-data discovery summary is stored on the request (counts of events, payments, guests, orders).
- Financial records and admission history are flagged as retained until a reviewer decides otherwise.

## What is not decided (do not invent)

- How long payment and ledger rows must be kept under Ghanaian tax or payment-provider rules
- Whether guest names on past events may be anonymized or must remain for the organizer
- Whether QR admission history can ever be deleted
- Who may approve an erase besides platform admins
- Notification channel and SLA after review

## What must never happen without written authorization

- `prisma` deletes against production
- Automatic wipe of `payments`, `event_wallet_ledger_entries`, or `guest_passes`
- Provider refunds or payout reversals as a side effect of account deletion
