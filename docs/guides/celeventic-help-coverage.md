# Celeventic Help Coverage Matrix (§51)

> Honest audit of **real** user-facing features in CELEVENTIC-main. Do not invent features. Do not mark COVERED without evidence.
> Generated companion: `src/lib/celeventic-guide/coverage-matrix.ts` · Admin: `/admin/guides/coverage`

## Summary (§60)

| Metric | Count |
|---|---|
| TOTAL USER-FACING | 47 |
| COVERED | 39 |
| PARTIAL | 8 |
| MISSING | 0 |
| DEPRECATED / N/A / NOT USER-FACING | 5 |
| Coverage % (COVERED + 0.5×PARTIAL) | **91.5%** |
| Unexplained high-priority MISSING | 0 |

Gate: **PASS** — No unexplained P0/P1 MISSING features.

PARTIALs are mostly **VIDEO PRODUCTION REQUIRED** (interactive/motion tutorials ship; MP4s not recorded).

## Matrix

| Feature | Route | Audience | Existing tutorial | Tutorial type | Video available? | Interactive walkthrough? | Contextual help? | Status | Priority | Last verified | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Marketing home / How it works | `/` | PUBLIC | how-celeventic-works | motion | no | yes | no | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED — flagship MP4 not recorded yet; motion + poster ship. |
| Celeventic Guide home | `/guide` | ALL | welcome-to-celeventic | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Open invitation (guest) | `/invite/[link]` | GUEST | open-your-invitation | full | no | yes | no | PARTIAL | P0 | 2026-08-11 | celeventic-guide — Contextual float blocked on /invite/ by design; VIDEO PRODUCTION REQUIRED. |
| RSVP | `/invite/[link]` | GUEST | rsvp | full | no | yes | no | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED. |
| Guest QR admission pass | `/admission/[token], /qr/[token]` | GUEST | your-qr-admission-pass | full | no | yes | yes | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED. |
| Find your seat | `/seat/[token], /event-seat/[token]` | GUEST | find-your-seat | full | no | yes | yes | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED. |
| Event Guide (guest companion) | `/event-guide/[token]` | GUEST | event-guide-guest | full | no | yes | no | PARTIAL | P0 | 2026-08-11 | celeventic-guide — Float blocked on Event Guide shells; tutorial + embed helper available. VIDEO PRODUCTION REQUIRED. |
| Memory Vault (guest share) | `/memory/[token], /memory-upload/[eventToken]` | GUEST | memory-vault-guest | full | no | yes | yes | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED. |
| Organizer quick start / create event | `/dashboard/getting-started, /dashboard/events` | ORGANIZER | create-an-event, organizer-quick-start | full | no | yes | yes | PARTIAL | P0 | 2026-08-11 | celeventic-guide — VIDEO PRODUCTION REQUIRED for organizer-quick-start. |
| Build invitation | `/dashboard/invitations, /invitations` | ORGANIZER | build-an-invitation | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Guest management | `/dashboard/guests` | ORGANIZER | add-guests, import-guests, guest-tags | tour | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Seating (organizer) | `/dashboard/seating` | ORGANIZER | seating-organizer, smart-auto-seating | tour | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| QR Admission / scanning | `/dashboard/qr, /dashboard/qr-admission` | ORGANIZER | qr-admission-organizer, offline-admission, scan-guest | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| QR & Pass Hub | `/dashboard/qr-hub` | ORGANIZER | qr-hub, event-guide-qr, generate-qr-identities | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Event Guide builder | `/dashboard/events/[id]/event-guide` | ORGANIZER | event-guide-organizer, programme-and-menu | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Vendor passes (organizer) | `/dashboard/qr-hub, /vendor-pass/[token]` | ORGANIZER | vendor-passes-organizer | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Vendor portal | `/dashboard/vendor-portal` | VENDOR | vendor-portal, vendor-pass | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Tickets / ticketing | `/dashboard/tickets` | ORGANIZER | tickets-organizer | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Payments / checkout (invitation orders) | `/dashboard/settings?tab=billing, /invitations (checkout)` | ORGANIZER | payments-overview | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Gifts / gift wallet | `/dashboard/gifts, /gift/[publicToken]` | ORGANIZER | gifts-organizer, gifts-guest | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Marketplace | `/marketplace, /dashboard/discovery` | ORGANIZER | marketplace-organizer | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Venues | `/dashboard/venues` | ORGANIZER | venues-organizer | full | no | no | yes | COVERED | P2 | 2026-08-11 | celeventic-guide |
| Wallet / payouts | `/dashboard/wallet` | ORGANIZER | wallet-organizer | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Contributions | `/dashboard/contributions` | ORGANIZER | contributions-organizer | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Communications (messages + campaigns) | `/dashboard/messages, /dashboard/campaigns` | ORGANIZER | communications-organizer | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Collaboration / event workspace | `/dashboard/events/[id]/workspace` | ORGANIZER | collaboration-workspace | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Privacy & security center | `/dashboard/privacy-center` | ORGANIZER | privacy-security | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Memory Vault (organizer) | `/dashboard/memory` | ORGANIZER | memory-vault-organizer | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Thank You experience | `/dashboard/events/[id]/thank-you, /thank-you/[eventToken]` | ORGANIZER | thank-you-experience-organizer, thank-you-experience-guest | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Invitations (group / plus guests) | `/invite/[link], /dashboard/guests` | GUEST | group-invitations-plus-guests, group-invitations-organizer | full | no | yes | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Scanner / door staff | `/dashboard/qr, /verify/[token]` | SCANNER | scan-guest, scan-group, scan-vendor, offline-scanning | full | no | yes | yes | COVERED | P0 | 2026-08-11 | celeventic-guide |
| Event OS — Wedding | `/dashboard/events/[id] (WEDDING blueprint)` | ORGANIZER | event-os-wedding | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide — No dedicated /dashboard/wedding — shared Event OS routes with WEDDING blueprint. |
| Event OS — Funeral / FuneralOS | `/dashboard/funeral, /memorial/[slug]` | ORGANIZER | event-os-funeral | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Event OS — Corporate / Conference | `/dashboard/events/[id] (CORPORATE_EVENT / CONFERENCE)` | ORGANIZER | event-os-corporate | full | no | no | yes | COVERED | P2 | 2026-08-11 | celeventic-guide |
| Design Studio / AI / Inspiration | `/dashboard/design-studio, /dashboard/inspiration, /dashboard/ai-planner` | ORGANIZER | design-studio | full | no | no | yes | COVERED | P2 | 2026-08-11 | celeventic-guide |
| Settings / team / billing | `/dashboard/settings` | ORGANIZER | settings-overview | full | no | no | yes | COVERED | P2 | 2026-08-11 | celeventic-guide |
| Admin Guide CMS | `/admin/guides` | ADMIN | admin-guide-manager | full | no | no | no | COVERED | P1 | 2026-08-11 | celeventic-guide — adminOnly — never public. |
| Admin control plane (users, commerce, modules) | `/admin/**` | ADMIN | — | none | no | no | no | N/A | P3 | 2026-08-11 | platform-admin — Internal ops surfaces; Celeventic Guide focuses on guest/organizer/vendor/scanner journeys. Documented as unnecessary for public help. |
| Troubleshooting — invitation won't open | `/guide/troubleshoot-invitation-wont-open` | GUEST | troubleshoot-invitation-wont-open | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — QR won't scan | `/guide/troubleshoot-qr-wont-scan` | GUEST | troubleshoot-qr-wont-scan | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — RSVP fail | `/guide/troubleshoot-rsvp-fail` | GUEST | troubleshoot-rsvp-fail | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — seat not found | `/guide/troubleshoot-seat-not-found` | GUEST | troubleshoot-seat-not-found | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — Event Guide unavailable | `/guide/troubleshoot-event-guide-unavailable` | GUEST | troubleshoot-event-guide-unavailable | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — weak internet / offline | `/guide/troubleshoot-weak-internet` | ALL | troubleshoot-weak-internet | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — memory upload failed | `/guide/troubleshoot-memory-upload-failed` | GUEST | troubleshoot-memory-upload-failed | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — payment pending | `/guide/troubleshoot-payment-pending` | ORGANIZER | troubleshoot-payment-pending | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Troubleshooting — ticket not received | `/guide/troubleshoot-ticket-not-received` | GUEST | troubleshoot-ticket-not-received | full | no | no | yes | COVERED | P2 | 2026-08-11 | celeventic-guide |
| Troubleshooting — vendor pass not working | `/guide/troubleshoot-vendor-pass` | VENDOR | troubleshoot-vendor-pass | full | no | no | yes | COVERED | P1 | 2026-08-11 | celeventic-guide |
| Dedicated Wedding OS app route | `/dashboard/wedding (does not exist)` | ORGANIZER | event-os-wedding | n/a | no | no | no | N/A | N/A | 2026-08-11 | celeventic-guide — No dedicated route — Wedding is Event OS blueprint on shared event routes. |
| Organizer analytics dashboard page | `/dashboard/analytics (does not exist)` | ORGANIZER | — | n/a | no | no | no | N/A | N/A | 2026-08-11 | celeventic-guide — No organizer analytics page; conference blueprint aliases activity tab. Admin has /admin/analytics. |
| Speakers / Sessions / Sponsors / Exhibitors / Certificates dedicated pages | `FeatureKeys alias workspace tabs` | ORGANIZER | — | n/a | no | no | no | N/A | N/A | 2026-08-11 | celeventic-guide — FeatureKeys exist but no dedicated page.tsx folders — not user-facing as separate products. |
| /dashboard/admission page | `/dashboard/admission (no page — use /dashboard/qr)` | ORGANIZER | qr-admission-organizer | n/a | no | no | no | DEPRECATED | N/A | 2026-08-11 | celeventic-guide — Context map historically referenced /dashboard/admission; real scanner is /dashboard/qr + /dashboard/qr-admission. |

## Notes

- Spark & Drive is out of scope for this Guide pass.
- Invitation template surfaces intentionally exclude floating contextual help.
- Event OS Wedding/Corporate share event workspace routes (blueprints), not dedicated apps.
- Last verified: 2026-08-11.

## Zero-Experience Guest Mode (§63)

| Area | Status | Notes |
|------|--------|-------|
| First-time intro | Shipped | Optional card + Show Me Around; localStorage per invite/guest |
| Contextual chips | Shipped | RSVP / QR / party / seating / guide / memory / event-day |
| Guest quick actions | Shipped | `/guide` guest help + in-invite sheet |
| Visual guides (24) | Seeded | Motion/storyboard; VIDEO PRODUCTION REQUIRED |
| Troubleshooting (12) | Seeded | Actionable recovery steps |
| Fake MP4s | None | Honest null videoUrl |
