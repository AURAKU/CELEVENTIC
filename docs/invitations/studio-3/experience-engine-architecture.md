# CELEVENTIC — Invitation Experience 3.0

## Experience Engine Architecture

**Bespoke Design · Cinematic Motion · Intelligent Interactions**  
**Branch:** `feat/invitation-studio-3` · **Production deploy:** not authorized

---

## 1. Goal

Provide one reusable invitation experience engine so advanced capabilities are not rebuilt per template, while **every protected / historical invitation continues on its existing renderer and assets**.

New work ships only as:

- `layoutVersion ≥ 2` for an existing layout slug, **or**
- a **brand-new** layout slug never referenced by historical events.

In-place edits of v1 layout sources are **forbidden** (`mayModifyLayoutInPlace` → always `false`).

---

## 2. What already exists (reuse)

| Layer | Location | Role |
|---|---|---|
| Guest feature registry | `src/lib/invitation-features/registry.ts` | RSVP, QR, seating, maps, audio, memories… |
| Experience Engine | `src/lib/experience-engine/*` | Sequences, reveals, motion languages, audio director, preview mode |
| Experience DNA | `src/lib/experience/*` | Openings, envelopes, memorial / fashion / Aurelia profiles |
| Layout version pin | `src/lib/invitation/layout-version.ts` | v1 default; Studio 3 registry keys |
| Protection manifest | `src/lib/invitation/studio3/protected-manifest.ts` | PROTECTED / UNKNOWN / ELIGIBLE classification |
| Guest renderer | `src/components/invitation/invitation-renderer.tsx` | Layout switch (legacy path) |

Experience 3.0 **extends** these systems. It does not replace entitlement, admission, or guest identity contracts.

---

## 3. Target composition model

```
┌─────────────────────────────────────────────────────────────┐
│ InvitationExperienceDefinition (versioned, per layout vN)   │
│  identity · category · designFamily · sections · motion     │
│  opening · tokens · supported GuestFeatureKeys              │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Event + Invite│  │ Guest context   │  │ Device / a11y    │
│ designConfig  │  │ identity, RSVP, │  │ reduced-motion,  │
│ entitlements  │  │ QR, seating…    │  │ viewport, preview│
└───────┬───────┘  └────────┬────────┘  └────────┬─────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            ▼
              Experience 3.0 Renderer (v2+)
         config + data + permissions + capabilities
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      Opening module   Section modules   Portal / QR
      (skippable)      (feature-gated)   (existing APIs)
```

Public template configuration must **never** embed another guest’s private fields.

---

## 4. Experience configuration (proposed shape)

Stored alongside / inside `InvitationDesignConfig` for **new** creations only (existing rows omit → v1):

```ts
type Experience3Definition = {
  layout: string;
  layoutVersion: number; // ≥ 2
  designFamily:
    | "editorial-wedding"
    | "heritage-ceremony"
    | "brand-launch"
    | "memorial"
    | "celebration"
    | "academic"
    | "shower"
    | "conference"
    | "custom";
  opening: {
    style:
      | "classic-reveal"
      | "envelope"
      | "cinematic"
      | "monogram"
      | "portrait"
      | "minimal-instant";
    skippable: true; // required
    respectReducedMotion: true;
  };
  motionLanguage: string; // maps to experience-engine profiles
  sections: Array<{
    id: string;
    module:
      | "hero"
      | "story"
      | "schedule"
      | "venues"
      | "dress-code"
      | "rsvp"
      | "gallery"
      | "qr"
      | "seating"
      | "tribute"
      | "speakers"
      | "thank-you";
    featureKey?: string; // GuestFeatureKey when gated
  }>;
  tokens: {
    typography: Record<string, string>;
    colors: Record<string, string>;
    spacing: Record<string, string>;
  };
};
```

Implementation note: start by composing existing `buildInvitationExperienceConfig` + creative registry rather than introducing a parallel JSON dialect overnight. The definition above is the **contract target**.

---

## 5. Version isolation (enforcement)

| Concern | Rule |
|---|---|
| Default pin | Missing `layoutVersion` ⇒ `1` |
| Legacy renderer | `shouldUseLegacyInvitationRenderer` ⇒ true for v1 |
| Studio 3 registration | `canRegisterStudio3Version` rejects version &lt; 2 |
| In-place file edits | `mayModifyLayoutInPlace` always false |
| Shared components | Aurelia/Seraphine, cinematic base, place-card, globals.css — treat as **shared dependency risk**; fork or version before visual change |
| Protected sources | Listed in `PROTECTED_TEMPLATE_SOURCE_PATHS` |

Renderer wiring (next code step, still pending):

1. Resolve `layoutVersion`.  
2. If `≤ 1` → **existing** `invitation-renderer` switch (bit-identical).  
3. If `≥ 2` → Experience 3.0 registry keyed by `studio3LayoutKey(layout, version)`.  
4. Missing v2 registration → safe fallback UI (never silently render another layout).

---

## 6. Design families → first three reference experiences

After production eligibility (or brand-new slugs), build these **v2** references first:

| Reference | Design family | Motion / opening | Functional emphasis |
|---|---|---|---|
| Luxury Wedding | `editorial-wedding` | Cinematic / monogram / envelope; skippable | Personalized journey, RSVP, QR, schedule, dress code |
| Premium Brand Launch | `brand-launch` | Logo / product reveal; restrained scroll story | VIP RSVP, QR, venue, media gallery |
| Contemporary Memorial | `memorial` | Minimal / portrait; **no playful motion** | Tribute, service schedule, directions, optional memories |

Study Forever Afaris, Traditional Marriage, Femmora, and Memorial **as creative references only** — do not modify their published data or v1 files.

---

## 7. Module adapters (functional reuse)

Each section module is a thin presentation adapter over existing services:

| Module | Backing |
|---|---|
| RSVP | Feature resolver + RSVP APIs |
| QR / pass | Admission / guest pass |
| Seating | Post-admission seating reveal |
| Maps | maps-utils + directions feature |
| Gallery / uploads | Memory vault + upload pipeline |
| Audio | Audio director + layout music identity |
| Opening | Reveal contracts + soft-intro (preview-safe) |

Adapters must honor entitlements and party isolation. Empty modules stay **unmounted**.

---

## 8. Category intelligence

Do not force wedding structure onto funerals or corporate launches.

| Category pack | Default sections (when enabled) |
|---|---|
| Wedding / traditional | Hero, story, ceremonies, dress, RSVP, QR, gallery |
| Brand / corporate | Logo hero, agenda, speakers (if any), RSVP, QR, venue |
| Memorial | Portrait tribute, service, venues, directions, optional memories |
| Birthday / celebration | Hero, details, RSVP, gallery, share |
| Conference | Agenda, speakers, registration/RSVP, QR |

Packs are configuration, not separate codebases.

---

## 9. Performance & accessibility gates

- Lazy-load below-fold media; responsive images.  
- Preload only opening-critical assets.  
- `prefers-reduced-motion` collapses openings to `minimal-instant`.  
- Keyboard skip + focus management on interactive reveals.  
- Audio only after user gesture.  
- No full guest lists on public invite pages.

---

## 10. Implementation order (engine-first)

1. ~~Inventory + protection~~ (docs + `protected-manifest` + layout-version).  
2. ~~Feature parity matrix~~.  
3. ~~Wire renderer branch on `layoutVersion` with **zero v1 drift**~~ (`LegacyInvitationLayout` + branch).  
4. ~~Empty v2 registry + safe fallback~~.  
5. Ship three reference experiences on ELIGIBLE or **new** slugs.  
6. Extend Studio controls for experience config.  
7. Upgrade remaining ELIGIBLE templates systematically.  
8. QA + release report — **no deploy without approval**.

---

## 11. Explicit non-goals

- Modifying any PROTECTED or UNKNOWN layout in place.  
- Silent visual migration of historical invitations.  
- Copying competitor proprietary assets.  
- Changing marketplace pricing / payouts without authorization.  
- Production deploy from this branch without explicit approval.
