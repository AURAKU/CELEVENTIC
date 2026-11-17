# Phase 3 Implementation Plan (PROPOSED — awaiting approval)

**Do not start Phase 3 until this Phase 2 report is approved.**

## Goal

Build and harden the three premium reference experiences on **new versioned identities**, then connect Studio preview — without touching protected v1 layouts or deploying.

## Prerequisites (must be green)

1. Phase 2 report approved  
2. Production usage audit authorized **or** explicit decision to proceed only with native new slugs (no catalogue ELIGIBLE claims)  
3. Visual baseline plan for protected flagships agreed  

## Work packages

### P3.1 — Harden Experience 3.0 shell

- Category packs (wedding / launch / memorial section allow-lists)  
- Opening presets wired to Studio without changing legacy soft-intro contracts  
- Reduced-motion + skip QA matrix  

### P3.2 — Reference completion

- Flesh editorial wedding timeline when schedule data exists  
- Brand launch countdown (optional, data-gated)  
- Memorial tribute hooks only when funeral features enabled  
- Mobile 320 / tablet / desktop 1920 pass  

### P3.3 — Functional integration verification

- Fixture invites: RSVP submit, maps, share, entry pass props, place card props  
- Privacy: no cross-guest leakage tests  
- Confirm protected live URLs still hit legacy renderer  

### P3.4 — Studio / marketplace (optional, separately authorized)

- Unlisted catalogue SKUs (`listed: false`) **or** Studio-only picker  
- **No** pricing / payout / ownership changes without explicit product approval  

### P3.5 — QA gate

- Unit + integration  
- Manual visual pass  
- Screenshot baselines for protected v1 + new references  
- Accessibility spot-check (keyboard opening, contrast, labels)  

### P3.6 — Release readiness package

- Rollback plan  
- Explicit deploy approval request (still not self-authorized)

## Explicit non-goals for Phase 3

- In-place redesign of PROTECTED / UNKNOWN catalogue layouts  
- Auto-migration of historical `designConfig`  
- Production deploy  
- Merge to `main` without approval  
