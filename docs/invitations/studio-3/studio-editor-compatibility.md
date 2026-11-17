# Studio Editor Compatibility Assessment

**Status:** ASSESSED — no Studio UI restructure in this phase  
**Date:** 2026-11-17

## Goal

Integrate Experience 3.0 / native `ix3-*` layouts with the **existing** Studio Editor without replacing its UI.

## What works today (no editor rewrite)

| Capability | Status | Notes |
|---|---|---|
| Design presets for `ix3-*` | Present | `INVITATION_TEMPLATE_PRESETS` entries with colors/fonts/`layoutVersion: 1` |
| Guest renderer path | Present | `InvitationRenderer` → Experience 3.0 registry for native layouts |
| Live preview (demo guest) | Present | `/invitations/experience3` + `LiveTemplatePreview` / `buildLivePreviewProps` |
| RSVP / maps / share | Present | Shared panels reused inside Experience 3.0 shell |
| Opening skip / reduced motion | Present | `Experience3OpeningGate` |
| Place card / entry pass chrome | Present | Unchanged renderer chrome when props supplied |
| Music | Compatible | Preview gallery disables music; entitlements still apply when enabled |

## What is not changed this phase

- Studio Editor chrome / IA / panels — **not restructured**  
- Marketplace pricing / ownership / payouts — **unchanged**  
- Public catalogue listing of `ix3-*` SKUs — **not added** (avoids pricing/approval side effects)  
- Auto-writing `layoutVersion` onto historical invitations — **forbidden**

## Integration path (next, when approved)

1. Allow Studio template picker / internal tooling to select `ix3-*` layouts (or unlisted catalogue SKUs).  
2. Persist `design.layout` + optional `layoutVersion` on new orders only.  
3. Map Studio controls → Experience 3.0 tokens (typography, colors, motion intensity, opening style, section visibility) via config — not by editing v1 template files.  
4. Keep preview mode using demo guest identity only.

## Risk controls

- Selecting an `ix3-*` layout never alters Forever Afaris / Seraphine / Aurelia / Traditional Marriage / Femmora / Memorial candle source files.  
- Existing invites without `layoutVersion` continue on `LegacyInvitationLayout`.  
