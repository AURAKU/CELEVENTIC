# CeleCard MVP roadmap

## Milestone 0 — Discovery

Audit of the live tree. This document set.

## Milestone 1 — Public identity foundation

Mostly already shipped: shared-account onboarding, studio create/edit, publish, `/card/{slug}` live gate.

Remaining: withhold slug on `/c/{token}` when the card is not live.

## Milestone 2 — Universal sharing

Shipped: profile QR, vCard, native share, social/pay link hub.  
Partial: NFC landing without device registry. NFC write is copy-link plus capability detection.

## Milestone 3 — Privacy and connections (active)

Shipped in this batch:

- Per-item PUBLIC / CODE_PROTECTED / REQUEST_ACCESS, stored on `socials.reachVisibility`
- Server-side redaction via `toGuestPublicPayload` / `guestReach` (no destinations in HTML, JSON, or vCard)
- Hashed 4-character codes, rate limits, revoke, expiry, redemption caps
- Anonymous request-access + owner approve/decline/revoke
- HttpOnly grant cookies; approval links at `/card/{slug}/grant?token=`
- Owner Privacy desk in the live studio
- Connect Back rate limit (5/300s per slug+IP, 30/300s per IP)

Still open: owner Connect inbox list, browser E2E for Journeys E and F, NFC write.

## Milestone 4 — Payment connectivity

Shipped as link/QR/copy (MoMo, bank, PayPal, receive QR, …). Not a custodial wallet. Integrated checkout for tips stays disabled until Paystack sandbox acceptance.

## Milestone 5 — Premium experience

Shipped: 30+ templates, ID-1 plate, official brand marks. Refine; do not replace the current design system.

## Milestone 6 — Owner operations

Partial: studio + billing + viewCount. Missing: analytics dashboard, contact inbox, admin console, entitlement flags beyond live/offline.

## Milestone 7 — Hardening

Unit tests exist for themes, access live-gate, socials, bank. Missing: API integration and browser journeys E/F (code + request access).

## P0 now

Privacy (Milestone 3) plus Connect rate limit. Everything else in P0 is already functional enough to keep.
