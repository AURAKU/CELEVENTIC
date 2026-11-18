# CELEVENTIC Invitation Experience 3.0 — Phase 3A QA Report

**Branch:** `feat/invitation-studio-3`  
**Validation base (user-reported):** `5de001a1`  
**Validation HEAD:** `117407a1` (+ Phase 3A fixes committed after this report)  
**Scope:** Validate three references only — **no Phase 3B catalog expansion**  
**Deploy / merge:** Not performed  

## Executive verdict

Phase 3A is **PARTIAL PASS with release blockers**.

| Gate | Result |
|---|---|
| Version isolation (code + unit tests) | **Pass** |
| Protected v1 screenshot regression vs historical baselines | **Unverified** — baselines folder empty; not invented |
| Three reference visual review (mobile + desktop samples) | **Pass with notes** |
| Responsive overflow matrix (8 widths × 3 layouts) | **Pass** (22/24 first pass; 2 cold-start timeouts retested OK) |
| Functional honesty matrix | **Documented** — not all capabilities are full integrations |
| Lighthouse (production-grade) | **Incomplete** — metrics from `next dev` only; LCP not acceptance-grade |
| Creative quality vs premium bar | **Promising but not yet exceptional** |

**Do not begin Phase 3B until blockers below are cleared.**

---

## 1. Version isolation

### Automated

```
npm run test:invitation-studio3 → 31/31 pass
```

Proven flagships classify as **PROTECTED**; `mayModifyLayoutInPlace` is always **false**.

| Layout | Status | In-place modify |
|---|---|---|
| forever-afaris-wedding | PROTECTED | false |
| traditional-marriage-ceremony | PROTECTED | false |
| luxury-fashion-flagship | PROTECTED | false |
| memorial-candle-tribute | PROTECTED | false |
| seraphine-champagne-wedding | PROTECTED | false |
| aurelia-editorial-wedding | PROTECTED | false |

Protected source paths inventory: **all present on disk**.  
Git diff of protected template paths vs `main` merge-base: **empty**.

### Screenshot comparison against historical baselines

`docs/invitations/studio-3/phase-3/baselines/` is **empty**.

**Visual equivalence of protected v1 invitations remains UNVERIFIED.**

New screenshots of live production invites were **not** labeled as historical baselines. A production Forever Afaris guest URL could not be loaded in the IDE browser during this run (`chrome-error://`).

---

## 2. Screenshots — three new experiences

Artifacts: `docs/invitations/studio-3/phase-3a/screenshots/`

### Responsive matrix (Playwright Chromium)

Widths: 320, 375, 390, 430, 768, 1024, 1440, 1920  

Files: `{layout}-w{width}.png` for all three layouts.

Clean review captures (cookies dismissed + gate opened):

- `ix3-editorial-wedding-clean-w375.png`
- `ix3-editorial-wedding-clean-w1440.png`
- `ix3-brand-launch-clean-w375.png`
- `ix3-brand-launch-clean-w1440.png`
- `ix3-memorial-clean-w375.png`
- `ix3-memorial-clean-w1440.png`

Metrics JSON: `docs/invitations/studio-3/phase-3a/responsive-metrics.json`

### Overflow

All successfully measured viewports: **`docOverflow: false`**.  
Initial wedding 320/375 failures were **`networkidle` cold-start timeouts**, not overflow. Retested with `waitUntil: load` → overflow false, guest + RSVP present.

---

## 3. Creative quality assessment

Reviewed against Celeventic’s premium bar (Forever Afaris / editorial wedding DNA, Femmora dark launch language, memorial solemnity) using captured ix3 shells.

### Luxury Wedding — `ix3-editorial-wedding`

| Criterion | Assessment |
|---|---|
| Originality | Moderate — distinctive vs generic card templates; still simpler than Forever Afaris multi-scene editorial |
| Typography | Good serif couple lockup; eyebrow tracking works |
| Color harmony | Ivory / amber accent coherent |
| Opening | Monogram gate is clean; skippable |
| Composition | Hero photo + reserved-for guest block readable |
| Category fit | Appropriate for wedding |
| Gaps | Needs richer storytelling beats, stronger couple presentation, less “single card” feel vs flagship references |

### Premium Brand Launch — `ix3-brand-launch`

| Criterion | Assessment |
|---|---|
| Originality | Stronger — dark architectural hero, uppercase hierarchy, VIP framing |
| Typography | Modern sans; launch-appropriate |
| Motion | Cinematic gate available; restrained on shell |
| Category fit | Fashion/tech launch tone present |
| Gaps | Still lean vs Femmora flagship depth; cookie banner often obstructs first paint in demos |

### Contemporary Memorial — `ix3-memorial`

| Criterion | Assessment |
|---|---|
| Originality | Calm portrait/forest open; solemn cream field |
| Tone | Appropriate — no celebratory countdown |
| Typography | Soft serif; respectful |
| Gaps | Portrait/media reliability needed; biography depth still thin vs memorial candle family |

**Overall:** Distinct identities across the three — not recolors of one layout. Not yet at “exceptional flagship” parity with production Forever Afaris / Femmora.

---

## 4. Functional integration matrix

Tested on Direct Preview (`InvitationRenderer` only) with demo guest props.

| Capability | Wedding | Brand Launch | Memorial | Classification |
|---|---|---|---|---|
| Guest personalization | Yes (Alex Mensah) | Yes (VIP block) | Yes | Functional with limitations (demo/live props) |
| RSVP (Accept/Decline/Maybe) | Present | Present | Present (`Will you attend?`) | Fully functional (shared `InvitationRsvpPanel`) |
| Dress code | Present | Present | Optional | Fully functional when configured |
| Event schedule | Essentials timeline | Programme timeline | Memorial timeline | Functional with limitations (field-derived; **not** LIVE_PROGRAMME) |
| Countdown | Present | Present | N/A by design | Fully functional (hydrated client-side) |
| Venue maps | Maps action | Maps action | Maps action | Functional with limitations (`InvitationActions`) |
| Calendar / reminder | Present | Present | Present | Functional with limitations |
| Share control | Present | Present | Present | Functional with limitations |
| QR admission | Only if `qrDataUrl` supplied | Same | Same | Functional with limitations — **not** demoed as always-on UI |
| Seating | Not shown | Not shown | Not shown | Not implemented on shell |
| Media gallery | Cover/portrait only | Cover only | Cover/portrait | UI-only / partial |
| Background audio | Disabled in gallery | Disabled | Disabled | Compatible via DNA; not exercised here |
| Guest photo uploads / Memory Vault | Absent | Absent | Absent | Not implemented |
| Thank-you page | Absent on shell | Absent | Absent | Not implemented (DNA outro only) |

**Honesty rule:** RSVP/maps/calendar reuse platform modules. Schedule timeline and welcome copy are **not** substitutes for full programme/gallery/vault products.

**Preview caveat:** Marketplace `LiveTemplatePreview` still wraps `PremiumInviteWrapper`. Detail QA uses `Experience3DirectPreview` so shell quality is not confused with cinematic hub chrome.

---

## 5. Performance (Lighthouse)

Tooling: Playwright **Google Chrome for Testing** + Lighthouse CLI.  
URL: `http://127.0.0.1:3002/...` (**Next.js dev server**).

| Metric | Editorial Wedding (mobile form factor) |
|---|---|
| Performance score | 0.28 |
| Accessibility score | 0.95 |
| LCP | ~140 s (display) — **not credible for production acceptance** |
| FCP | ~7.4 s |
| TBT | ~3640 ms |
| CLS | 0 |
| Unused JS opportunity | ~3.5 MiB reported |
| Contrast failures | Reported (`color-contrast`) |
| Heading order | Reported — mitigated in opening gate (h1 → role=heading) |

**Interpretation:** Dev-server Lighthouse is contaminated by HMR/compile, opening gate, and remote media. **Do not treat these as production Core Web Vitals.**  
Re-run required on `next start` production build with warm cache before any release gate.

Raw JSON: `docs/invitations/studio-3/phase-3a/lighthouse-editorial-wedding.json`

---

## 6. Accessibility findings

| Finding | Severity | Status |
|---|---|---|
| Opening gate + shell both used `h1` | Medium | Fixed in ix3 opening gate |
| Countdown `Date.now()` hydration mismatch | High (flicker / recoverable error) | Fixed — mount-gated clock |
| Color contrast on some hero/muted combos | Medium | Open — needs token audit |
| Reduced-motion support on gate/countdown | Low residual | Present |
| Dialog semantics on opening gate | Pass | `role="dialog"` + skip |

---

## 7. Fixes applied during Phase 3A (ix3 only)

Safe changes limited to Experience 3.0 modules:

1. Countdown hydration — no server/client `Date.now()` mismatch  
2. Opening gate heading level — avoid dual `h1`  
3. Opening gate reduced-motion init — SSR/CSR first paint alignment  
4. Portrait open + hero media — CSS backgrounds to avoid broken `next/image` icons  
5. Wedding monogram from couple initials  

**No protected v1 layout files modified.**

---

## 8. Known limitations

- Protected visual regression **unverified** (no trustworthy baselines).  
- Live guest URL / QR / seating not exercised on production data.  
- PremiumInviteWrapper coexistence for real guest links still needs a dedicated pass.  
- Lighthouse not production-representative.  
- Cookie consent overlays frequently obstruct first-view screenshots.  
- Creative depth still below Forever Afaris / Femmora flagship bar.

---

## 9. Release blockers (before Phase 3B)

1. Establish **trustworthy protected v1 baselines** (from unchanged main/production captures) and run comparison.  
2. Re-run Lighthouse on **production `next start`** for all three references; fix payload/LCP for warm loads.  
3. Close remaining **contrast** issues on dark/light shells.  
4. Confirm guest-link path (PremiumInviteWrapper + ix3 shell) does not regress personalization/RSVP/QR.  
5. Explicit creative pass that wedding/launch/memorial meet “exceptional” bar — currently **not claimed**.

---

## 10. Recommended Phase 3B plan (do not start automatically)

Only after blockers clear:

1. Expand **new-slug** families already prototyped (heritage, birthday, gala, concert, graduation, shower) with bespoke art direction — not color swaps.  
2. Keep entire existing catalogue **PROTECTED** until usage audit authorizes reclassification.  
3. Wire Memory Vault / gallery / thank-you / share through existing modules.  
4. Studio token persistence for Experience 3.0 without UI restructure.  
5. Then category coverage: anniversaries, naming, conferences, etc.

---

## 11. Protection compliance

| Rule | Status |
|---|---|
| No protected layout edits | Observed |
| No event-record / pricing / URL / QR mutations | Observed |
| No merge to main | Observed |
| No deploy | Observed |
| No Phase 3B auto-start | Observed |

---

## Appendix — how to re-run responsive QA

```bash
# with app on :3002 (dev) or :3000 (production start)
STUDIO3_QA_BASE=http://127.0.0.1:3002 node scripts/studio3-phase3a-qa.mjs
```
