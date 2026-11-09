# Celeventic execution roadmap

Sequence follows repository dependencies. Do not rebuild working Guest Entry Pass, gift ledger, or invitation templates.

V2.0 extends this sequence to 12 phases. Phases 6–12 are not started. Do not declare production-ready from this file.

## Phase 0. Baseline and audit

- [x] Inspect repository modules
- [x] Record git/repo constraint (tree gitignored under Documents)
- [x] Write master audit
- [ ] Independent git repository or Cursor-hosted remote (blocked without explicit approval)

## Phase 1. Critical security and money integrity (in progress)

- [x] Ticket inventory hold of pending orders
- [x] Idempotent ticket confirm (no double mint on webhook retry)
- [x] Stop unpaid template unlock
- [x] Reject unsigned Hubtel webhooks
- [x] Hash legacy offline QR tokens
- [x] Ticket cancel, status refund, and transfer (provider refunds remain off)
- [x] Rate limit public ticket purchase and RSVP
- [x] CI workflow file (GitHub run pending a Celeventic remote)
- [ ] Move promo codes into Prisma with transactional `usedCount`
- [ ] Ticket Prisma integration tests
- [ ] Event-wallet double-entry (separate from gift ledger)

## Phase 2. Invitation and ticketing core

- [x] RSVP deadline field and enforcement
- [x] Unique latest RSVP per guest (identical submits reused; changes append history)
- [x] Guest/RSVP CSV export
- [ ] Unify or clearly gate `InvitationRenderer` vs `PagedInvitationViewer`
- [ ] WhatsApp template send for first-contact invites (do not use session text)
- [ ] Campaign retry and delivery status

## Phase 3. Offline admission

- [ ] Keep Guest Entry Pass as the only staffed gate path
- [ ] Retire or 410 `/api/qr/offline` after clients stop calling it
- [ ] Document disconnected-scanner duplicate policy in organiser UI
- [ ] Multi-device reconnect tests beyond current integration coverage

## Phase 4. Event wallet

- [ ] Derive ticket/event balances from ledger entries
- [ ] Withdrawal states, limits, and failure recovery for event wallets
- [ ] Admin reconciliation view from aggregates, not full table loads

## Phase 5. Performance

- [ ] Cap remaining unbounded `findMany`
- [ ] Cursor pagination for scan logs and wallet transactions
- [ ] Measure LCP/INP/CLS on invitation and discover before claiming targets

## Phase 6. Studio Editor

- [ ] Persist version history off sessionStorage
- [ ] Reduced-motion in studio preview
- [ ] Studio save/publish tests
- [ ] Do not replace the preview architecture unless a later audit proves it cannot publish faithfully

## Phase 7. Template marketplace

- [ ] Wire submit and moderation routes
- [ ] Paystack checkout for premium templates
- [ ] License enforcement server-side
- [ ] Creator earnings distinct from event wallet

## Phase 8. Vendor marketplace

- [ ] Persist availability calendar
- [ ] Vendor verification request create path
- [ ] Fix `availableDate` filter so it is applied before `take`

## Phase 9. Admin and UX

- [ ] Command-center aggregates
- [ ] Standard empty/error states on remaining dashboard lists
- [ ] Accessibility pass on studio and gate

## Phase 10. Production acceptance

- [ ] Staging environment
- [ ] Backup restore drill
- [ ] Rollback rehearsal
- [ ] Explicit approval before any VPS deploy

No production deploy, live payout, or destructive migration is authorized by this document.
