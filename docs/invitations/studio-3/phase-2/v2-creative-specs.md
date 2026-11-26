# Phase 2 — V2 Creative Specifications

**Status:** PROPOSED (specifications only)  
**Gate:** Do **not** publish, marketplace-list, or auto-migrate any historical invitation to these experiences without Phase 3 approval.

> Note: The branch contains exploratory `ix3-*` native shells from earlier continuation work. This Phase 2 document is the **authoritative creative/engineering spec**. Formal Phase 3 activation (Studio surfacing, catalogue SKUs, production opt-in) requires approval.

---

## Shared principles (all three)

| Principle | Spec |
|---|---|
| Version identity | New layout slug **or** existing slug at `layoutVersion ≥ 2` — never edit protected v1 files |
| Opening | Skippable; keyboard accessible; `prefers-reduced-motion` → minimal/instant |
| Personalization | Guest name / RSVP / QR / seating only when authorized props exist — never invent |
| Modules | Reuse `GuestFeatureKey` + admission + maps + share — no fake UI |
| Devices | Mobile-first; tablet/desktop editorial widening; safe-area; no horizontal overflow |
| Performance | Lazy below-fold media; no autoplay audio without gesture; minimal JS |
| Isolation | v2 CSS modules / scoped tokens — no global invite CSS edits for styling |

---

## 1. Luxury Wedding — Editorial

**Proposed identity:** `ix3-editorial-wedding` (native) or future `classic-gold__v2` only if production-proven unused  
**Design family:** `editorial-wedding`  
**Tone:** Ivory / ink / restrained metallic accent  

### Visual

- Display serif headline; tracked sans eyebrows; generous leading  
- Portrait/hero with editorial crop; monogram optional  
- Section rhythm: Opening → Cover → Welcome → Story → Timeline (if data) → Dress → Venue → RSVP → Actions  

### Interaction

- Opening: **Monogram** (default) or envelope/cinematic via Studio preset  
- Skip + Escape; reduced-motion instant open  
- Personalized welcome only when `guestName` present  

### Functional modules

RSVP, maps/share actions, dress code field, QR/entry pass via shared renderer chrome when props exist.

### Out of scope for v1 of this reference

Forced gift wallet, forced seating on public page, wedding-only jokes/animation.

---

## 2. Premium Brand Launch

**Proposed identity:** `ix3-brand-launch`  
**Design family:** `brand-launch`  
**Tone:** Near-black surface, sharp sans, high-contrast type  

### Visual

- Logo/wordmark or single-letter monogram  
- Cinematic hero; product/brand media gallery when media roles exist  
- Optional countdown only if event start is configured and category allows  

### Interaction

- Opening: **Cinematic** short gate (skippable)  
- VIP welcome copy when guest personalized  
- No playful confetti  

### Functional modules

RSVP, QR admission, venue/directions, share. Speakers/agenda only when backend sections exist (do not fabricate).

### Out of scope

Copying Femmora proprietary fashion house assets; modifying `luxury-fashion-flagship` v1.

---

## 3. Contemporary Memorial

**Proposed identity:** `ix3-memorial`  
**Design family:** `memorial`  
**Tone:** Warm stone / cream; calm contrast; no celebratory motion  

### Visual

- Portrait-led tribute; restrained typography  
- Service essentials: when / where / attire  
- Optional tribute/memory modules **only** when event entitlements enable them  

### Interaction

- Opening: **Portrait** / minimal — low `motionIntensity`  
- **No** default background audio; never intrusive autoplay  
- Attendance RSVP label (not festive party copy)  

### Functional modules

Directions, attendance RSVP, optional memories when `MEMORY_VAULT` enabled. Condolence/tribute only via existing funeral platform features.

### Out of scope

Loud transitions, confetti, party countdown, modifying `memorial-candle-tribute` v1 files.

---

## Acceptance for Phase 3 (preview)

Each reference must pass the master directive’s 20 acceptance checks on **fixtures**, plus protected-invite regression on v1 paths.
