# CELEVENTIC — Invitation Experience 3.0

## Interim Report (not release-ready)

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Production deployment:** **NOT AUTHORIZED / NOT READY**

---

### A. Inventory

| Metric | Count |
|---|---|
| Catalogue SKUs | 48 |
| Unique catalogue layouts | 24 |
| PROTECTED catalogue SKUs | 16 |
| UNKNOWN catalogue SKUs | 32 |
| Catalogue ELIGIBLE | **0** |
| Native Experience 3.0 layouts (ELIGIBLE) | **3** |
| Templates upgraded in place | **0** |
| New reference layouts registered | **3** |

Native layouts: `ix3-editorial-wedding`, `ix3-brand-launch`, `ix3-memorial`.

---

### B. Design

| Family | Layout | Opening | Motion |
|---|---|---|---|
| editorial-wedding | `ix3-editorial-wedding` | Monogram (skippable) | Medium |
| brand-launch | `ix3-brand-launch` | Cinematic (skippable) | Higher |
| memorial | `ix3-memorial` | Portrait (skippable) | Low / solemn |

Safe preview gallery (demo data only, `noindex`): `/invitations/experience3`

---

### C. Functionality

**Reused:** GuestFeatureKey stack via shared RSVP panel, invitation actions (maps/share), place card / entry pass chrome, demo preview pipeline.

**New:** Experience definitions, native registry path, opening gate, shell, preview routes, design presets.

**Not fabricated:** Seating, memory uploads, announcements — only appear when platform props/entitlements provide them (shared renderer chrome).

---

### D. Engineering

- Version isolation: legacy v1 switch extracted; Experience 3.0 registry for native / v2+
- Compatibility: historical invites without `layoutVersion` remain on legacy path
- Database changes: **none**
- Marketplace pricing / payouts: **unchanged**

---

### E. Testing

| Suite | Result |
|---|---|
| `npm run test:invitation-studio3` (+ ix3 presets) | Run this stage |
| Visual regression snapshots | **Blocked** (not captured yet) |
| Production usage SQL | **Blocked** (authorization) |
| Device QA 320–1920 | **Partial** (responsive CSS + preview gallery; manual pass pending) |

---

### F. Release

| Item | Status |
|---|---|
| Outstanding risks | Catalogue UNKNOWN unverified; shared CSS/place-card still sensitive; visual baselines missing |
| Rollback | Remove `ix3-*` registrations / routes; legacy path unchanged |
| Deployment readiness | **No** |

---

### Acceptance criteria (reference layouts)

| # | Criterion | Status |
|---|---|---|
| 1 | Eligible for modification | Pass (native new slugs) |
| 2 | Protected templates unchanged | Pass |
| 3–6 | Design / responsive | Partial — polish + preview gallery |
| 7–8 | Opening / skip / reduced motion | Pass (gate supports skip + reduced motion) |
| 9–11 | Media / audio / details | Partial — demo media; audio off in gallery |
| 12–15 | RSVP / QR / seating / privacy | Pass for RSVP/actions reuse; QR/seating via existing chrome when props present |
| 16–20 | Share / uploads / customization / preview / unaffected live | Partial — share via actions; Studio customization & marketplace listing deferred |
