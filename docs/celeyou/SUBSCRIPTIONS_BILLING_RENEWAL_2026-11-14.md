# CeleYou subscriptions, billing, and renewal

Date: 14 November 2026  
Scope: strengthen the existing prepaid lifecycle. Catalog prices were not changed. No new payment provider was added. This work was not deployed.

## 1. Existing behavior (audit)

### Catalog (unchanged)

Published CeleYou Pro prepaid terms, settled in GHS on Paystack:

| Plan | Price | Term |
| --- | --- | --- |
| Monthly | GH₵49 | 1 month |
| Quarter | GH₵129 | 3 months |
| Half-yearly | GH₵239 | 6 months |
| Yearly | GH₵399 | 12 months |

Concierge design remains GH₵800 one-time and sold separately. Business / Teams / Enterprise sit in `CELEYOU_TIER_CATALOG` as unpublished proposals. Checkout IDs remain `monthly | quarter | half | yearly`.

### Stored vs derived states

`DigitalBusinessCard.subscriptionStatus` stores `TRIAL | ACTIVE | EXPIRED` (and unused `INACTIVE`). Public and admin presentation use derived `resolveCeleCardLifecycle`:

| Derived state | Owner billing phase | Meaning |
| --- | --- | --- |
| DRAFT | pending_activation | Trial, unpublished, or admin-deactivated |
| ACTIVE | active | Paid, published, more than 14 days left |
| EXPIRING | renewal_due | Paid, published, within `expiringSoonDays` (14) |
| GRACE_PERIOD | expired | Paid window ended, still live for `gracePeriodDays` (3) |
| COURTESY | expired | After grace. Identity kept. Reach withheld |
| SUSPENDED | suspended | Admin suspend |
| DELETED | deleted | Soft delete |

Prepaid terms cannot be cancelled. There is no stored `CANCELLED` status. Extra cards inherit the account’s paid window.

### Payment path that already worked

- Owner checkout: `POST /api/digital-business-cards/[id]/subscribe`
- Confirm: `GET /api/digital-business-cards/subscribe/confirm` via `confirmCheckoutReference`
- Webhook: `POST /api/payments/webhook` with Paystack HMAC
- Activation: `fulfillCeleYouFromPayment` → `celeYouPaymentEvidenceMatches` → `activateDigitalCardFromPayment`
- Client “payment success” never activates the card
- Duplicate success: `lastActivationPaymentId` no-op
- Failed provider evidence writes `ActivationFailed`
- Identity, slug, `publicToken`, QR `/c`, and NFC `/n` are not rotated on pay, renew, or expire
- Courtesy payload keeps name / title / company / avatar / theme and clears bio, email, phone, website, socials, and `publicToken`
- Courtesy UI blurs the face using that sanitized payload, not hidden HTML with private reach

### Entitlements actually enforced

One prepaid term per account. Public share policy. NFC tap outcomes. Private reach codes (owner-auth, not a paid lock). Analytics are owner-only. Premium theme badges are not gated. Unpublished tier entitlements are not live locks.

## 2. Improvements in this pass

1. **Paystack-only CeleYou checkout.** Subscribe methods are `card | mobile_money | bank_transfer`. Alipay / WeChat were removed from this route so CeleYou cannot silently open Stripe CNY.
2. **Open-checkout reuse.** A PENDING advertising payment for the same card and plan is reused. A new idempotency key is minted only when no open row exists. Minute-bucket keys are gone, so double-taps in the same minute no longer create a second charge after the bucket rolls.
3. **Failed charge audit.** Transition to `FAILED` records `CheckoutFailed` once in `updatePaymentStatus`. Confirm no longer writes a second event on every refresh.
4. **Renewal scan paging.** Cron still uses `POST/GET /api/cron/smartcard-renewals`. The job now walks cards in pages of 100, up to 5,000, instead of `take: 200`.
5. **Activation and renewal notices.** After a verified Paystack activation, the owner gets a deduped in-app notice (`CELECARD_ACTIVATED` or `CELECARD_RENEWED`) keyed by card, term date, and payment id.
6. **Admin directory filters** match derived lifecycle: active (still in paid window), renewal due, grace, expired/courtesy, pending (trial), suspended, deleted. Pagination unchanged (`ADMIN_TABLE_LIMIT`).
7. **Admin payment history.** Card detail Subscription tab lists paginated Paystack advertising rows for that card (status, amount, plan, reference). Failed charges stay visible.
8. **`ActivationFailed`** is now a named lifecycle event alongside `CheckoutFailed`.

## 3. Remaining gaps (not invented, not silently changed)

| Gap | Why it stayed |
| --- | --- |
| Published trial cards remain guest-shareable until the trial window ends | `isCeleCardGuestShareable` already encodes this. Changing it would hide live trial URLs. |
| Premium templates, NFC, and analytics are not sold as separate locks | Unpublished entitlements must not be activated without catalog approval. |
| Owner billing history still filters 200 advertising rows in memory | SQLite JSON path filters are not reliable enough to page only CeleYou rows in SQL. |
| SMS / WhatsApp renewal sends do not consult `CeleYouConnectPreference.marketingNotifications` | That flag defaults off and is a Connect marketing preference. Treating it as a billing opt-out would drop transactional reminders. Email + in-app remain the durable record. |
| Admin Paystack bypass (`isAdminCommerceBypass`) still activates without a Payment row | Existing admin commerce path. Manual entitlements already use the grant ledger. |
| Cron is HTTP + `CRON_SECRET` / `SMARTCARD_CRON_SECRET`, not a Vercel cron file | No scheduler was invented. Production must keep calling the route. |
| Physical NFC tap and Playwright e2e were not run | Chromium e2e remains stalled in this environment. |
| No production deploy | Explicitly out of scope. |

## 4. Tests

`npm run test:celeyou`: **302 / 302 pass**.

New coverage in `src/lib/digital-business-card/__tests__/billing-lifecycle.test.ts`:

- Phase mapping (pending / active / renewal due / expired / suspended)
- Directory grace vs courtesy vs expiring windows
- Expiry-date extension vs late restart
- Duplicate payment / failed payment never activate
- Paystack method allowlist and open-checkout reuse
- Renewal job cursor + term-keyed reminder links
- Courtesy HTML does not carry email, phone, or public token
- Unpublished Business / Teams not used as checkout IDs
- USER / ORGANIZER / GUEST cannot extend, grant, or change plan

Existing catalog, lifecycle, public-access, and checkout-copy tests remain green.

## 5. Deployment requirements (manual)

Do **not** auto-deploy. When an authorized operator ships this:

1. Keep Paystack as the CeleYou rail. Do not enable Stripe Alipay / WeChat for this product.
2. Confirm `PAYSTACK_SECRET_KEY` and webhook HMAC on `/api/payments/webhook`.
3. Schedule `POST /api/cron/smartcard-renewals` with `Authorization: Bearer $CRON_SECRET` or `x-cron-secret` (daily is enough for day-offset reminders).
4. No Prisma schema change. No `db push`. SQLite provider stays.
5. Catalog overlay remains Super Admin + `CONFIRM_PRICING`. Do not publish Business / Teams prices from this branch.
6. Smoke after deploy: new checkout, confirm callback, duplicate callback, failed charge, expired courtesy page, QR `/c/{token}` and NFC `/n/{token}` unchanged.

## 6. Files touched

- `src/lib/digital-business-card/billing-rules.ts`
- `src/lib/digital-business-card/lifecycle.ts`
- `src/app/api/digital-business-cards/[id]/subscribe/route.ts`
- `src/app/api/digital-business-cards/subscribe/confirm/route.ts`
- `src/services/digital-business-card/smartcard-billing.service.ts`
- `src/services/digital-business-card/smartcard-renewal.service.ts`
- `src/services/digital-business-card/digital-business-card.service.ts`
- `src/services/digital-business-card/admin-command.service.ts`
- `src/services/payments/payment.service.ts`
- `src/components/digital-business-card/celecard-command-directory.tsx`
- `src/components/digital-business-card/celecard-card-detail.tsx`
- `src/lib/digital-business-card/__tests__/billing-lifecycle.test.ts`
- `src/lib/digital-business-card/__tests__/catalog-pricing.test.ts`
