# CeleYou payment readiness

**Date:** 10 November 2026  
**Scope:** Existing prepaid CeleYou / SmartCard checkout on Paystack.  
**Verdict:** **NO-GO for live customer payments.**  
**Reason:** Application security and prepaid lifecycle checks pass in automated tests, but this workstation has no Paystack credentials and no sandbox charge was performed. Production host environment was not inspected.

Do not treat this document as a production go-live. Do not deploy from this review.

Prepaid catalog (unchanged):

| Plan | Term | Price |
| --- | --- | --- |
| Monthly | 1 month | GH₵49 |
| Quarterly | 3 months | GH₵129 |
| Half-yearly | 6 months | GH₵239 |
| Yearly | 12 months | GH₵449 |

Administrator overlays in `celecard_lifecycle_policy.planPrices` still win when set. Local overlay is empty, so the defaults above are what checkout would charge.

Checkout remains one-time prepaid. There is no recurring mandate (`CELECARD_CHECKOUT_IS_RECURRING_MANDATE = false`).

---

## 1. Existing payment architecture

CeleYou does not have a separate payment stack. It uses the shared Celeventic Paystack adapter with purpose `ADVERTISING` and metadata `kind: "smartcard-subscription"`. Ticketing and Event Wallet paths were not modified.

### Checkout initialization

| Item | Path |
| --- | --- |
| CeleYou subscribe | `src/app/api/digital-business-cards/[id]/subscribe/route.ts` |
| Catalog / displayed prices | `src/app/api/digital-business-cards/plans/route.ts` |
| Catalog overlay | `src/services/digital-business-card/catalog.service.ts` |
| Default plans | `src/lib/digital-business-card/plans.ts` |
| Shared initialize | `src/services/payments/payment.service.ts` (`PaymentService.initializePayment`) |
| Paystack HTTP init | `src/services/payments/payment.service.ts` (`PaystackAdapter.initializePayment`) |
| Generic init (not CeleYou) | `src/app/api/payments/initialize/route.ts` |

Subscribe flow:

1. Session required.
2. Plan loaded from catalog (defaults or admin overlay).
3. Household paid window: extra cards inherit; same-term renew returns 409.
4. Platform ADMIN / SUPER_ADMIN may bypass Paystack. Live customers cannot.
5. `paymentService.initializePayment` stores a `payments` row, then calls Paystack `POST /transaction/initialize` with `amount: Math.round(priceGhs * 100)` pesewas and `currency: "GHS"`.
6. Failed Paystack init marks the row `FAILED`. The card stays `TRIAL`.

Callback URL for CeleYou: `{appUrl}/dashboard/business-card/billing?payment=callback`.

Idempotency key: `smartcard-{cardId}-{planId}-{minute}`. A retry in the same UTC minute reuses the same payment row.

References: `CEV-` plus 16 random characters, unique on `payments.reference`.

### Payment confirmation

| Item | Path |
| --- | --- |
| Owner return / confirm | `src/app/api/digital-business-cards/subscribe/confirm/route.ts` |
| Provider verify | `src/services/payments/payment.service.ts` (`confirmCheckoutReference`, `verifyTransactionDetailed`) |
| Checkout UI copy | `src/lib/digital-business-card/checkout-outcome.ts` |

The confirm route does **not** activate from a client success flag. It reports `payment.status` and whether the card is live after server-side verify.

A success page alone cannot mark a payment successful.

### Webhook handlers

| Item | Path |
| --- | --- |
| HTTP webhook | `src/app/api/payments/webhook/route.ts` |
| HMAC | `src/lib/payments/paystack.ts` (`paystackHmacValid`) |
| Event parse | `src/lib/payments/paystack.ts` (`parsePaystackWebhook`) |
| Status transitions | `src/lib/payments/payment-status.ts` (`nextPaymentStatus`) |

The webhook reads `req.text()` (raw body), verifies HMAC-SHA512, then parses JSON. Only `charge.success` / `charge.failed` confirm or fail a payment. Forged signatures return 401.

### Database models

| Model | Table | File |
| --- | --- | --- |
| `Payment` | `payments` | `prisma/schema.prisma` |
| `PaymentLog` | `payment_logs` | `prisma/schema.prisma` |
| `ApiSetting` | `api_settings` | `prisma/schema.prisma` |
| `DigitalBusinessCard` | `digital_business_cards` | `prisma/schema.prisma` |
| `CeleCardLifecyclePolicy` | `celecard_lifecycle_policy` | `prisma/schema.prisma` |
| `SmartCardLifecycleEvent` | `smartcard_lifecycle_events` | `prisma/schema.prisma` |

Payment stores amount in GHS major units. Paystack is charged in integer pesewas.

### Subscription activation

| Item | Path |
| --- | --- |
| Provider evidence gate | `src/lib/digital-business-card/billing-rules.ts` (`celeYouPaymentEvidenceMatches`) |
| Fulfillment | `src/services/payments/payment.service.ts` (`fulfillCeleYouFromPayment`) |
| Entitlement write | `src/services/digital-business-card/digital-business-card.service.ts` (`activateDigitalCardFromPayment`) |
| Admin bypass | `activateDigitalCardPlan` in the same file |
| Billing history | `src/services/digital-business-card/smartcard-billing.service.ts` |
| Live gate / grace | `src/lib/digital-business-card/lifecycle.ts` |
| Owner renew rules | `src/lib/digital-business-card/billing-rules.ts` |

Activation now requires:

1. Payment row `SUCCESSFUL`.
2. Paystack `transaction/verify` status `success`.
3. Exact pesewa match against the stored checkout amount.
4. Currency match (`GHS`).
5. Stored amount match against the checkout quote (`pesewasMatch` vs `priceGhs` metadata).
6. `lastActivationPaymentId` idempotency so a replayed reference does not extend the term.

### Idempotency and references

- Unique `payments.reference`.
- Unique optional `idempotencyKey`.
- Duplicate `SUCCESSFUL` webhook retries fulfillment without rewriting status.
- `lastActivationPaymentId` blocks double entitlement for the same payment.
- `nextPaymentStatus` keeps `SUCCESSFUL` and `REFUNDED` terminal against a later `charge.failed`.

### Currency and amount

- Catalog and checkout currency: `GHS`.
- Paystack amount: `Math.round(ghs * 100)` integer pesewas (4900 / 12900 / 23900 / 44900 at default prices).
- Provider evidence uses exact minor-unit compare (`paystackAmountsMatch`), not the 51-pesewa catalog tolerance.

### Expiration and grace

- Expiry: `smartCardExpiryFromNow(months, renewalBaseDate)` via `Date.setMonth`.
- Early renew (while paid) is blocked for the owner. Extra cards inherit the household term.
- Late renew starts from now.
- Default grace: 3 days (`DEFAULT_CELECARD_LIFECYCLE_POLICY.gracePeriodDays`).
- Local policy row: `gracePeriodDays = 3`, `expiringSoonDays = 14`, empty `planPrices`.
- Paid term cannot be cancelled (`CeleYouPaidTermLockedError`, HTTP 409).
- Failed payments do not activate (`paymentFailureShouldActivate() === false`).

### In-scope defect fixed in this review

Activation previously trusted the stored checkout GHS amount after the payment row became `SUCCESSFUL`. A webhook HMAC or a Paystack verify status could activate without comparing Paystack’s verified pesewas and currency.

Fix: `fulfillCeleYouFromPayment` now calls `verifyTransactionDetailed` and refuses activation unless `celeYouPaymentEvidenceMatches` passes. Confirm and duplicate-SUCCESSFUL webhooks retry fulfillment, so a delayed verify can still go live without flipping the card from a success page.

Ticketing, gifts, and Event Wallet fulfillment were not rewritten.

---

## 2. Configuration status

Values were never printed. Classification is presence, prefix shape (`sk_test_` / `sk_live_` / `pk_test_` / `pk_live_`), and length only.

Paystack HMAC uses `PAYSTACK_SECRET_KEY`. There is no separate webhook-secret env var.

### Sandbox / local workstation

| Variable | Status | Notes |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | **Missing** | Not declared in `.env.local`. No `api_settings` Paystack row. |
| `PAYSTACK_PUBLIC_KEY` | **Missing** | Not declared. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **Missing** | Alias, also absent. |
| Paystack dashboard webhook URL | **Not applicable** as env | Must be set in Paystack to `https://{host}/api/payments/webhook`. Not verifiable without a key. |
| `NEXT_PUBLIC_APP_URL` | **Configured** | Localhost. Correct for local sandbox return; wrong for live checkout. |
| `NEXTAUTH_URL` | **Configured** | Localhost. |
| `NEXTAUTH_SECRET` | **Configured** | Present, value not shown. |
| `ENCRYPTION_KEY` | **Configured** | Needed if Admin → Integrations stores an encrypted Paystack secret. |
| `DATABASE_URL` | **Configured** | Local SQLite. Provider was not changed. |
| Flutterwave / Hubtel | **Not applicable** | CeleYou checkout uses Paystack. |

Local files: `.env.local` present. `.env`, `.env.production`, `.env.production.local` absent. `api_settings` has no Paystack provider row.

### Production

| Variable | Status | Notes |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | **Missing** on this workstation | Live VPS env was not opened. Do not invent a live key. |
| `PAYSTACK_PUBLIC_KEY` | **Missing** on this workstation | Same. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **Missing** on this workstation | Same. |
| Paystack live webhook | **Not inspected** | Must point at `https://www.celeventic.com/api/payments/webhook`. |
| Live `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` | **Not inspected** | Must be the live Celeventic origin so checkout returns to `/dashboard/business-card/billing`. |

**Do not switch this tree to live mode automatically.** A live secret must never be pasted into local `.env.local` for convenience.

### Safe configuration checklist (operator)

1. Create a Paystack **test** secret and public key in the Paystack dashboard.
2. On the target host only, set:
   - `PAYSTACK_SECRET_KEY=sk_test_…`
   - `PAYSTACK_PUBLIC_KEY=pk_test_…`
   - Optional alias `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to the same public key.
3. Confirm `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` match that host (`http://localhost:3000` locally, `https://www.celeventic.com` in production).
4. In Paystack test settings, set the webhook URL to `https://{that-host}/api/payments/webhook` (or the tunnel you use for local webhooks).
5. Optionally enable Paystack in Admin → Integrations. Env keys are enough; a stored Admin row wins when present and enabled.
6. Restart only the Celeventic Node process after env changes. Do not run `prisma db push`. Do not restart unrelated PM2 apps.
7. Complete one **test** checkout at GH₵49 (or the overlay price). Confirm the `payments` row is `SUCCESSFUL`, the card is `ACTIVE`, and a forged webhook is rejected.
8. Only after that, replace test keys with live keys on the production host. Never commit keys. Never paste secrets into chat or this repo.

External blocker: **Paystack credentials are unavailable in this environment.** No sandbox initialize or charge was attempted.

---

## 3. Security verification

| Control | Result | Evidence |
| --- | --- | --- |
| HMAC-SHA512 on raw body | Pass (automated) | `paystackHmacValid`; webhook uses `req.text()` then JSON.parse |
| Timing-safe compare | Pass (automated) | `crypto.timingSafeEqual` after equal-length buffers |
| Reject forged / empty signature | Pass (automated) | Invalid HMAC → false; webhook returns 401 |
| Charge-only confirmation | Pass (automated) | Refunds, disputes, transfers do not confirm |
| Duplicate SUCCESSFUL | Pass (code + tests) | Status stays SUCCESSFUL; fulfillment is idempotent |
| Amount match (pesewas) | Pass (automated) | Exact minor-unit compare before activation |
| Currency match | Pass (automated) | `GHS` vs provider currency |
| Client success page cannot activate | Pass (code review) | Confirm route only reads provider/DB status |
| Failed init cannot activate | Pass (code review) | Init catch sets `FAILED`; activate never called |
| Failed / pending provider status cannot activate | Pass (automated) | `celeYouPaymentEvidenceMatches` requires `success` |
| Replayed payment id cannot extend term | Pass (automated) | `lastActivationPaymentId` short-circuit |
| Delayed webhook after SUCCESSFUL | Pass (code review) | Duplicate SUCCESSFUL retries CeleYou fulfill |
| Late `charge.failed` after success | Pass (automated) | `nextPaymentStatus` keeps SUCCESSFUL |
| Admin bypass | Intentional | ADMIN / SUPER_ADMIN only; not a customer path |
| Recurring mandate | Absent | Prepaid one-time only |

Residual notes (not live blockers by themselves):

- Subscribe idempotency is a one-minute bucket. Two different checkouts in the same minute for the same card and plan reuse one row.
- The monthly plan blurb still says owners can cancel before renewal. Paid terms cannot be cancelled. Copy only; prices were not changed.
- `PaystackAdapter.verifyTransaction` (ticket-era helper) maps non-success to FAILED, including pending. CeleYou confirm uses `verifyTransactionDetailed` instead.

---

## 4. Tests executed

Automated only. These are **not** Paystack sandbox transactions.

| Suite | Command | Result |
| --- | --- | --- |
| CeleYou unit tests | `npm run test:celeyou` | 151 passed, 0 failed |
| Paystack HMAC / amount / status | `npx tsx --test src/lib/payments/__tests__/paystack.test.ts` | 4 passed, 0 failed |
| First commercial journey (DB) | `npx tsx --test --test-concurrency=1 src/services/digital-business-card/__tests__/first-journey.integration.test.ts` | 1 passed, 0 failed |

---

## 5. Tests passed

Covered by the suites above:

- Successful local entitlement after matching amount (quoted checkout, including overlay-style GH₵400 yearly fixture).
- Incorrect amount (`GH₵1` vs yearly catalog) does not activate.
- Mismatched quote vs charged amount does not activate.
- Provider evidence: monthly 4900, quarterly 12900, half-yearly 23900, yearly 44900 pesewas accepted.
- Incorrect provider amount rejected.
- Incorrect provider currency (`NGN`) rejected.
- Invalid HMAC / tampered body / empty signature rejected.
- Duplicate activation with the same `paymentId` does not change expiry.
- Early renew while the paid window is running does not extend expiry.
- Extra household card inherits the paid term with unique slug, public token, and NFC token.
- Failed provider status and pending status cannot satisfy evidence.
- Out-of-order `charge.failed` cannot unsettle SUCCESSFUL.
- Prepaid, not recurring; paid term cannot be cancelled; grace uses administrator days (default 3).
- Renewal math: early extends from current paid end; late starts from now (`smartCardExpiryFromNow`).

---

## 6. Tests failed

None of the executed automated suites failed.

The following required cases were **not executed against Paystack** because credentials are missing:

- Live or sandbox initialize.
- Sandbox successful charge.
- Sandbox expired / abandoned transaction.
- Sandbox failed charge.
- Delivered webhook from Paystack (valid and forged) on a reachable URL.

---

## 7. Sandbox payment results

**Not performed.**

No Paystack test key was present. No `transaction/initialize` call was made. No authorization URL was opened. No webhook was received from Paystack.

Do not read any section of this document as a successful end-to-end payment.

---

## 8. Remaining production blockers

1. **External: Paystack secret and public keys are missing** on this workstation. Production host keys were not inspected.
2. **No sandbox charge proof.** Automated tests are not a substitute.
3. **Paystack dashboard webhook URL** for `https://www.celeventic.com/api/payments/webhook` is unverified.
4. **Production `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL`** must be the live origin so customers return to CeleYou billing, not localhost.
5. **Do not enable live keys** until a test-mode GH₵49 (or overlay) checkout, verify, webhook, and activation have been observed on a non-production host or Paystack test mode.
6. This review **did not deploy** and **must not be used as a deploy ticket**.

Non-blockers for payment math, already in product policy:

- Administrator complimentary activation remains available to platform admins only.
- Extra cards on one household term remain allowed.
- Overlay prices remain allowed (1–20000 GHS integers).

---

## 9. Exact manual actions required

Operator only. Do not paste secret values into git, chat, or tickets.

1. Add Paystack **test** keys on the intended host using the checklist in section 2.
2. Set the Paystack test webhook to `/api/payments/webhook` on that host.
3. As a non-admin customer, start Monthly checkout and confirm the Paystack amount is **4900 pesewas GHS** (or overlay × 100).
4. Complete the test charge with Paystack test cards.
5. Confirm:
   - `payments.status = SUCCESSFUL`
   - card `subscriptionStatus = ACTIVE`
   - `subscriptionExpiresAt` about one month ahead
   - billing UI shows success only after confirm, not merely because the return URL loaded
6. Replay the same webhook; card expiry must not jump.
7. Send a webhook with a bad signature; expect 401 and no activation.
8. Attempt checkout as a customer while a paid term is running; expect 409, not a new mandate.
9. Only then put **live** keys on production, still without committing them, and repeat one live-mode smoke charge at the real catalog price if the business accepts that cost.
10. Keep SQLite. Do not run `prisma db push`. Do not reset databases. Do not change the four prepaid prices unless an administrator overlay is an explicit business decision.

---

## 10. Go / no-go recommendation

**NO-GO for production / live Paystack.**

The prepaid CeleYou path is structurally ready: correct catalog amounts, integer pesewas, unique references, HMAC webhooks, no client-side activation, provider amount and currency evidence before the card goes live, grace and expiry from administrator policy, and passing automated tests.

It is **not** commercially operational until a human configures Paystack keys and completes a real sandbox (then live) charge. That evidence does not exist in this review.

**Code:** launch-candidate pending credentials.  
**Live payments:** blocked.  
**Deploy from this session:** do not.
