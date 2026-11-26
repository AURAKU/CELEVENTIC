# Invitation Experience 3.0 — Renderer Dependency Analysis

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Purpose:** Phase 1 / 3 regression map before any visual upgrades.

## Entry points

| Surface | Path | Risk if changed carelessly |
|---|---|---|
| Guest invitation renderer | `src/components/invitation/invitation-renderer.tsx` | High — all guest invites |
| Legacy v1 layout switch | `src/components/invitation/legacy-invitation-layout.tsx` | **Critical** — protected invites |
| Experience 3.0 registry | `src/lib/invitation/studio3/experience-registry.ts` | Low while empty; opt-in only |
| Experience 3.0 fallback | `src/components/invitation/experience3-fallback.tsx` | Low — v2-unregistered only |
| Cinematic layouts | `templates/cinematic-template.tsx` | High — memorial + cinematic weddings |
| Place card / entry pass / party switch | Shared chrome in renderer | High — admission UX |

## Resolution algorithm (current)

1. `resolveLayoutVersion(design)` — missing / invalid → `1`.  
2. `version ≤ 1` → **LegacyInvitationLayout** (historical switch).  
3. `version ≥ 2` + registry hit → Experience 3.0 component.  
4. `version ≥ 2` + no registry → **Experience3Fallback** (never silently render another layout).

## Shared dependencies that can alter protected invites

Do **not** restyle these for Experience 3.0 without version forks:

- `aurelia-editorial-wedding.tsx` (+ module CSS) — Aurelia **and** Seraphine  
- `cinematic-template.tsx` + cinematic CSS — memorial family + cinematic wedding SKUs  
- `place-card.tsx`, guest portal chrome, `GuestEntryPass`  
- Global invitation rules in `src/app/globals.css`  
- Soft-intro / envelope contracts under `src/lib/experience*` and `src/lib/experience-engine*`  
- Forever Afaris / Traditional Marriage / Femmora template stacks listed in `PROTECTED_TEMPLATE_SOURCE_PATHS`

## Safe change patterns

| Intent | Safe approach |
|---|---|
| New premium visual | `registerExperience3Layout(layout, ≥2, Component)` or new layout slug |
| Reuse modules (RSVP, QR) | Presentation adapters over `GuestFeatureKey` |
| Studio creative controls | Write to versioned experience config; do not mutate live `layoutVersion` |
| Fix bug on live invite | Patch with extreme care + visual regression; prefer surgical fix over redesign |

## Regression risks (ranked)

1. Editing shared Aurelia/Seraphine component  
2. Editing cinematic base used by memorial SKUs  
3. Global CSS affecting `.invitation-copy-root` / place-card  
4. Changing place-card / entry-pass copy or structure  
5. Auto-migrating `layoutVersion` on save/publish  

## Test coverage for this wiring

- `npm run test:invitation-studio3` — layout version, manifest, registry branch modes, design families  
