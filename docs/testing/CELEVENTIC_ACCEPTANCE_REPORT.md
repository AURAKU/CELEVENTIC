# Celeventic acceptance report

Date: 7 Nov 2026 (updated V2.3 quality gates)

V2.3 evidence: `docs/testing/CELEVENTIC_V23_ACCEPTANCE.md`. Phase 1 is **not complete**.

A feature is complete only with implementation, authorization, safe data access, frontend, errors, tests, and no critical regression. External sandbox or VPS checks are marked pending.

## Gift ledger (`npm run test:gifts`)

Executed locally on 7 Nov 2026 with `DATABASE_URL=file:./dev.db`.

**70 passed, 0 failed.** Gift double-entry, withdrawal reserve, and money helpers remain green after the TICKET book discriminator.

## Integrity suite (`npm run test:integrity`)

Executed locally on 7 Nov 2026 with `DATABASE_URL=file:./dev.db`.

**77 passed, 0 failed, 2 skipped** (PostgreSQL concurrency gated on `CELEVENTIC_PG_TEST_URL`). Isolated SQLite acceptance (`npm run test:accept-sqlite`) later passed 12/12 on a disposable clone of the applied schema.

| Check | Result |
|---|---|
| Ticket inventory unit rules | PASS |
| Ticket lifecycle cancel/refund/transfer rules | PASS |
| Inventory CAS / oversell / confirm-once / refund-once | PASS (in-memory protocol matching SQL `updateMany`) |
| Ticket revenue double-entry (gross + commission, refund, replay, gift isolation) | PASS |
| Promo minor-unit discounts and usage caps | PASS |
| Paystack HMAC, charge-only parse, sticky SUCCESSFUL | PASS |
| Tenant isolation / negative authorization | PASS |
| Webhook secret guard | PASS |
| SHA-256 helper | PASS |
| RSVP deadline, proof, identical-submit, CSV | PASS |
| Live PostgreSQL concurrency | BLOCKED — EXTERNAL DEPENDENCY (no isolated Postgres in this session) |
| Paystack sandbox charges | BLOCKED — EXTERNAL DEPENDENCY (no test keys provided) |
| Paid template 402 | Preserved. Checkout still missing |
| Provider refunds (Paystack/Hubtel) | Not enabled. Status-only refund posts ledger reversal and releases inventory |
| Guest Entry Pass offline suite | Previously COMPLETE AND VERIFIED. Not re-run in this batch |
| CI on GitHub | Workflow expanded. Not executed on GitHub (no Celeventic remote) |
| `tsc --noEmit` in CI | Added. Local full typecheck not used as a Phase 1 pass gate if the repo already has unrelated errors |

## Required journeys still unverified end-to-end

1. Registration
2. Event creation
3. Invitation publish
4. Guest RSVP (deadline + export implemented; no browser E2E)
5. Paid ticket purchase (Paystack sandbox pending)
6. Payment verification (fixtures pass; sandbox pending)
7. Ticket issuance (idempotent confirm + ledger tests pass; no live charge)
8. Online admission
9. Offline admission reconnect
10. Duplicate admission across two devices
11. Studio publish
12. Template purchase (intentionally blocked for paid until checkout exists)
13. Creator earnings
14. Withdrawal (gift path exists; ticket payouts off)
15. Vendor onboarding
16. Vendor booking
17. Memory Vault upload
18. Backup restore drill

Do not treat the above as complete.

## Financial integrity (this batch)

- Ticket revenue uses the existing EventWallet ledger on book `TICKET`
- Debit/credit pairs: `TICKET_GROSS_CREDIT` + `TICKET_COMMISSION_DEBIT`; refunds reverse commission then gross
- Idempotency keys: `ticket_gross:payment:{id}`, `ticket_fee:payment:{id}`, `ticket_refund_*`
- Organizer ticket balance = sum of ticket-book entries (integer minor units)
- Gift book is unchanged and isolated
- Live payouts remain disabled
- Legacy `Wallet.balance` is a projection only

## Performance

No Lighthouse, Web Vitals, or k6 numbers were collected in this batch.
