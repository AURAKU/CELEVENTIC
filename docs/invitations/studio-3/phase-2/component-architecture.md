# Phase 2 — Proposed Component Architecture

**Status:** PROPOSED / partially IMPLEMENTED on branch (foundation)

## Layering

```
InvitationRenderer
├── legacy path (layoutVersion ≤ 1, non-native)
│   └── LegacyInvitationLayout  → protected template files (immutable for Studio 3)
└── experience3 path (native layouts OR layoutVersion ≥ 2)
    ├── Experience3 registry lookup
    ├── Experience3Fallback (unregistered v2 — never silent swap)
    └── Reference / v2 templates
         └── Experience3Shell + OpeningGate + feature adapters
```

## Version isolation (IMPLEMENTED)

| Module | Role |
|---|---|
| `layout-version.ts` | `resolveLayoutVersion`, `shouldUseLegacyInvitationRenderer`, registration guards |
| `experience-registry.ts` | Opt-in component map keyed by `layout__vN` |
| `protected-manifest.ts` | PROTECTED / UNKNOWN / ELIGIBLE + in-place edit ban |
| `native-layouts.ts` | Brand-new slugs with no historical v1 |

## Reusable functional adapters (PROPOSED completion in Phase 3)

| Module | Backing | Notes |
|---|---|---|
| Guest welcome | `guestName` prop | Omit if absent |
| RSVP | `InvitationRsvpPanel` | Entitlement-aware |
| Actions / maps | `InvitationActions` | Existing maps utils |
| Dress / schedule | event fields | Hide when empty |
| QR / pass | Renderer chrome `GuestEntryPass` | Do not fork tokens |
| Seating | Post-admission only | Never leak on public invite |
| Gallery / upload | Memory vault props | Only when enabled |
| Opening | `Experience3OpeningGate` + existing experience-engine | Skippable |

## Styling isolation

- v2 / native experiences: CSS modules under `components/invitation/experience3/`  
- **Do not** restyle `.invitation-copy-root` / place-card globals for v2 looks  
- Shared Aurelia/Seraphine / cinematic / Forever Afaris / Traditional Marriage / Femmora / Memorial candle sources listed in `PROTECTED_TEMPLATE_SOURCE_PATHS`

## Studio integration (PROPOSED — Phase 3)

- Extend Studio to set `layout` + `layoutVersion` explicitly for new creations  
- Never rewrite `layoutVersion` on publish for historical rows  
- Preview uses `isPreviewInvitationId` / demo guest only  
