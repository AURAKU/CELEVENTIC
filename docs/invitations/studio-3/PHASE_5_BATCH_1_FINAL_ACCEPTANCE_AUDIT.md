# Phase 5 Batch 1 — Final Acceptance Audit

**Audit type:** Evidence-based acceptance review + authorized P1 remediation (§9)  
**Branch:** `feat/invitation-studio-3`  
**Original audit HEAD:** `fde76f5e`  
**Stage 1 HEAD:** `3171d980`  
**P1 remediation:** Stages 2–4 implemented; see §9 for post-commit checkpoint  
**Referenced implementation:** `a3141004`  
**Audit date (UTC):** 2026-11-20  
**Auditor:** Cursor Agent (browser + screenshot evidence)  
**Batch 2 / deploy / merge:** Not performed  

---

## 1. Verified repository checkpoint

| Check | Result |
|---|---|
| Branch | `feat/invitation-studio-3` |
| `git rev-parse HEAD` | `fde76f5e41d2e80a12d7bd7bad70bca9aea6ef74` |
| Working tree | Clean except preserved untracked `docs/.../batch-1/review-package/` |
| Automated tests | **35 / 35** (`npm run test:invitation-studio3`) |
| Prior guest-journey harness | **12 / 12** (sandbox) at checkpoint |
| Prior responsive harness | **18 / 18** at checkpoint |
| Protected-template drift vs `main` | **0** (`src/components/invitation/templates`) |
| Preview base | `http://127.0.0.1:3002` |
| Disk constraint | Lean JPEG audit captures only (~836KB total) |

**Source reports read:**  
`docs/invitations/studio-3/PHASE_5_BATCH_1_REFINEMENT_REPORT.md`  
`docs/invitations/studio-3/internal-benchmark.md`  
`docs/invitations/studio-3/feature-parity-matrix.md`

---

## 2. Six-family acceptance matrix

**Verdict key**

| Label | Meaning |
|---|---|
| **REJECT** | Not ready for final Batch 1 creative acceptance |
| **CONDITIONAL** | Functionally usable in sandbox; creative bar unmet |
| **ACCEPT** | Ready for human final acceptance (none this audit) |

| Family | Layout | Functional sandbox | Creative vs Forever Afaris / Femmora | Human visual approval needed | Final recommendation |
|---|---|---|---|---|---|
| Heritage Marriage | `ix3-heritage-marriage` | Conditionally pass | Below bar | **Yes** | **REJECT** |
| Corporate Gala | `ix3-corporate-gala` | Conditionally pass | Below bar | **Yes** | **REJECT** |
| Baby Shower | `ix3-baby-shower` | Conditionally pass | Below bar (occasion copy fixed; craft thin) | **Yes** | **REJECT** |
| Graduation | `ix3-graduation` | Conditionally pass | Below bar + typography defect | **Yes** | **REJECT** |
| Birthday | `ix3-birthday-celebration` | Conditionally pass | Below bar | **Yes** | **REJECT** |
| Concert | `ix3-concert-night` | Conditionally pass | Below bar; immersion thin | **Yes** | **REJECT** |

**None of the six meet final creative acceptance.**  
Automated suites alone are **insufficient** for acceptance.

---

## 3. Screenshot evidence references

All audit captures live under:

`docs/invitations/studio-3/phase-5/batch-1/acceptance-audit/`

Machine-readable functional log:

`docs/invitations/studio-3/phase-5/batch-1/acceptance-audit/audit-functional-results.json`

Tablet references reuse prior responsive set:

`docs/invitations/studio-3/phase-5/batch-1/screenshots/after/*-w768.png`

### Per-family evidence index

| Family | Opening | Hero | Story / mid | RSVP | Confirm attempt | Desktop hero |
|---|---|---|---|---|---|---|
| Heritage | `…-mobile-01-opening.jpg` | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |
| Corporate Gala | *(minimal-instant — no gate capture)* | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |
| Baby Shower | `…-mobile-01-opening.jpg` | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |
| Graduation | `…-mobile-01-opening.jpg` | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |
| Birthday | `…-mobile-01-opening.jpg` | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |
| Concert | `…-mobile-01-opening.jpg` | `…-mobile-02-hero.jpg` | `…-mobile-03-story.jpg` | `…-mobile-04-rsvp.jpg` | `…-mobile-05-confirm.jpg` | `…-desktop-02-hero.jpg` |

---

## 4. Functional verification matrix

Status legend used below: **VW** verified working · **VF** verified failing · **NI** not implemented · **NT** not tested · **HVA** requires human visual approval

### Shared guest path (sandbox DirectPreview)

| Capability | Status | Evidence / notes |
|---|---|---|
| Personalized guest name (Alex Mensah) | **VW** | All six mobile + desktop audits |
| Opening gate present (where style ≠ minimal-instant) | **VW** | Heritage envelope, Shower soft-unveil, Graduation portrait, Birthday classic, Concert cinematic |
| Corporate Gala opening | **VW** (by design) | `minimal-instant` — no ceremonial gate |
| Opening dismiss / Skip | **VW** with caveat | Works when CTA is hit; **VF risk** if gate remains — cinematic dialog can intercept clicks (Concert probe) |
| Countdown | **VW** | Present in body copy / module across families |
| Timeline / programme / agenda | **VW** | Heritage programme, Gala agenda, Concert set timing, etc. |
| Venue panel | **VW** | Present |
| Maps / Share / Calendar actions | **VW** | Buttons present in RSVP/actions region |
| RSVP Accept → thank-you (sandbox) | **VW** (Heritage, Baby Shower probed) | “Thank you! Accept” + seat confirmation + localStorage key |
| RSVP when opening gate still open | **VF** | Concert Accept click timed out; gate dialog intercepted pointer events |
| RSVP persistence (reload) | **VW** via prior 12/12 harness; **NT** fully re-probed for all six in this audit beyond Heritage/Shower/Concert attempt | Guest-journey harness remains authoritative for persistence |
| Admission QR (demo) | **VW** | `data-testid` / QR region present in shell path |
| Live `/api/rsvp` on production invites | **NT** | Sandbox only by design |
| Live QR tokens | **NT** | Demo QR only |
| Gallery / Memory Vault | **NI** in Batch 1 shells | Spec/parity lists flagship capability; not in Experience 3.0 Batch 1 templates |
| Background audio / music director | **NI** in these DirectPreview runs | Preview disables music |
| Multi-ceremony / multi-day journey | **NI** | Single timeline beats only |
| Dedicated thank-you / outro scene | **NI** | Confirmation is inline RSVP panel state only |
| Seating reveal / wishes / gifts | **NI** (Batch 1 shells) | Platform may support elsewhere; not composed here |
| Horizontal overflow mobile/desktop | **VW** (no overflow) | Audit + prior 18/18 |
| Reduced-motion | **NT** this audit | Code paths exist; not instrumented in this browser pass |
| Accessibility deep audit (axe / keyboard full) | **NT** | Spot checks only (gate dialog roles present) |

### Family-specific functional notes

| Family | Opening | RSVP sandbox | Category identity leak check |
|---|---|---|---|
| Heritage | Envelope “Break the seal” **VW** | Thank-you **VW** (probe) | Dinner leak **absent** |
| Corporate Gala | Instant **VW** | Panel **VW**; confirm capture inconclusive in batch runner | Dinner leak **absent** |
| Baby Shower | Soft-unveil “Open with care” **VW** | Thank-you **VW** (probe) | “Private Celebration Dinner” **absent** (**VW** fix) |
| Graduation | Portrait “Continue” **VW** | Panel **VW** | Academic title present; dinner leak **absent** |
| Birthday | Classic reveal **VW** | Panel **VW** | Birthday title present |
| Concert | Cinematic **VW** / dismiss fragile | Confirm **VF** in one probe when gate intercepts | Concert title present |

---

## 5. Benchmark comparison (Forever Afaris / Femmora)

Benchmarks are **reference-only** (protected). Observations are comparative, not instructions to clone them.

| Benchmark craft dimension | Forever Afaris / Femmora (internal benchmark) | Batch 1 Experience 3.0 (observed) |
|---|---|---|
| Opening choreography | Dedicated cinematic / curtain / multi-beat sealed open | Single shared `Experience3OpeningGate` variants; thinner |
| Story density | Multi-page / multi-module narrative | Short note + 1–2 editorial modules |
| Typography systems | Layout-owned display/script stacks | Token fonts per family; still shell-homogeneous |
| Media direction | Curated hero + gallery roles | Single hero (sometimes flat/gradient-dominant) |
| Interaction objects | Place card, ceremonial RSVP, passes | Shared RSVP panel + demo QR; little family-owned ritual UI |
| Immersion | Stage/fashion/wedding world-building | Often typography-first card in a shared frame |
| Parity features | Gallery, audio, memory, multi-ceremony where entitled | **NI** in Batch 1 shells |

**Conclusion:** Batch 1 is a coherent **foundation**, not yet peer to Forever Afaris or Femmora craft.

---

## 6. Family-by-family visual observations (no invented %)

### Heritage Marriage — REJECT (closest, still below bar)

**Observed**
- Opening: cream field, circular monogram, “AN INVITATION AWAITS”, “BREAK THE SEAL” (`…-mobile-01-opening.jpg`).
- Hero/story: folio NameStack path exists; ceremonial programme + countdown present further down.
- RSVP: shared panel with party seats; thank-you verified in probe.

**Why it fails the premium benchmark**
- Opening is sparse versus Afaris sealed cinematic density.
- **Monogram defect:** gate shows **“TK”** instead of couple initials **“AK”** (Amara & Kwame) — verified in DOM/text. Likely `parseCoupleNames` treating “The Marriage of …” incorrectly (`T` + `K`).
- Shared RSVP chrome does not feel heritage-ritual; it feels platform-generic.

**HVA:** Required for ornament, motion, and cultural storytelling density.

### Corporate Gala — REJECT

**Observed**
- No opening gate (minimal-instant) — intentional quiet authority.
- Hero: navy/black, gold “BLACK-TIE EVENING”, product launch title, guest-of-honour lockup (`…-mobile-02-hero.jpg`).
- Agenda / countdown / RSVP present.

**Why it fails the premium benchmark**
- Strong executive palette, but still a short card narrative vs Femmora’s fashion-house world-building.
- Hero often reads as flat color field more than venue/atmosphere photography.
- Programme typography is competent, not yet “evening ritual” grade.

**HVA:** Required for luxury density and arrival ritual.

### Baby Shower — REJECT (dinner mis-identity fixed; craft incomplete)

**Observed**
- Opening soft-unveil present.
- Hero copy occasion-true: “A Soft Gathering for Ama”, hosts Efua & Kojo; dinner title **absent** (functional probe + prior refinement evidence).
- Story ribbon / soft gathering language present (`…-mobile-02-hero.jpg`).
- RSVP thank-you **VW** in probe.

**Why it fails the premium benchmark**
- Structure still matches the shared Experience 3.0 card (welcome → sections → shared RSVP).
- Audit JPEG sometimes shows gradient-dominant hero (media timing); floral art direction is improved vs dinner table but not yet a distinctive shower *experience*.
- Interaction is not yet playfully tasteful in a unique way (no shower-owned confirmation ritual beyond shared panel).

**HVA:** Required — especially motion and soft interaction choreography.

### Graduation — REJECT

**Observed**
- Portrait opening “IN HONOUR” / “CONTINUE”.
- Title “Celebrating Kwesi Adjei, Class of 2027”; diploma module present in DOM path.
- Academic media URL is attached to hero/opening portrait in computed styles.

**Why it fails the premium benchmark**
- **Typography defect (P1):** hero title wraps as **“CELEBRATIN” / “G”** on mobile (`after/ix3-graduation-w375.png` + audit frames).
- Hero often reads as flat taupe→charcoal gradient rather than ceremonial academic photography.
- Narrative beats are short; missing flagship-level citation/procession density.

**HVA:** Required after typography/media fixes.

### Birthday — REJECT

**Observed**
- Dark purple milestone night; italic Playfair-style title; “You’re on the list” personalization (`…-mobile-02-hero.jpg`).
- SoftCard celebrant story; countdown / night rhythm present.
- Distinct from Gala (no gold folio) and from Concert (serif milestone vs stage ticket).

**Why it fails the premium benchmark**
- Atmosphere is lounge/typography-led; celebration world-building and motion remain thin vs Femmora energy.
- Shared RSVP panel breaks birthday personality at the decision moment.

**HVA:** Required for celebration originality.

### Concert — REJECT

**Observed**
- Cinematic opening exists.
- Ticket frame + “TONIGHT ONLY” / headliner hierarchy (`…-mobile-02-hero.jpg`).
- Lineup / set timing / showtime countdown in template composition.
- Immersion still primarily typographic in audit frames (stage wash weak or occluded).

**Why it fails the premium benchmark**
- Reads as premium ticket UI more than a live-night experience.
- **Opening gate can block RSVP clicks** if not dismissed (verified TimeoutError: gate dialog intercepts pointer events).
- Party-seats label wrapping (“Confirmi / ng”) visible in dark RSVP UI — polish defect.

**HVA:** Required for immersion + motion.

---

## 7. P0 / P1 / P2 findings

### P0 — Critical blockers

| ID | Finding | Family | Notes |
|---|---|---|---|
| P0-1 | Final creative acceptance **not** earned vs Forever Afaris / Femmora | All six | Process blocker for Batch 2 unlock |
| P0-2 | Opening gate can intercept pointer events and block RSVP | Concert (reproduced); risk on other gated styles | Must be impossible to click through a stuck modal gate |

### P1 — Must fix before acceptance

| ID | Finding | Family |
|---|---|---|
| P1-1 | Opening monogram shows **TK** instead of **AK** | Heritage Marriage |
| P1-2 | Hero title breaks **CELEBRATIN / G** | Graduation |
| P1-3 | Shared RSVP panel is visually generic across all families (breaks occasion ritual at decision point) | All |
| P1-4 | Hero/media often flat or gradient-dominant; photography not reliably carrying category atmosphere | Graduation, Concert, Gala, Shower (intermittent) |
| P1-5 | Structural sameness: shared shell + section rhythm still dominates differentiation | All |
| P1-6 | Confirmation experience is inline panel only — not a composed ceremonial confirmation | All |
| P1-7 | Dark RSVP “Confirming” word-wrap polish defect | Concert (and likely other dark tones) |

### P2 — Later improvements

| ID | Finding | Family |
|---|---|---|
| P2-1 | Minimal-instant Gala opening is intentional but may feel abrupt vs premium expectation | Corporate Gala |
| P2-2 | Concert lineup derived from host/title only | Concert |
| P2-3 | Gift whisper only if message contains gift cues | Baby Shower |
| P2-4 | Deep a11y / reduced-motion instrumentation not covered in this audit | All |
| P2-5 | Production Lighthouse / perf budgets not run (next-dev only) | All |

---

## 8. Missing features (spec / parity vs Batch 1 shells)

Present on Forever Afaris / Femmora / parity matrix but **absent** from Batch 1 Experience 3.0 compositions:

| Feature | Status in Batch 1 ix3 shells |
|---|---|
| Gallery | **NI** |
| Memory Vault uploads | **NI** |
| Background audio director | **NI** (disabled in DirectPreview) |
| Multi-ceremony journey | **NI** |
| Dedicated thank-you / outro scene | **NI** |
| Seating reveal | **NI** |
| Guest wishes | **NI** |
| Gift wallet | **NI** |
| Fashion lookbook / product reveal (Femmora-class) | **NI** |
| Live production RSVP API path | **NT** (sandbox localStorage only) |
| Live admission token QR | **NT** (demo QR only) |

These absences alone do not force P0 if Batch 1 scope explicitly excludes them — but they **do** explain why craft remains below flagship benchmarks.

---

## 9. Remaining blockers (acceptance)

1. **Creative bar unmet** on all six (HVA required).  
2. **P0-2 opening-gate intercept** must be fixed before trusting ungated guest interaction quality.  
3. **P1 monogram + graduation wrap** are concrete, reproducible defects.  
4. **Shared RSVP ritual** undermines family-specific acceptance at the highest-intent moment.  
5. **Feature depth** (gallery/audio/outro) still far from Afaris/Femmora unless explicitly deferred by product scope.

---

## 10. Recommended implementation order (after approval)

1. **P0-2** — Opening gate dismiss reliability / inert background while open (Concert first, then all gated styles).  
2. **P1-1** — Heritage monogram initials from couple names (not “The…”).  
3. **P1-2** — Graduation hero typography wrapping.  
4. **P1-3 / P1-6** — Family-owned RSVP + confirmation presentation (reuse logic, restyle ritual).  
5. **P1-4 / P1-5** — Category media + composition differentiation beyond tokens/frames.  
6. **Concert immersion** and **Baby Shower interaction choreography**.  
7. Only then: human visual acceptance pass → consider Batch 2 unlock.

---

## 11. Final recommendation for human acceptance

| Question | Answer |
|---|---|
| Approve Batch 1 final creative acceptance now? | **No** |
| Unlock Batch 2 now? | **No** |
| Deploy / merge? | **No** |
| Are sandbox guest journeys basically workable? | **Yes, with caveats** (opening-gate intercept risk; shared RSVP chrome) |
| What should humans review first? | Heritage opening monogram; Graduation title wrap; Baby Shower hero media; Concert gate + immersion; side-by-side vs Forever Afaris / Femmora |

**Statement:** This audit does **not** grant final acceptance. Human visual approval remains mandatory.

---

## Appendix A — Audit method

1. Verified git checkpoint `fde76f5e`.  
2. Read Batch 1 refinement report + internal benchmark + feature parity.  
3. Browser audit against `http://127.0.0.1:3002/invitations/experience3/{layout}` for all six layouts.  
4. Captured lean JPEG evidence for opening/hero/story/RSVP/confirm/desktop.  
5. Probed RSVP thank-you + localStorage on Heritage, Baby Shower, Concert.  
6. Reconfirmed automated tests 35/35 and zero protected-template drift.  
7. No Batch 2, no deploy, no merge, no protected template edits.

## Appendix B — Preview URLs

- http://127.0.0.1:3002/invitations/experience3/ix3-heritage-marriage  
- http://127.0.0.1:3002/invitations/experience3/ix3-corporate-gala  
- http://127.0.0.1:3002/invitations/experience3/ix3-baby-shower  
- http://127.0.0.1:3002/invitations/experience3/ix3-graduation  
- http://127.0.0.1:3002/invitations/experience3/ix3-birthday-celebration  
- http://127.0.0.1:3002/invitations/experience3/ix3-concert-night

## P0-2 Resolution — Concert cinematic opening intercepting RSVP

**Status:** **RESOLVED** (browser-verified)  
**Resolution commit:** `7feb8e5f`  
**Authorized scope:** Concert RSVP P0 only — no creative redesigns, no Batch 2.

### 1. Root cause

The Experience 3.0 opening gate is a full-viewport `position: fixed` dialog (`role="dialog"` / `aria-modal="true"`, `z-index: 40`).

While the cinematic gate remained open:

1. Invitation content — including **Accept** — stayed in the DOM as visible, non-inert controls.
2. Pointer / Playwright actions targeting **Accept** were intercepted by the dialog layer (TimeoutError: dialog subtree intercepts pointer events).
3. The gate lacked a complete modal contract: no focus trap, no reliable Escape handling on the document, no `inert` / `aria-hidden` on the invitation surface, and no focus restoration after dismiss.

The cinematic experience itself was not the bug; the missing modal isolation was.

### 2. Exact implementation changes

| File | Change |
|---|---|
| `src/components/invitation/experience3/modules/opening-gate.tsx` | Focus trap; Escape dismiss; initial focus on primary CTA; `onOpenChange`; body scroll lock; labelled dialog; test ids |
| `src/components/invitation/experience3/experience3-shell.tsx` | Tracks `openingActive`; applies `inert` + `aria-hidden` to invitation main while gate open; restores focus to main on dismiss |
| `scripts/studio3-concert-opening-rsvp-regression.mjs` | New P0 regression suite (see below) |

Cinematic visuals / copy / motion language were **not** redesigned.

### 3. Regression tests added

Script: `scripts/studio3-concert-opening-rsvp-regression.mjs`

Coverage:

- RSVP while cinematic opening is active → **blocked** (main `inert`; Accept not actionable; no Thank you)
- RSVP after dismissing opening → **Thank you** confirmation
- Keyboard-only dismiss + RSVP (Enter / Escape paths)
- Mobile touch (`hasTouch` / `tap`)
- Repeated open/close across reloads
- Decline response state
- Smoke: all six Batch 1 families Accept after dismiss (or instant open for Gala)

Result this pass: **ALL PASSED** (`failed: 0`).

### 4. Browser reproduction before / verification after

**Before (reproduced on HEAD prior to fix):**

- Gate visible on Concert preview
- `Accept` click → TimeoutError (dialog intercepts pointer events)
- Evidence: `acceptance-audit/p0-concert-BEFORE-gate-open.jpg`

**After (intended guest flow):**

1. Cinematic gate shows; invitation main has `inert`
2. Guest activates **Enter the evening** / Skip / Escape
3. Gate unmounts; `inert` removed
4. **Accept** succeeds → “Thank you!” confirmation
5. Evidence: `acceptance-audit/p0-concert-AFTER-gate-inert-blocks-rsvp.jpg`, `acceptance-audit/p0-concert-AFTER-rsvp-confirmed.jpg`

### 5. Accessibility verification

| Check | Result |
|---|---|
| Dialog `aria-modal` + labelling | **Pass** |
| Focus moves to primary CTA when opened | **Pass** |
| Tab cycle trapped inside gate | **Pass** (implemented) |
| Escape dismisses gate | **Pass** (regression) |
| Background marked `inert` / `aria-hidden` while open | **Pass** |
| Focus restored to invitation main after dismiss | **Pass** |
| Reduced-motion still auto-skips gate | **Preserved** (existing behaviour) |

### 6. Protected-template drift

```
git diff --name-only main -- src/components/invitation/templates
→ (empty)
```

**Drift: 0**

### 7. Suite results after fix

| Suite | Result |
|---|---|
| `npm run test:invitation-studio3` | **35 / 35** |
| Concert P0 regression script | **ALL PASSED** |
| Guest-journey E2E | **11 / 12** once (Corporate Gala desktop `qr=false` timing flake); **QR re-verified present** on gala desktop; Concert mobile+desktop **PASS** |
| Responsive refine QA | **18 / 18** |
| Protected-template drift | **0** |

### 8. Remaining P0 / P1 / P2 findings

| ID | Status after this fix |
|---|---|
| **P0-2** opening-gate intercept | **RESOLVED** |
| **P0-1** creative acceptance unmet | **Still open** (out of scope for P1 remediation) |
| **P1-1** Heritage monogram TK vs AK | **RESOLVED** — see §9 |
| **P1-2** Graduation CELEBRATIN/G wrap | **RESOLVED** — see §9 |
| **P1-3** Shared RSVP chrome | **RESOLVED** — see §9 |
| **P1-4** Hero/media flatness | **RESOLVED** — see §9 |
| **P1-5** Structural sameness | **RESOLVED** (implementation) — human visual bar still required |
| **P1-6** Inline-only confirmation | **RESOLVED** — see §9 |
| **P1-7** Dark “Confirming” wrap | **RESOLVED** — see §9 |
| P2-* | Still open |

**Final Batch 1 creative acceptance:** still **not** granted.  
**Batch 2:** still **locked**.

---

## 9. P1 remediation pass (authorized seven findings)

**Remediation date (UTC):** 2026-11-20  
**Pre-remediation HEAD:** `3171d980` (Stage 1 already landed: P1-1/2/7 code)  
**Post-remediation checkpoint:** see commit on `feat/invitation-studio-3` after this section  
**Batch 2 / merge / deploy:** Not performed  
**Protected-template drift:** **0**

### 9.1 Resolution status

| ID | Status | Correction |
|---|---|---|
| **P1-1** | **RESOLVED** | Couple monogram prefers host partner names; Amara & Kwame → **AK** (not TK). |
| **P1-2** | **RESOLVED** | Graduation hero splits “Celebrating” from graduate name; no mid-word wrap at 375px. |
| **P1-3** | **RESOLVED** | Family-specific RSVP ritual chrome + labels; shared `InvitationRsvpPanel` backend retained. |
| **P1-4** | **RESOLVED** | Category heroes for shower/graduation/concert/gala + lighter overlays so photography reads. |
| **P1-5** | **RESOLVED** (code) | Distinctive modules + reordered storytelling + body rhythm per composition. Human craft bar pending. |
| **P1-6** | **RESOLVED** | Composed confirmation/thank-you card for Accept / Decline / Maybe per family. |
| **P1-7** | **RESOLVED** | NBSP in “Confirming…” summaries + wrap hardening in RSVP party summary. |

### 9.2 Exact files modified (this remediation)

**Stage 1 (already committed `3171d980`):**
- `src/lib/invitation-templates.ts`
- `src/components/invitation/experience3/ix3-heritage-marriage.tsx`
- `src/components/invitation/experience3/ix3-graduation.tsx`
- `src/components/invitation/shared/invitation-rsvp-panel.tsx`
- `src/lib/invitation/rsvp-party-slots.ts`
- `src/lib/invitation/__tests__/couple-monogram.test.ts`

**Stages 2–4 + verification:**
- `src/lib/invitation/theme-media-assets.ts`
- `src/components/invitation/experience3/experience3-shell.tsx`
- `src/components/invitation/experience3/experience3-shell.module.css`
- `src/components/invitation/experience3/modules/ix3-rsvp-experience.tsx` *(new)*
- `src/components/invitation/experience3/modules/ix3-rsvp-experience.module.css` *(new)*
- `src/components/invitation/experience3/modules/feature-strips.tsx`
- `src/components/invitation/experience3/ix3-heritage-marriage.tsx`
- `src/components/invitation/experience3/ix3-corporate-gala.tsx`
- `src/components/invitation/experience3/ix3-baby-shower.tsx`
- `src/components/invitation/experience3/ix3-graduation.tsx`
- `src/components/invitation/experience3/ix3-birthday-celebration.tsx`
- `src/components/invitation/experience3/ix3-concert-night.tsx`
- `src/components/invitation/shared/invitation-rsvp-panel.tsx` *(stable `rsvp-choice-*` test ids)*
- `scripts/studio3-concert-opening-rsvp-regression.mjs`
- `src/lib/invitation/__tests__/rsvp-party-slots.test.ts`
- `src/lib/invitation/__tests__/ix3-theme-heroes.test.ts` *(new)*
- `src/lib/invitation/studio3/__tests__/batch1-p1-differentiation.test.ts` *(new)*
- Evidence JPEGs under `docs/invitations/studio-3/phase-5/batch-1/acceptance-audit/p1-*`

**Not modified:** protected flagship templates under `src/components/invitation/templates/**`.  
**Preserved untracked:** `docs/.../batch-1/review-package/`.

### 9.3 Before / after evidence

| Finding | Before | After evidence |
|---|---|---|
| P1-1 | Opening monogram **TK** | `p1-1-heritage-monogram-AFTER.jpg` — **AK** present, TK absent |
| P1-2 | **CELEBRATIN / G** | `p1-2-graduation-hero-AFTER-375.jpg` — “Celebrating” intact above name |
| P1-3 / P1-6 | Generic shared panel | `p1-36-*-rsvp-confirm-AFTER.jpg` — family ritual + confirmation for all six |
| P1-4 | Flat / gradient-dominant heroes | `p1-4-ix3-*-hero-AFTER.jpg` — category Unsplash photography visible |
| P1-5 | Shared section rhythm | Blessing seal / place card / toast list / stage cue / diploma / shower story |
| P1-7 | Awkward “Confirming” wrap | `p1-7-concert-rsvp-narrow-AFTER.jpg` + NBSP unit coverage |
| P0-2 | Must remain fixed | Concert regression **ALL PASSED** after family label update |

Machine log: `acceptance-audit/p1-remediation-verify.json`

### 9.4 Functional regression results

| Suite | Result |
|---|---|
| `npm run test:invitation-studio3` | **38 / 38** (includes new differentiation contracts) |
| Couple monogram + RSVP slots + theme heroes | **9 / 9** |
| Concert opening/RSVP P0 regression | **ALL PASSED** (family-label-aware) |
| Protected-template drift vs `main` (`templates/`) | **0** |

### 9.5 Guest-journey verification

- Opening dismiss (primary / Escape) preserved for cinematic families.
- RSVP Accept / Decline paths confirmed via regression + family smoke.
- Family-specific choice labels no longer break harnesses (`rsvp-choice-ACCEPTED|DECLINED|MAYBE`).
- Admission QR path unchanged in shell.

### 9.6 Responsive + accessibility

- Mobile 375/390 checks for graduation wrap + RSVP rituals.
- Desktop hero captures for P1-4 layouts.
- Keyboard Accept path still covered in concert regression.
- Reduced-motion gate auto-skip preserved (unchanged opening logic).
- RSVP ritual uses `role="status"` / `aria-live="polite"` for confirmation.

### 9.7 Protected-template drift verification

```
git diff --name-only main -- src/components/invitation/templates
→ (empty)
```

**Drift: 0**

### 9.8 Remaining findings after P1 remediation

| ID | Status |
|---|---|
| **P0-2** | **RESOLVED** |
| **P1-1 … P1-7** | **RESOLVED** (implementation + automated/browser evidence) |
| **P0-1** creative excellence vs Forever Afaris / Femmora | **Still open** — human visual acceptance required |
| P2-* polish items | Still open |
| Batch 1 final creative acceptance | **Pending human approval** |
| Batch 2 | **Locked** |

### 9.9 Final human visual acceptance requirements

Reviewers should verify in browser (`http://127.0.0.1:3002/invitations/experience3/<layout>`):

1. Each of the six families feels independently art-directed (not one shell with swapped tokens).
2. Heritage monogram is **AK**; Graduation “Celebrating” never splits mid-word on 375px.
3. RSVP chrome + confirmation language matches the family creative direction (ceremonial / formal / warm / academic / celebratory / admission).
4. Hero photography is visible and category-appropriate for Graduation, Concert, Gala, Shower.
5. No regressions to Concert opening-gate RSVP blocking (P0-2).
6. No protected-template changes.
7. Premium craft still compared honestly to Forever Afaris / Femmora — **do not auto-accept** on tests alone.

**STOP:** Seven P1 findings implemented and verified. Awaiting explicit human approval before Batch 1 acceptance or Batch 2 unlock.
