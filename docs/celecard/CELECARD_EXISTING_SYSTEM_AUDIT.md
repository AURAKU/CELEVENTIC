# CeleCard existing system audit

Date: 2026-11-09  
Repo: `CELEVENTIC-main`  
Database: SQLite (`prisma/schema.prisma` datasource). Do not migrate providers.  
Product name: CeleCard. Code names: SmartCard, digital-business-card.

## Verdict

CeleCard is already a working mobile-first web product on the shared Celeventic NextAuth `User`. Anonymous guests can open a live card, save a vCard, Connect Back, share, and copy payment details. Registered owners can create, design, publish, and pay for activation through existing Paystack.

The P0 gap is **per-item privacy**. A live card currently sends every email, phone, social, and payment destination to guests in HTML, JSON, and vCard. There are no access codes, no request-access grants, and no server-side redaction of protected items.

## Classification

| Capability | Status |
|---|---|
| Shared Celeventic account + CeleCard-first signup (`intent=smartcard`) | Fully functional |
| Owner studio `/dashboard/business-card` | Fully functional |
| Public profile `/card/[slug]` (live vs withheld) | Fully functional |
| Dummy card `/card/ama-serwaa` and dummy studio | Fully functional |
| Smart QR `/c/{publicToken}` | Fully functional for live cards; slug leak if token exists while offline |
| NFC landing `/n/{token}` | Partially functional (resolver exists; no device registry UI) |
| NFC write from studio | Missing (copy-link only) |
| vCard save | Fully functional |
| Social, chat, website, pay wallets, bank details, payment QR | Fully functional (copy / open / scan; not custodial) |
| Subscription Paystack activation | Fully functional (wired; needs sandbox acceptance for live money) |
| Connect Back capture | Partially functional (writes rows; no owner inbox; no rate limit) |
| Per-item PUBLIC / CODE_PROTECTED / REQUEST_ACCESS | Missing |
| Four-character hashed access codes | Missing |
| Owner approval of access requests | Missing |
| Owner analytics beyond `viewCount` | Missing |
| Admin CeleCard console | Missing |
| Event Wallet coupling | Absent by design (must stay that way) |

## Routes

- Guest: `/card/[slug]`, `/c/[token]`, `/n/[token]`, `GET /api/digital-business-cards/public/[slug]`
- Dummy: `/digital-cards`, `/digital-cards/demo`, `/digital-cards/demo/studio`
- Owner: `/dashboard/business-card`, `/dashboard/business-card/billing`
- Signup: `/auth/register?intent=smartcard&next=/dashboard/business-card`

Middleware does not wall `/card`, `/c`, `/n`, or `/digital-cards`.

## Data

Root model: `DigitalBusinessCard` (`digital_business_cards`). Live is computed: published + `subscriptionStatus === "ACTIVE"` + unexpired. Trial cards stay offline.

Related tables exist and are mostly unused in UI: `SmartCardVariant`, `SmartCardNfcDevice`, `SmartCardCampaign`. `SmartCardConnection` is written. `SmartCardInteraction` records `nfc_tap` and `connect` only.

Contacts and pay destinations live in `socials` JSON. Bank accounts use `bankv1:` records. No second user table.

## Auth

One Celeventic account. Existing users sign in to studio. New CeleCard users register with product intent `celecard` / `smartcard` and skip event onboarding. Guests never need an account.

## Do not break

Invitations, RSVP, ticketing, QR admission, Event Wallet, Studio Editor / template marketplace, NextAuth, `/api/qr/image` guide mode, SQLite JSON defaults on `digital_business_cards.socials`.

## Next implementation batch

Server-side reach visibility, hashed access codes, anonymous request-access, short-lived grants, Connect rate limit. Additive Prisma only. No production migrate, no live payouts, no Event Wallet changes.
