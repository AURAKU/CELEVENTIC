# Architectural Decision — Premium Design Families (not 48 one-off redesigns)

**Status:** PROPOSED / ADOPTED for Phase 3 planning  
**Phase:** 2  
**Decision date:** 2026-11-17

## Context

The catalogue has **48 SKUs** over **24 layouts**. Multiple SKUs already share one layout (e.g. five birthday SKUs → `neon-celebration-party`; eleven funeral SKUs → `memorial-candle-tribute`). Treating each SKU as an independent redesign would multiply cost and risk, and would still collide with shared renderers.

## Decision

Do **not** plan 48 separate redesign projects.

Introduce **premium design families** with:

1. **Shared functional infrastructure** — RSVP, QR/admission, gallery, maps, share, openings (via Experience Engine + `GuestFeatureKey`).  
2. **Independently art-directed visual variants** — distinct typography, color, composition, motion tone per variant.  
3. **Immutable versioning** — existing invites stay on layout v1; new work ships as `layoutVersion ≥ 2` or brand-new layout slugs.  
4. **SKU → family → variant mapping** — catalogue SKUs select a variant config; they do not fork business logic.

### Example

Five birthday SKUs can share RSVP / QR / gallery / animation modules while presenting **five genuinely different visual identities** (tokens, hero treatment, opening preset, section copy tone).

## Consequences

| Benefit | Constraint |
|---|---|
| Reusable engineering | Variants must not edit shared v1 CSS/components in place |
| Bespoke feel per SKU | Requires real art direction per variant — not hue shifts only |
| Safer rollout | Production audit still required before upgrading UNKNOWN catalogue layouts |
| Faster expansion after 3 references | Wedding / launch / memorial families first |

## Non-goals

- One generic skin recolored 48 times  
- In-place mutation of the 24 current layout files  
- Silent migration of historical invitations onto family variants  

## Phase 3 implication

Build three **family reference experiences** first (editorial wedding, brand launch, memorial). After verification, expand variants under those families — still never by editing protected v1 layouts in place.
