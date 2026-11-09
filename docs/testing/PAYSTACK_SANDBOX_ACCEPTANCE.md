# Paystack sandbox acceptance

Date: 7 Nov 2026  
Status: **PENDING — EXTERNAL DEPENDENCY**

Automated fixtures in `src/lib/payments/__tests__/paystack.test.ts` cover HMAC, charge-only parsing, out-of-order failed events, and amount matching. They do not charge a card.

## Required before live charges

Use Paystack **test** keys only (`sk_test_…`). Never production keys.

Checklist (all must pass on staging):

1. Initialize a ticket payment for a known order total
2. Complete checkout with Paystack test card
3. Webhook `charge.success` with valid `x-paystack-signature` confirms the order once
4. Repeat the same webhook five times: still one ticket, one ledger sale
5. Deliver `charge.failed` after success: payment stays SUCCESSFUL
6. Deliver `refund.processed`: tickets stay issued (provider refunds are disabled)
7. Server-side `transaction/verify` amount and currency match the order
8. Wrong HMAC returns 401 and does not mint tickets

## Blocker

Re-checked 7 Nov 2026 during V2.3. There is no `.env` in this tree. Fixture HMAC tests still pass. Sandbox initialize, charge, webhook replay, and provider settlement were not executed. Playwright lifecycle payment coverage is mocked and is not sandbox acceptance. Do not process real payments. Do not treat the internal 10000 / 500 / 9500 split as Paystack settlement proof.
