# Invitation Experience 3.0 — Feature Parity Matrix

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Rule:** Reuse working platform modules. Do not rebuild or fake UI for unsupported backends.

## Legend

| Status | Meaning |
|---|---|
| **Shipped** | Live in guest / studio / admin paths today |
| **Partial** | Exists for some layouts / entitlements only |
| **Missing** | Not implemented; Experience 3.0 may add via authorized APIs |
| **Studio-config** | Needs creator controls without code changes |
| **Engine-ready** | Covered by Experience Engine contracts; wire into v2 templates |

---

## A. Guest-facing functional modules

| Capability | Platform source | Forever Afaris | Traditional Marriage | Aurelia / Seraphine | Femmora | Memorial family | Generic / cinematic layouts | Experience 3.0 plan |
|---|---|---|---|---|---|---|---|---|
| Event title / hosts / date | Invitation + event models | Shipped | Shipped | Shipped | Shipped | Shipped | Shipped | Reuse |
| Venue + maps | `MAP_DIRECTIONS`, maps utils | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Module adapter |
| Schedule / ceremonies | Layout-specific + `LIVE_PROGRAMME` | Partial | Shipped (multi) | Partial | Partial | Shipped (service) | Missing / partial | Category modules |
| Dress code | Template copy / design config | Partial | Partial | Partial | Partial | Partial | Missing | Config field + module |
| Personalized guest name | Guest identity / invite token | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse; never invent |
| Place card | `PLACE_CARD` | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse |
| RSVP | `RSVP` + party slots | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse entitlements |
| Guest QR / entry pass | `ENTRY_PASS` / admission | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse; no URL/QR mutation |
| Party admission | `PARTY_ADMISSION` | Shipped | Shipped | Shipped | Partial | Partial | Partial | Reuse |
| Seating reveal | `SEATING_REVEAL` | Shipped | Shipped | Shipped | Missing | Partial | Partial | Reuse post-admission |
| Memory / photo vault | `MEMORY_VAULT` | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse uploads |
| Gift / contributions | `GIFT_WALLET` | Partial | Partial | Shipped | Missing | N/A / off | Missing | Category-gated |
| Audio / music | `AUDIO` + music identity | Shipped | Shipped | Shipped | Shipped | Partial (solemn) | Partial | Engine audio director |
| Opening / reveal | Experience Engine + layout | Shipped | Shipped | Shipped | Shipped | Shipped | Partial | Configurable openings |
| Countdown | `COUNTDOWN` | Shipped | Shipped | Shipped | Partial | Off / subtle | Partial | Category-appropriate |
| Announcements | `ANNOUNCEMENTS` | Partial | Partial | Partial | Partial | Partial | Missing | Reuse when enabled |
| Thank-you / outro | Layout + experience outro | Shipped | Shipped | Partial | Partial | Shipped | Missing | Engine outro |
| Social share | invite-share / CeleYou | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse |
| Guest help | `GUEST_HELP` | Shipped | Shipped | Shipped | Partial | Shipped | Partial | Reuse |

---

## B. Experience / motion layer

| Capability | Status | Notes |
|---|---|---|
| Soft intro / envelope ceremony | **Shipped** (`experience-engine`, `experience/*`) | Flagships use dedicated contracts |
| Reveal mechanics registry | **Shipped** | Do not break live envelope contracts |
| Motion language profiles | **Shipped** | Map to Experience 3.0 design families |
| Reduced-motion support | **Partial** | Required for every v2 opening |
| Skip / replay opening | **Partial** | Must be universal on v2 |
| Parallax / drift | **Shipped** | Use sparingly; category-gated |
| Background audio director | **Shipped** | Never autoplay without gesture |
| Preview mode (no guest side effects) | **Shipped** | Marketplace demos must use this |

---

## C. Studio / creator customization

| Control | Status | Experience 3.0 |
|---|---|---|
| Colors / theme tokens | Partial | Expand via versioned experience config |
| Typography | Partial | Design-family tokens; no global CSS edits |
| Media upload / crop | Shipped (uploads stack) | Prefer upload over raw URL |
| Section order | Partial / layout-hardcoded | Experience config section list |
| Motion preset selection | Partial | Studio maps → engine motion languages |
| Opening style selection | Partial | Opt-in per v2 template |
| Feature enablement | Shipped (`GuestFeatureKey` overrides) | Reuse inheritance chain |
| Marketplace thumbnail / preview | Partial | Upgrade demos for ELIGIBLE v2 only |

---

## D. Gaps vs master directive (do not fake in UI)

| Requested capability | Backend today | Action |
|---|---|---|
| Guest-specific seating on public invite | Post-admission only | Keep gate; never leak |
| Conditional content by guest tier | Partial (features / party) | Extend with entitlements, not hardcode |
| Multi-location dress codes | Missing as first-class model | Add config schema before UI |
| Creator marketplace payout / pricing changes | Existing commerce | **Out of scope** without authorization |
| Silent migration of live invites to new visuals | Intentionally absent | Forbidden |

---

## E. Parity conclusion

1. **Functional modules largely exist** via `GuestFeatureKey` + admission + portal — Experience 3.0 should **adapt presentation**, not fork business logic.  
2. **Cinematic / opening infrastructure exists** — extend with versioned design families; do not rewrite flagship contracts.  
3. **Largest gaps:** category-intelligent section packs, Studio creative controls for motion/openings, and conclusive **ELIGIBLE** layouts after production proof.  
4. **Zero template redesigns** until eligibility is proven and v2 registry is wired.
