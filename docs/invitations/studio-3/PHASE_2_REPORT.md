# CELEVENTIC — Invitation Experience 3.0

## PHASE 2 REPORT — Version Isolation, Production Audit & Creative Research

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Latest commits (this initiative):** see git log; protection landmark `84e26fcc`; Phase 2 docs packaged in the commit that lands this report.  
**Production deployment:** NOT AUTHORIZED  
**Merge to main:** NOT AUTHORIZED  
**Phase 3:** NOT STARTED (awaiting approval)

---

## Executive status

| Workstream | Status |
|---|---|
| A — Immutable layout versioning | **IMPLEMENTED** (+ unit isolation tests). Visual regression **NOT VERIFIED** (not run). |
| B — Production template usage audit | **BLOCKED** — SQL + authorization pack ready; production not queried this session. |
| C — Competitive research | **VERIFIED** (public pages) / Greenvelope **PARTIAL** (403). |
| D — V2 creative architecture | **PROPOSED** specs + component architecture. Formal activation gated. |

**Catalogue eligibility:** ELIGIBLE remains **0** (no production evidence this pass). UNKNOWN stays protected.

---

## 1. Immutable layout versioning — IMPLEMENTED

### Behavior

| Rule | Implementation |
|---|---|
| Default pin | Missing / invalid `designConfig.layoutVersion` → **1** |
| Legacy path | `shouldUseLegacyInvitationRenderer` → `LegacyInvitationLayout` |
| Opt-in new visuals | `layoutVersion ≥ 2` via Experience 3.0 registry **or** brand-new native slugs |
| No silent upgrade | Registering `layout__v2` does **not** change omitted/v1 invites |
| In-place ban | `mayModifyLayoutInPlace()` always `false` |

### Compatibility preserved (by design)

Appearance path for historical rows, RSVP/QR/seating/media/audio via existing modules and renderer chrome, public URLs unchanged, no auto-migration of historical JSON, no required DB column (additive optional JSON field only).

### Tests run this stage

`npm run test:invitation-studio3` including `phase2-isolation.test.ts`:

- Version resolution  
- Legacy compatibility (including Aurelia/Seraphine shared path)  
- Registry isolation (v2 registration does not flip v1)  
- Protected-template path inventory  
- Catalogue ELIGIBLE remains 0  

### Visual regression

**BLOCKED / NOT RUN.** Unit tests are **not** claimed as zero visual drift proof. Screenshot baselines for protected flagships remain outstanding.

---

## 2. Production usage audit — BLOCKED (prepared)

| Deliverable | Path | Status |
|---|---|---|
| Read-only SQL | `phase-2/production-usage-audit.sql` | PREPARED |
| Authorization requirements | `phase-2/production-audit-authorization.md` | PREPARED |
| Execution | — | **BLOCKED** — no authorized production session in this workspace |
| Eligibility update | Manifest | **Unchanged** — ELIGIBLE still 0 |

Schema sources used for SQL: `invitations`, `invitation_orders`, `invitation_catalog_templates`, `guest_passes`, `guests`, `events`, `event_templates`, `invitation_analytics_events` (Prisma `@@map` names).

---

## 3. Competitive research — VERIFIED (public)

Document: `docs/invitations/studio-3/competitive-benchmark.md`  
Research date: **2026-11-17**  
Sources: Paperless Post, Partiful, Evite, Joy (HTTP 200); Greenvelope HTTP 403.

Original Celeventic opportunities documented; **no** proprietary assets copied.

---

## 4. V2 creative architecture — PROPOSED

| Deliverable | Path |
|---|---|
| Three reference creative specs | `phase-2/v2-creative-specs.md` |
| Component architecture | `phase-2/component-architecture.md` |
| Phase 3 plan | `phase-2/phase-3-implementation-plan.md` |

### Clarification on exploratory code already on branch

Earlier continuation work added native `ix3-*` shells, registry wiring, and a **noindex** demo gallery at `/invitations/experience3`.

For this Phase 2 gate:

- Those items are **not** marketplace-published and **not** production-deployed.  
- Formal Phase 3 activation (Studio listing, catalogue SKUs, production opt-in) requires **approval**.  
- Protected v1 layouts were **not** modified in place.

---

## 5. Inventory snapshot (unchanged classification)

| Metric | Count | Evidence basis |
|---|---|---|
| Catalog SKUs | 48 | Repo catalogue |
| Unique layouts | 24 | Repo catalogue |
| PROTECTED SKUs | 16 | Code/ops evidence |
| UNKNOWN SKUs | 32 | No production proof |
| Catalogue ELIGIBLE | **0** | Production audit not run |
| Native exploratory layouts | 3 | New slugs only |

---

## 6. Required deliverables checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | Immutable layout versioning implementation | **IMPLEMENTED** |
| 2 | Version isolation tests | **IMPLEMENTED** (unit) |
| 3 | Protected v1 regression results | **PARTIAL** — unit isolation pass; **visual regression NOT RUN** |
| 4 | Production usage audit SQL | **IMPLEMENTED** (script) |
| 5 | Production audit authorization requirements | **IMPLEMENTED** (doc) |
| 6 | Updated eligibility classification | **NOT UPDATED** (no verified production evidence) |
| 7 | Competitive benchmark document | **VERIFIED** (public) |
| 8 | Three v2 creative specifications | **PROPOSED** |
| 9 | Proposed component architecture | **PROPOSED** / foundation IMPLEMENTED |
| 10 | Phase 3 implementation plan | **PROPOSED** |

---

## 7. Final restrictions compliance

| Restriction | Compliance |
|---|---|
| Do not merge to main | Observed |
| Do not deploy | Observed |
| Do not modify protected layouts | Observed |
| Do not change live invitation behavior for v1 pins | Observed (by version resolution design) |
| Do not begin Phase 3 automatically | **Stopped here for approval** |

---

## Approval ask

Please review this Phase 2 report and authorize one of:

1. **Authorize production read-only audit** (run SQL pack) → then reclassify eligibility.  
2. **Approve Phase 3** against native new-slug references only (still no catalogue in-place upgrades; still no deploy).  
3. **Request changes** before any further implementation.
