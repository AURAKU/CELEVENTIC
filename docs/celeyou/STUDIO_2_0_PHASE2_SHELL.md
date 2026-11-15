# CeleYou Studio 2.0 — Phase 2 Workspace Shell

**Status:** Implemented in code — **not deployed** (await explicit approval).  
**Date:** 2026-11-15  
**Depends on:** `docs/celeyou/STUDIO_2_0_PHASE1_AUDIT.md`

---

## Decisions locked for Phase 2

| Topic | Choice |
|---|---|
| Destinations | Six desks: My Card, Design, Links & Actions, Audience, Insights, Settings |
| Share | Chrome / preview aside (not a seventh destination) |
| Deep links | `?desk=card\|design\|links\|audience\|insights\|settings` |
| Rollback | `?studio=classic` restores Studio 1.0 jump + single long page |
| Onboarding bypass | `studio=1` unchanged (not classic) |
| Form / APIs | Unchanged — single `StudioForm`, same Save / autosave / PATCH paths |
| Plate renderer | Still `DigitalCardFace` + `DigitalCardReachGrid` |

---

## What shipped

1. **Destination switcher** — `DigitalCardStudioDeskNav` replaces the long jump strip (classic keeps `STUDIO_JUMP`).
2. **My Card default** — Identity + overview shortcuts; analytics/activation/CRM not mounted.
3. **Lazy desks** — Insights / Design / Links / Audience / Settings mount only when selected (or classic).
4. **Save chrome** — Persistent `aria-live` status: Published / Unsaved / Saving / Failed / Draft.
5. **Preview button** — Scrolls to `#studio-preview` without leaving the desk.
6. **Subscription** — Compact chip on editing desks; full live-term ribbon on Settings (and classic).
7. **Hash aliases** — `#studio-activity` → Insights, `#studio-look` → Design, etc.
8. **Privacy** — Settings desk in 2.0; Links points there. Classic keeps prior placement.

---

## Modified / added files

| File | Role |
|---|---|
| `src/lib/digital-business-card/studio-desk.ts` | Desk IDs, URL/hash helpers |
| `src/components/digital-business-card/digital-card-studio-desk-nav.tsx` | Destination tabs |
| `src/components/digital-business-card/digital-card-studio-client.tsx` | Shell wiring (no persistence change) |
| `src/app/globals.css` | Desk nav styles |
| `src/lib/digital-business-card/__tests__/studio-desk.test.ts` | Routing unit tests |
| `src/lib/digital-business-card/__tests__/digital-business-card.test.ts` | Studio shell assertions |
| `docs/celeyou/STUDIO_2_0_PHASE2_SHELL.md` | This summary |

---

## Test results (local)

| Suite | Result |
|---|---|
| `studio-desk.test.ts` | **PASS** |
| `digital-business-card.test.ts` (incl. activity + studio layout) | **PASS** (61 tests with desk suite) |
| Manual Safari/device matrix | **BLOCKED** (not run this phase) |
| Production deploy smoke | **N/A** — do not deploy without approval |

---

## Acceptance criteria (Phase 2 scope)

| Criterion | Result |
|---|---|
| Access card editor immediately (My Card default) | **PASS** (code) |
| Analytics/billing not blocking My Card | **PASS** (code; Insights/Settings only) |
| Every feature still reachable via a desk or classic | **PASS** (code) |
| Mobile destination nav (no giant jump-only IA) | **PASS** (code) |
| Preview without long unrelated scroll | **PASS** (code; Preview control + aside) |
| Save state always understandable | **PASS** (code) |
| Desk switch preserves unsaved form | **PASS** (same React state; unit not browser E2E) |
| Cards/QR/NFC/subscriptions unchanged | **PASS** (no API/pricing changes) |
| Connections/analytics still functional when opened | **PASS** (same components; mounts on desk) |
| Measurably easier / faster | **BLOCKED** (needs human UX review) |

---

## Known limitations (Phase 3+)

- Design categories (Templates / Layout / Background / Effects / Vault) not yet split inside Design desk.
- Links sub-tabs (Contact / Social / Pay / Booking / Guest) not yet segmented.
- Audience still expands connection rows as before (detail drawer later).
- Insights progressive disclosure (collapse Arrive/Reach/…) not fully reworked.
- Onboarding path not yet retitled to Identity → Appearance → Links → Preview → Publish.
- Desktop left rail vs top tabs can be refined after review.

---

## Deployment requirements

1. Explicit human approval.  
2. Prefer staging or `?studio=classic` rollback URL documented for support.  
3. Smoke: load studio, edit name without leaving My Card, switch Design/Links, Save, open public URL, open Insights.  
4. Do **not** run production migrate/pricing changes for this UI-only phase.

## Rollback

- Immediate: open `/dashboard/business-card?studio=classic`.  
- Code: revert the Phase 2 commit(s); no schema rollback required.
