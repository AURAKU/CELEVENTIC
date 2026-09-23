# Femmora Flagship Soft Opening — Invitation Experience Blueprint

**Status:** Specification only. No production code was touched to produce this document.
**Audience:** Cursor (implementation), Celeventic product/design review.
**Author's role for this document:** creative direction, guest-journey design, and an engineering audit of where this plugs into the existing Celeventic invitation pipeline — not implementation.

This blueprint is grounded in the invitation pipeline as it exists in the repo today (`PremiumInviteWrapper`, `TapToBeginExperience`, the `src/components/invitation-os/reveal/` library, `InteractiveReveal`, `InvitationDesignConfig`, the Studio 2.0 token/blueprint/paged-viewer system). Every "new component" recommendation below was checked against what already exists first. Where something doesn't exist yet, that's called out explicitly as a gap, not silently built around.

---

## 1. Creative Concept

Femmora is not a party invitation — it's a flagship-store unveiling. The experience should feel like being handed an engraved invitation to a runway preview, not a WhatsApp flyer. The material language is restraint: ivory, champagne, brushed gold, mocha, espresso; silk, embossing, foil, glass. Motion is slow and deliberate — nothing bounces, nothing sparkles cheaply. The guest earns the reveal through two unhurried gestures (enter, then open), not a swipe-fest of dashboard cards.

The single differentiator from every other Celeventic template: **the opening ceremony *is* the campaign film.** Everything before the store film (Scenes 0–4) exists to build four to six seconds of anticipation. Everything after it (Scenes 6–13) is a fast, editorial, single-purpose set of facts and one conversion action (RSVP) — it should not try to be a second flagship moment.

---

## 2. Guest Journey (at a glance)

```
Scene 0  Celeventic soft intro           — unchanged platform intro
Scene 1  The Whisper                     — dormant/atmosphere state (no gesture)
Scene 2  Tap to Unveil                   — GESTURE 1 (unlocks audio)
Scene 3  The Fabric Reveal               — auto-plays after Gesture 1
Scene 4  The Doors                       — GESTURE 2 (opens the portal)
──────────────────────────────────────── ceremony ends, portal (paged viewer) begins
Scene 5  Store Film                      — page 1
Scene 6  The Invitation Reveal           — page 2 (brand + facts + Maps CTA)
Scene 7  Interactive Boutique nav        — persistent chrome, not a page
Scene 8  Collection Teaser               — page 3 (lookbook)
Scene 9  The Countdown                   — page 4
Scene 10 Location                        — page 5 (reuse Venue & Map)
Scene 11 RSVP                            — page 6 (reuse RSVP)
Scene 12 Share                           — folded into Scene 13's action bar
Scene 13 Finale                          — page 7 (reuse Closing + viral footer)
```

Two gestures total, ceremony to portal. This matches the pipeline's existing standard for live guests: `TapToBeginExperience` is always gesture 1 (it's what unlocks audio per browser autoplay policy), and `envelopeAutoOpen` is hard-coded false for live guests — meaning every current template already makes the guest tap a second time to open the reveal itself. Femmora doesn't need a novel two-gesture model; it needs to skin the existing one.

---

## 3. Scene-by-Scene Storyboard

**Scene 0 — Celeventic soft intro.** `CeleventicSoftIntro`, unmodified. No Femmora branding appears yet.

**Scene 1 — The Whisper.** Not a separate phase. Realized as the *dormant state* of the `tap-to-begin` phase, before the guest has done anything: fabric-textured backdrop (CSS, not a photo — see §9), the Femmora monogram, and the line "Something beautiful is about to open." sitting quietly. No countdown, no facts, no CTA emphasis yet — the CTA fades/lifts in ~600ms after mount so the monogram gets a beat alone first.

**Scene 2 — Tap to Unveil.** The CTA on that same screen. Custom full label ("ENTER THE UNVEILING" or "DISCOVER FEMMORA"), not the platform's default "Tap to Begin/Enter" verb. Tapping fires `onBegin()` exactly as today — unlocks audio, advances the phase machine to `reveal`.

**Scene 3 — The Fabric Reveal.** New reveal ceremony component. Mounts in a closed/dormant state (silk field, fold lines, dim champagne light) — this is the reveal-phase equivalent of a sealed envelope sitting closed, waiting for the open tap. No auto-play; the guest must tap.

**Scene 4 — The Doors.** Not a third gesture. On the Scene 3 tap: silk parts (layered clip-path/mask reveal), light leaks through, monogram emerges, fabric pulls back — and *as a continued, uninterrupted choreography of the same tap* — two door/panel shapes glide apart with depth and a soft reflection highlight, ending on `onComplete()`. Treating Scenes 3+4 as one component with one internal timeline (rather than requiring a second explicit tap) keeps the total gesture count at two, matches the "slow, expensive, restrained" motion brief, and needs zero changes to `PremiumInviteWrapper`'s phase machine or `InteractiveReveal`'s prop contract — reveal components are opaque to the orchestrator; they can sequence as many internal beats as they want before calling `onComplete()`.

> **Open decision:** if design specifically wants Scene 4 to require its own explicit "OPEN" tap (three gestures total, matching the brief's literal text), that's still fully self-contained inside the same new component — it doesn't touch shared files either way. Flag your preference; default recommendation is **two gestures**.

**Scene 5 — Store Film.** First page of the paginated portal (not part of the ceremony). Full guidance in §9.

**Scene 6 — The Invitation Reveal.** Second page. Brand name, "SOFT OPENING," location, date, time, Maps CTA. Editorial type, no ornament frame.

**Scene 7 — Interactive Boutique nav.** Not a page — the persistent chrome that lets the guest move between pages 3–7 (garment-tag rail). See §5.

**Scene 8 — Collection Teaser.** Lookbook page, swipeable, lazy-loaded.

**Scene 9 — The Countdown.** Dedicated full page. Counts to the soft-opening start (29 Aug 9am); flips to "THE DOORS ARE OPEN" once passed — this is the existing `useCountdown` hook's `begun` state, unchanged.

**Scene 10 — Location.** Reuse the existing Venue & Map page verbatim, plus two small additions (copy location, native share of the location) — see §12.

**Scene 11 — RSVP.** Reuse the existing RSVP page/panel/API verbatim, with custom copy and an optional preferred-day chip — see §11.

**Scene 12 — Share.** Folded into the action bar on the closing page (Web Share API / WhatsApp / copy link) — this is the existing `PersistentActionBar` share handler, reused as-is.

**Scene 13 — Finale.** Reuse the existing Closing page + viral footer, with the footer made optional/relabelable for paid single-brand SKUs — see §18.

---

## 4. Motion System

All motion runs through the Studio 2.0 motion-profile provider (`src/lib/motion/motion-profiles.ts`, `src/components/motion/*`) already built for Wave 1 — do not hand-roll animation timing per component. Femmora needs one **new** profile:

- `cinematic-editorial` — slower entrance (600–700ms vs `gentle-drift`'s 450ms), fade + minimal vertical drift only (no scale, no rotate), letter-spacing animates open on headline text (a new, small animatable dimension not currently in `AllowedAnimatable` — add `letterSpacing?: string` to that type, transform/opacity-only rule stays intact since letter-spacing is not a layout-triggering property when applied via a CSS custom property, not `width`).
- Drift/parallax intensity stays low (0.3–0.35) — nothing should visibly float; the brief is explicit that this must never read as a generic SaaS animation.
- `prefers-reduced-motion` forces `still` exactly as it already does for every other template — no Femmora-specific override.

---

## 5. Interaction System

Eight signature interactions, each with the required input/accessibility matrix:

| # | Interaction | Touch | Mouse | Keyboard | Reduced-motion fallback |
|---|---|---|---|---|---|
| 1 | Silk parting (Scene 3/4 tap) | tap | click | Enter/Space (mirrors existing `TapToBeginExperience` keydown handler) | instant cut to open state |
| 2 | Doors glide (chained, same gesture) | — | — | — | instant cut, no glide |
| 3 | Garment-tag nav (Scene 7) | tap | click/hover-preview | arrow keys + Enter (extends `PageDotRail`'s existing tab-stop pattern) | no hover-preview animation, tap still works |
| 4 | Lookbook swipe (Scene 8) | swipe | drag/click-arrows | arrow keys | swap crossfade instead of drag-physics |
| 5 | Store film controls | tap | click | full native `<video controls>` semantics as fallback | — |
| 6 | Countdown flip (auto, no gesture) | — | — | — | value updates without flip animation |
| 7 | RSVP confirm | tap | click | Enter | fade instead of scale-in |
| 8 | Share sheet | tap | click | Enter | — |

Every one of these is a thin skin over interaction primitives that already exist in the codebase (tap-gesture handling in `TapToBeginExperience`, `IntersectionObserver`-driven active-page tracking in `use-active-page.ts`, the reveal-component pattern, native `<video>` controls) — none of this needs a new gesture library.

---

## 6. Visual Design Tokens

A new theme in the existing registry (`src/lib/invitation-theme/theme-registry.ts` pattern — same shape as `gilded-serif`/`emerald-arch`, not a parallel system):

```ts
{
  id: "femmora-champagne",
  name: "Femmora Champagne",
  color: {
    primary: "#3A2E22",      // espresso, headline ink
    secondary: "#8A6D3F",     // brushed gold
    accent: "#C9A15A",        // warm gold accent / CTA
    surface: "#FAF3E8",       // silk white / ivory
    surfaceAlt: "#F0E4D2",    // soft cream (alternate page)
    ink: "#2E241B",
    inkMuted: "#8C7A64",      // mocha
    overlay: "rgba(46, 36, 27, 0.42)",
  },
  typography: {
    displayFont: "playfair",   // editorial serif — closest existing registered font to a luxury headline face
    bodyFont: "cormorant",
    scriptFont: "great-vibes", // used sparingly, monogram/finale only
    scale: 1,
    letterSpacing: "grand",
  },
  texture: {
    backgroundTexture: "linen",   // closest existing token to "fine fashion paper"
    dividerStyle: "hairline",
    frameStyle: "none",           // editorial whitespace, no gilded frame
    foilEffect: "gold",
  },
  motif: { packId: "femmora-monogram", placements: { coverTop: "monogram" } },
  motion: { profileId: "cinematic-editorial", intensity: 0.35 },
  spacing: { pagePadding: "grand", blockGap: "airy", radius: 2, shadow: "soft" },
}
```

**Gap:** `backgroundTexture`/`frameStyle`/`dividerStyle` are a closed enum in `theme-resolver.ts` today. None of the current values is "fine fashion paper with an embossed edge" — `linen` is the closest existing option and should be used for Wave 1; a true "pearl paper" texture is a one-line CSS addition to `invitation-pages.css`'s `[data-inv-texture]` rules if design wants it distinct, not a schema change.

---

## 7. Typography Direction

- **Display (headlines, "FEMMORA", "SOFT OPENING"):** wide letter-spacing, all-caps where used, generous line-height — treat like a magazine masthead, not a card heading.
- **Body:** restrained serif, normal case, generous line length caps (~46ch) so it reads like editorial copy, not a spec sheet.
- **Script:** monogram and the finale line only ("We'll see you inside.") — never RSVP labels or nav.
- No decorative flourish glyphs (the existing `MotifGlyph` vine/flourish/candle set) — Femmora's motif pack should ship with a monogram-only glyph, everything else off.

---

## 8. Responsive Behavior

- Mobile portrait is the source of truth (per the brief) — the existing paged-viewer scroll-snap container already targets this.
- Tablet: same page structure, wider `max-width` on `.inv-page-inner` (currently capped at `40rem` globally — Femmora's theme can override via a scoped CSS variable rather than a global change).
- Desktop: split editorial compositions (image/video left, copy right) on the Store Film and Collection Teaser pages specifically — this is a new desktop-only layout variant on those two page components, not a change to the shared `PageFrame`. Cursor-interaction affordances (hover-preview on garment tags) are desktop-only, degrade to tap-only below `768px` (matches the existing `resize_window`/mobile-preset convention already used elsewhere in the codebase for touch vs. mouse detection).

---

## 9. Uploaded-Video Treatment (Store Film)

New component: `StoreFilmPage` / `CinematicVideoPlayer` (new — audit `src/components/media/uploaded-media.tsx` first; if it already wraps `<video>` with basic controls, extend it rather than starting fresh, but it is not built for a full-bleed cinematic hero treatment with a custom scrim/poster/fullscreen affordance, so a dedicated wrapper is the likely answer).

Requirements, mapped to the actual 512×910 / 19.9s / H.264+AAC asset:
- `poster` attribute required (generate/require an uploaded poster frame in Studio; never a blank black frame on slow connections).
- `preload="none"` until the page is within `IntersectionObserver` range (reuses the exact lazy-mount pattern already built for motion layers in `EntranceReveal`/`DriftLayer`).
- Custom play/pause + mute/unmute controls (native controls hidden, custom UI on top) — muted-by-default given no gesture has necessarily happened yet at video-mount time on some entry paths (deep link into `#collection` etc.); an explicit unmute tap is required, matching the browser autoplay-policy pattern the codebase already handles carefully in `PremiumInviteWrapper`'s audio-gesture logic. Do not assume the ceremony's earlier "unlock audio" gesture still counts by the time this page mounts — re-verify with a fresh gesture.
- `object-fit: cover` inside a `9:16`-locked container — never stretch to fill a wider viewport; letterbox instead on desktop.
- Pause automatically when the page scrolls out of the viewer's snap container (reuse the `IntersectionObserver` already driving `use-active-page.ts`'s active-index tracking — add a video ref alongside it).
- Fullscreen: `requestFullscreen()` with a documented iOS Safari caveat (iOS uses `webkitEnterFullscreen` on the `<video>` element itself, not the container — this is a known platform gap to test explicitly, not assume away).
- Fallback: if the video 404s or the format is unsupported, show the poster frame with a static "A first look — video unavailable" caption; never a broken player or blank space.

---

## 10. Media Architecture

- Store film and collection items are `InvitationMediaAsset[]` on `design.media`, using the existing `role` union (`"hero" | "background" | "reference" | "attachment"`). **Gap:** none of those roles distinguishes "brand monogram/logo" from "hero photo." Recommend adding one new role, `"brandMark"`, to `InvitationMediaAsset` — an additive union member, not a schema break — so Studio can let organizers upload a monogram distinctly from the store film hero.
- Collection Teaser reuses `InvitationGalleryDisplay` (`src/components/invitation/invitation-gallery-display.tsx`, already scroll-snap, already used elsewhere in the guest portal) rather than building a new gallery primitive — confirm its lazy-loading/`IntersectionObserver` behavior meets the "progressive loading, pause offscreen video" requirement before extending it; if it currently only handles images, the video-mix requirement is the one real net-new capability needed there.
- All Studio-uploaded media flows through the existing `/api/invitations/upload` + `resolveMediaUrl`/upload-storage pipeline — no new storage path.

---

## 11. RSVP Flow

Reuse `InvitationRsvpPanel` → `POST /api/rsvp` → `Rsvp`/`Guest` models, unchanged. Two additions, both additive:
- Custom copy ("WILL WE SEE YOU AT FEMMORA?" + accept/maybe/decline labels) — already fully overridable via the panel's existing `label` prop pattern established in Wave 1's `RsvpBlock`.
- Preferred visit day (29/30 Aug): **no schema change recommended for Wave 1.** Encode as two selectable chips above the panel that prepend a formatted line ("Preferred: 29 August") into the existing freeform `message` field the RSVP API already accepts. If this pattern (multi-day event RSVP) recurs across future retail-flagship templates, promote it to a typed `Rsvp.preferredDate` column then — don't pre-build a column for a single SKU.

---

## 12. Maps Flow

Reuse `SmartMapBlock`/`buildDirectionsUrl` verbatim for the primary "OPEN IN GOOGLE MAPS" CTA. Two small additions the brief asks for that don't exist yet:
- **Copy location:** `navigator.clipboard.writeText()` of the venue string — a five-line addition to `SmartMapBlock`, same try/catch-degrades-silently pattern already used for the existing share/clipboard code in `persistent-action-bar.tsx`.
- **Share location:** reuse `navigator.share()` if available (same pattern as the existing action-bar share handler), falling back to copy.
- No fake map — if `event.mapsLink`/`venueName`/`landmark` are all empty, the block already returns `null` (confirmed existing behavior); Femmora inherits that for free.

---

## 13. Sharing Flow

Reuse `PersistentActionBar`'s existing share handler (Web Share API → clipboard fallback) verbatim on the Finale page. Open Graph metadata: confirm whether `/invite/[link]/page.tsx` currently sets per-invitation OG tags (title/image/description) — if not, that's a pre-existing gap worth fixing generally, not something to special-case for Femmora; flag to the team as a separate small ticket rather than bundling it into this SKU's scope.

---

## 14. Accessibility Requirements

- All CTA text ("ENTER THE UNVEILING," etc.) needs an explicit `aria-label` that spells out the action, mirroring `TapToBeginExperience`'s existing `ariaLabel` construction (it already builds a full sentence for screen readers distinct from the visible short label) — the new custom-CTA-label prop must feed that same `aria-label` builder, not bypass it.
- Garment-tag nav: proper `role="tablist"`/`tab`/`tabpanel` semantics or an equivalent landmark-nav pattern — not a div-soup of clickable spans. `aria-current="page"` on the active tag (mirrors the existing `aria-current="page"` on `PageDotRail`).
- Video: `<track kind="captions">` slot must exist even if empty at launch — Studio should accept an optional caption file upload; don't hard-block on this for Wave 1 but don't build the player in a way that makes adding it later a rewrite.
- No interaction gated purely on `:hover` — the desktop garment-tag hover-preview is decorative only; tap/click/focus must independently do the same thing hover does.
- Contrast: espresso-on-ivory and gold-on-espresso both need a manual WCAG AA contrast check once final hex values are locked — the token values in §6 are directionally correct but not yet contrast-audited.

---

## 15. Reduced-Motion Version

- `prefers-reduced-motion` forces the `still` profile globally (existing behavior, inherited for free).
- Silk-parting/doors reveal: instant cut from closed to open state, no glide.
- Countdown: numbers update without a flip/roll animation.
- Store film: still autoplays-on-tap (video content isn't decorative motion in the WCAG sense) but the surrounding page chrome entrance is a fade only.

---

## 16. Performance Strategy

- Ceremony (Scenes 0–4) must stay under the existing platform load budget — no new large assets in the ceremony path; the silk-texture background is CSS-generated (gradients/noise via SVG filter or repeating-gradient), not an image or video, specifically to avoid adding weight to the pre-portal critical path.
- Store film: `preload="none"` + poster, mounts only when its page enters the viewer (§9).
- Collection Teaser: lazy-load each lookbook item as it approaches the viewport (reuse the 200% `rootMargin` `IntersectionObserver` pattern already standard in this codebase's paged pages), never the whole gallery at once.
- Pause any playing video the instant its page leaves the snap container's visible range.
- Target: cover-equivalent (first ceremony frame) interactive under the same 2.5s/3G budget the rest of Studio 2.0 already enforces; the store film itself is explicitly exempt from that budget since it's gated behind two gestures and lazy-mounted, not part of first paint.

---

## 17. Failure / Fallback States

| Failure | Behavior |
|---|---|
| Store film fails to load/decode | Poster frame + "A first look — video unavailable" caption, page remains fully usable |
| Collection image fails | Placeholder swatch, skip to next item, no broken-image icon |
| Motion unsupported / reduced-motion | §15 |
| JS hydration delayed | Portal pages are SSR-complete text (Studio 2.0 invariant, inherited) — silk-reveal ceremony degrades to the platform's existing no-JS static-scroll fallback path, same as every other template |
| Audio blocked by browser | Silent, no error UI — matches existing `audioManager.play()` best-effort pattern |
| Maps link unavailable | `SmartMapBlock` returns `null`, page shows remaining content only |
| Web Share API unavailable | Falls back to clipboard copy with a toast, never a dead button |
| RSVP submit fails | Existing panel's inline error message, form stays filled, no data loss |

Non-negotiables carried over from the existing `PremiumInviteWrapper` invariants (already enforced by `forceUnlockInvitationViewport`, verified after every phase transition): never leave `overflow:hidden`/`touch-action:none`/`pointer-events:none`/a stale fixed overlay behind after a scene completes. The new silk/doors component must call the equivalent unlock on its own completion exactly as every existing reveal component does.

---

## 18. Celeventic Integration Points (audit)

| System | Reuse as-is | Extend | New |
|---|---|---|---|
| `PremiumInviteWrapper` phase machine | ✅ intro→tap→reveal→portal, unchanged | — | — |
| `TapToBeginExperience` | ✅ core gesture/keyboard/aria handling | Add `ctaLabelOverride?: string` (bypasses the fixed `Tap to ${beginVerb}` template) and a `brandMarkUrl?: string` slot for the monogram | — |
| Reveal library (`src/components/invitation-os/reveal/`) | Model off `satin-bow-reveal.tsx` (fabric/silk material) and `archway-reveal.tsx` (portal/doors) — read both before writing new code | Register new `OpeningExperienceId` in `experience-types.ts` + `InteractiveReveal`'s dispatch | `silk-boutique-reveal.tsx` |
| `InvitationDesignConfig` / theme tokens (Wave 1) | ✅ token schema, resolver, `applyThemeToDesign` | Add `InvitationMediaAsset.role: "brandMark"`; add `experience.viralFooterEnabled?`/`viralFooterLabel?` | New theme `femmora-champagne` (data only) |
| Invite blueprint system (Wave 1) | ✅ page-frame, dot-rail, action-bar, hash routing | New `InviteCategory: "flagship"`; `GarmentTagRail` as a `PageDotRail` variant | New blueprint `flagship-launch-v1`; page types `store-film`, `countdown`, `collection` |
| RSVP (`/api/rsvp`, `Rsvp`/`Guest`) | ✅ fully reused | Optional preferred-day chip → existing `message` field | — |
| Maps (`SmartMapBlock`) | ✅ directions/Uber/Bolt | Copy-location, share-location | — |
| Music/audio | ✅ fully reused, no changes | — | — |
| Analytics (`InvitationAnalyticsEvent`) | ✅ existing DB-backed pipeline | New string literals (see §22) | — |
| Catalog (`InvitationCatalogTemplate`, `CATALOG_TEMPLATES`) | ✅ existing tier/tags/blueprintId/themeId fields from Wave 1 | New category `"Retail Launch"` in `INVITATION_CATEGORIES` | New catalog entry |
| `InvitationGalleryDisplay` | Likely reusable for the lookbook | Confirm video-mix + lazy-load support | — |
| `UploadedMedia` | Audit first | Possibly extend for the store film player | Or a dedicated `StoreFilmPage`/`CinematicVideoPlayer` if `UploadedMedia` isn't built for full-bleed cinematic treatment |

Nothing above proposes a parallel intro system, a parallel RSVP system, a parallel theming system, or a parallel page/pagination system. Every "New" cell is either a single new file slotting into an existing dispatch table (reveal library, page registry) or a small additive field.

---

## 19. Proposed Components / Files (spec only — none created)

```
src/components/invitation-os/reveal/silk-boutique-reveal.tsx     (new — Scenes 3+4, fused)
src/components/invitation-pages/store-film-page.tsx               (new — Scene 5)
src/components/invitation-pages/countdown-page.tsx                 (new — Scene 9, wraps existing CountdownBlock)
src/components/invitation-pages/collection-teaser-page.tsx         (new — Scene 8, wraps InvitationGalleryDisplay)
src/components/invitation-paged/garment-tag-rail.tsx                (new — Scene 7 nav, PageDotRail variant)
src/components/media/cinematic-video-player.tsx                     (new, only if UploadedMedia audit says so)
src/lib/invite-blueprints/blueprint-registry.ts                     (extend — flagship-launch-v1)
src/lib/invitation-theme/theme-registry.ts                          (extend — femmora-champagne)
src/lib/invitation-mvp/catalogue.ts                                 (extend — femmora-flagship-soft-opening entry)
src/components/invitations/tap-to-begin-experience.tsx              (extend — ctaLabelOverride, brandMarkUrl)
src/components/invitation-pages/blocks/smart-map-block.tsx          (extend — copy/share location)
src/components/invitation-pages/closing-page.tsx                    (extend — viral footer toggle)
src/types/invitation-design.ts                                      (extend — brandMark media role, viralFooterEnabled)
src/lib/experience/experience-types.ts                              (extend — new OpeningExperienceId)
prisma/schema.prisma                                                (extend — INVITATION_CATEGORIES "Retail Launch"; no Rsvp/Guest migration for Wave 1)
```

---

## 20. Data Model / Config Requirements

No Prisma migration required for Wave 1 scope. All new state fits in existing JSON columns (`InvitationDesignConfig` on `Invitation.designConfig`/`InvitationOrder.designConfig`, `InvitationCatalogTemplate`'s existing `tags`/`colorFamily`/`blueprintId`/`themeId` columns from the Studio 2.0 schema work). The only schema-adjacent change is a new string value in the `INVITATION_CATEGORIES` const array (`src/lib/invitation-mvp/catalogue.ts`) — not a Prisma field.

---

## 21. Studio Customization Schema

Everything an organizer edits in `InvitationStudioHub` for this SKU:

- Brand name, event name, dates/times, venue, map URL — existing `event`/`Event` fields, unchanged.
- Monogram/logo — new `brandMark`-role media upload.
- Store film — `media[]` hero-role video upload, with poster.
- Collection photos/videos — existing gallery upload pipeline.
- Colors/fonts/motif/motion — theme chip picker (already built in Studio 2.0's hub — Femmora just needs its theme added to the picker's eligible list for the `flagship` category, same as wedding/funeral themes are scoped today).
- CTA labels — new `ctaLabelOverride`/copy fields, plain text inputs.
- RSVP settings, contact info, social links, closing statement — existing `experience.thankYouMessage` + existing RSVP config; social links deferred unless already modeled elsewhere (not found in the current `InvitationDesignConfig` — flag as Wave 2 if wanted).
- Viral footer on/off + label — new toggle (§18).

---

## 22. Analytics Events (additive to the existing `AnalyticsEventType` string union + `/api/invitation-os/track` zod enum)

`WHISPER_SEEN`, `SILK_REVEAL_OPENED`, `DOORS_OPENED`, `STORE_FILM_PLAY`, `STORE_FILM_COMPLETE`, `STORE_FILM_MUTE_TOGGLE`, `STORE_FILM_FULLSCREEN`, `COLLECTION_ITEM_VIEW`. Everything else (`INVITE_PAGE_VIEW`, `RSVP_SUBMIT`, `VIRAL_CTA_CLICK`, `THEME_SWITCH`) already exists from Wave 1 and applies unchanged to the paginated pages.

---

## 23. Tests Cursor Must Implement

- Playwright e2e, following the existing `e2e/memorial-envelope-runtime.spec.ts` convention: `e2e/femmora-flagship-reveal.spec.ts` covering: soft-intro → whisper/tap-to-begin renders custom CTA label → silk reveal requires a tap (does not auto-open) → doors sequence completes → portal unlocks scroll (no stale `overflow:hidden`) → store film page mounts video lazily → RSVP submits.
- Reduced-motion emulation test: ceremony renders with no glide, correct end state.
- No-JS fallback test: full stacked HTML present (Studio 2.0 invariant), ceremony chrome absent.
- Video failure test: broken video URL still renders poster + caption, page stays scrollable.
- Accessibility: `axe`-style pass on the garment-tag nav and CTA labels.

---

## 24. Acceptance Criteria

- Two-gesture ceremony (or three, per the §3 open decision) plays end-to-end on a mid-tier Android/3G profile without exceeding the existing platform load budget through the reveal, store film explicitly exempted (§16).
- Zero new hardcoded colors/fonts outside the theme token system (same lint rule from Wave 1 applies to any new `invitation-pages`/`invitation-paged` files).
- All 8 signature interactions pass the touch/mouse/keyboard/reduced-motion matrix in §5.
- RSVP, Maps, Share all route through the existing infrastructure — no parallel endpoints.
- Legacy templates render unaffected (additive-only changes, verified by existing regression checks).

---

## 25. Implementation Order

1. Data/theme layer: `femmora-champagne` theme, `flagship-launch-v1` blueprint, catalog entry, new `InviteCategory`/`INVITATION_CATEGORIES` value — all inert until wired up.
2. `store-film-page.tsx`, `countdown-page.tsx`, `collection-teaser-page.tsx` — portal pages, testable in isolation via the preview route before the ceremony exists.
3. `TapToBeginExperience` extensions (`ctaLabelOverride`, `brandMarkUrl`) — small, low-risk, benefits every future non-wedding/non-funeral template too.
4. `silk-boutique-reveal.tsx` — the highest-effort, highest-risk piece; build and test last, behind a feature-inert `OpeningExperienceId` so nothing else depends on it being finished.
5. `GarmentTagRail`, Maps/closing-page small extensions, analytics events.
6. Full e2e pass (§23), accessibility pass, performance budget check.

---

## 26. Risks / Regressions to Protect Against

- **Phase-machine coupling:** the biggest risk is scope-creep into `PremiumInviteWrapper` or `InteractiveReveal`'s shared contracts — every existing template depends on those files. The whole design above is deliberately shaped to avoid touching them (new reveal = new file in an existing dispatch table, not new phases).
- **Gesture fatigue:** three required taps (Scene 2, 3-open, 4-open) risks feeling like friction rather than ceremony — recommend two (§3) unless design pushes back with a strong reason.
- **Video autoplay assumptions:** do not assume the ceremony's initial audio-unlock gesture still "counts" for the store film's audio by the time that page mounts (deep links, tab backgrounding, and multi-page scroll can all break that assumption) — always re-gate on an explicit unmute tap.
- **Viral footer mismatch:** a paid, single-brand flagship SKU showing "Create your own invitation with Celeventic" may be off-brand for Femmora's paying client — this needs an explicit product decision (§18/§21 toggle), not a silent default.
- **Category/theme leakage:** the new `flagship` category and `femmora-champagne` theme must not appear in the wedding/funeral theme pickers or category filters — scope them explicitly in the Studio hub and gallery filters, mirroring how Wave 1 already scopes `WEDDING_THEME_IDS`/`FUNERAL_THEME_IDS`.

---

## HANDOFF TO CURSOR

1. Read `src/components/invitation-os/reveal/satin-bow-reveal.tsx` and `archway-reveal.tsx` in full before writing `silk-boutique-reveal.tsx` — model the CSS layering/easing technique from those two, don't invent a new animation approach.
2. Read `src/components/experience-engine/interactive-reveal.tsx` to confirm the exact dispatch mechanism for `OpeningExperienceId` and where `sealInitials`/`sealEmblem`/`sealStyle` can be safely no-op'd for a non-envelope reveal type.
3. Add `"silk-boutique-unveil"` (or your preferred id) to the `OpeningExperienceId` union in `src/lib/experience/experience-types.ts` and register it in `InteractiveReveal`'s dispatch — do not add a new phase to `PremiumInviteWrapper`.
4. Extend `TapToBeginExperienceProps` with `ctaLabelOverride?: string` and `brandMarkUrl?: string | null`; when `ctaLabelOverride` is set, it replaces the entire `ctaText` (not just the verb), and must still feed the existing `ariaLabel` sentence builder.
5. Add `InvitationMediaAsset.role` union member `"brandMark"` in `src/types/invitation-design.ts`.
6. Add `experience.viralFooterEnabled?: boolean` and `experience.viralFooterLabel?: string` to `EventExperienceConfig`; thread through `ClosingPage`/`ViralFooterBlock` (default `true`/existing copy when unset, so every current template is unaffected).
7. Build `store-film-page.tsx`, `countdown-page.tsx` (thin wrapper over the existing `CountdownBlock`), `collection-teaser-page.tsx` (wraps `InvitationGalleryDisplay` — audit its video support first) as new entries in `PAGE_COMPONENTS`/`InvitePageType`.
8. Build `GarmentTagRail` as a sibling to `PageDotRail`, sharing `use-active-page.ts`'s active-index state — do not duplicate the `IntersectionObserver` logic.
9. Add `flagship-launch-v1` to `src/lib/invite-blueprints/blueprint-registry.ts` and `"flagship"` to `InviteCategory`.
10. Add `femmora-champagne` to `src/lib/invitation-theme/theme-registry.ts` following the exact shape in §6; add a `FLAGSHIP_THEME_IDS` export mirroring `WEDDING_THEME_IDS`/`FUNERAL_THEME_IDS`, and scope it in the Studio theme-picker and gallery filters so it never leaks into wedding/funeral pickers.
11. Add `"Retail Launch"` to `INVITATION_CATEGORIES` in `src/lib/invitation-mvp/catalogue.ts` and append the `femmora-flagship-soft-opening` catalog entry (tier: premium, hasParallax: false — this is `cinematic-editorial`, not `gentle-drift`, and does not need the parallax flag).
12. Small additions to `SmartMapBlock`: copy-location (clipboard) and share-location (`navigator.share`) buttons, mirroring the existing degrade-silently pattern in `persistent-action-bar.tsx`.
13. Extend the analytics zod enum in `/api/invitation-os/track/route.ts` and the `AnalyticsEventType` union with the §22 literals.
14. Write the Playwright suite per §23, following `e2e/memorial-envelope-runtime.spec.ts`'s structure.
15. Do not touch `PremiumInviteWrapper.tsx`, `InteractiveReveal`'s prop contract, the `Rsvp`/`Guest` Prisma models, or any existing reveal file's internals — every item above is additive.
16. Confirm the §3 gesture-count decision (two vs. three) and the §18/§21 viral-footer decision with product/design before building the reveal component — both are cheap to decide now and expensive to redo after.

This specification is ready for engineering estimation and design sign-off. It is not a build — no files listed above have been created or modified.
