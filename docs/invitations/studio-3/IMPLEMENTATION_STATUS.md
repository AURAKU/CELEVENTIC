# CELEVENTIC — Invitation Experience 3.0

## Implementation Status

**Last updated:** 2026-11-17  
**Initiative:** Invitation Experience 3.0 (Bespoke Design · Cinematic Motion · Intelligent Interactions)  
**Branch:** `feat/invitation-studio-3`  
**Deploy:** Not authorized — do not deploy / do not merge to `main` without explicit approval.

## Stage progress

| Phase | Status |
|---|---|
| 1 — Inventory & protection | **Complete** |
| 2 — Creative & competitive research | **Complete (docs)** |
| 3 — Experience engine | **Complete (foundation)** — version branch, registry, definitions, modules shell |
| 4 — Design systems / reference experiences | **In progress** — 3 native reference layouts registered (new slugs) |
| 5 — Template transformation (catalogue ELIGIBLE) | Blocked — catalogue ELIGIBLE still **0** pending production proof |
| 6 — Functional integration | Partial — RSVP / actions / maps / QR chrome reused on references |
| 7 — QA | Unit **21/21**; visual/device QA pending |
| 8 — Release readiness | Not started |

## Latest stage report

### 1. Work completed

- Protection + renderer version isolation (prior).
- **Three Experience 3.0 native reference layouts** (never historically used):
  - `ix3-editorial-wedding`
  - `ix3-brand-launch`
  - `ix3-memorial`
- Shared Experience 3.0 shell + skippable opening gate (reduced-motion aware).
- Reused `InvitationRsvpPanel` + `InvitationActions` (no fabricated backend features).
- Native layouts classified **ELIGIBLE**; all existing catalogue layouts remain PROTECTED/UNKNOWN.
- **Did not** modify Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, or Memorial candle sources.
- **Did not** change marketplace pricing / catalogue SKUs.
- **Did not** query/write production; **did not** deploy.

### 2. Files changed (this continuation)

- `src/types/invitation-design.ts` (3 new layout slug unions)
- `src/lib/invitation/layout-version.ts` (native layout routing)
- `src/lib/invitation/studio3/native-layouts.ts`
- `src/lib/invitation/studio3/experience-definition.ts`
- `src/lib/invitation/studio3/reference-definitions.ts`
- `src/lib/invitation/studio3/experience-registry.ts` / `protected-manifest.ts` / `index.ts`
- `src/components/invitation/experience3/**` (shell, opening, 3 templates, register)
- `src/components/invitation/invitation-renderer.tsx` (import registrations)
- Tests + `docs/invitations/studio-3/reference-experiences.md`

### 3. Templates upgraded

| Layout | Kind | Status |
|---|---|---|
| `ix3-editorial-wedding` | New slug reference | Registered |
| `ix3-brand-launch` | New slug reference | Registered |
| `ix3-memorial` | New slug reference | Registered |
| Existing catalogue layouts | — | **Unchanged** |

### 4. Protection summary

| Metric | Count |
|---|---|
| Catalogue SKUs | 48 |
| Catalogue ELIGIBLE | **0** |
| Native Experience 3.0 ELIGIBLE layouts | **3** |
| PROTECTED catalogue SKUs | 16 |
| UNKNOWN catalogue SKUs | 32 |

### 5–8. Tests

`npm run test:invitation-studio3` → **21/21 pass**

### 9. Remaining risks

1. Production usage still unverified for catalogue UNKNOWN layouts.  
2. References not yet in marketplace / Studio picker.  
3. Visual QA across 320–1920px not yet executed.  
4. Shared place-card / globals.css still sensitive for any future edits.

### 10. Git

- Branch: `feat/invitation-studio-3`
- Commit: pending this stage

### 11. Recommended next stage

1. Local preview of the three `ix3-*` layouts (fixture invites) + mobile/desktop polish.  
2. Authorized read-only production SQL → catalogue ELIGIBLE.  
3. Studio / marketplace surfacing **without** pricing changes (approval).  
4. No production deploy without explicit approval.

## Explicit non-actions

- No production data writes / no deploy / no merge to `main`  
- No edits to protected template sources  
- No silent migration of historical invitations  
