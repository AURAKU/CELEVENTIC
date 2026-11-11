# CeleYou payment readiness

Increment 8 is not started. Public sharing must not wait on Paystack.

## Current status

**NO-GO for live payments.**

Full architecture and config inspection: `docs/CELEYOU_PAYMENT_READINESS.md` (10 November 2026). Workstation `PAYSTACK_SECRET_KEY` was **Missing**. Live VPS env was not opened. No sandbox charge was invented.

## Increment 1 interaction

`resolveCeleYouPublicShare` does not import payment code. A published trial stays guest-shareable when Paystack env is absent (`src/lib/digital-business-card/__tests__/public-share.test.ts`).

Prices remain Monthly GH₵49, Quarterly GH₵129, Half-yearly GH₵239, Yearly GH₵449. Not changed.

## Gate C still requires

1. Credentials present on the deployment, never printed.
2. Sandbox charge success.
3. Webhook HMAC on the raw body.
4. Amount and currency match before activation.
5. Duplicate webhook handling.
6. Explicit authorization before any live charge.
