# Invitation Studio 3.0 — Competitive Benchmark

**Research date:** 2026-11-17 (Phase 2 Workstream C refresh)  
**Branch:** `feat/invitation-studio-3`  
**Method:** Public marketing pages + published product positioning. No competitor accounts were created; no proprietary artwork, templates, or source were copied.  
**Status:** VERIFIED for publicly fetchable pages listed below; PARTIAL where blocked.

## Verified observations (public pages)

| Platform | URL fetched | HTTP | Public positioning observed |
|---|---|---|---|
| Paperless Post | https://www.paperlesspost.com/ | 200 | Free + premium invitation templates; strong wedding catalogue taxonomy (weekend, brunch, thank-you, announcements); card-style invitation framing |
| Partiful | https://www.partiful.com/ | 200 | Free online invitations with **guest RSVP tracking**; social/ co-host oriented product language |
| Evite | https://www.evite.com/ | 200 | Online invitations + event pages + greeting cards; meta copy emphasizes send invites, **track RSVPs**, hosting tools |
| Joy | https://withjoy.com/ | 200 | Wedding websites, registry, **RSVP & planning** suite (broader than a single invite card) |
| Greenvelope | https://greenvelope.com/ | 403 | Cloudflare challenge blocked automated fetch this pass — **not verified here** |

### Cross-cutting patterns (verified from public messaging)

1. **Template originality** — Large themed catalogues (wedding sub-occasions on Paperless Post; broad categories on Evite).  
2. **Customization** — Implied editor/customise flows on all major players (depth not verified without account).  
3. **Mobile-first** — Homepages are responsive; mobile invite UX not audited in a device lab this pass.  
4. **Motion** — Marketing sites use contemporary web motion; invite-open choreography not inspected behind auth.  
5. **RSVP** — Explicit for Partiful, Evite, Joy; Paperless Post historically RSVP-capable (account-gated detail not verified today).  
6. **Guest personalization** — Public pages emphasize guest lists / RSVP tracking more than ceremonial place-card storytelling.  
7. **Guest management** — Partiful/Evite/Joy lean into host tooling (tracking, planning).  
8. **Sharing / social** — Implied shareable links and event pages (Evite “event pages”).  
9. **Accessibility / performance** — Not measured (no Lighthouse run this pass).  
10. **Event-specific depth** — Joy expands into registry/planning; others stay invitation-centric.

## Inspiration categories (non-competitor)

Study principles only — do not reproduce proprietary campaigns:

- Luxury editorial sites: typography hierarchy, whitespace, photography crop discipline  
- Fashion campaigns: reveal pacing, lookbook grids, restrained motion  
- Product launches: countdown + cinematic hero without trapping content  
- Motion systems: purposeful entrances, `prefers-reduced-motion` fallbacks  

## Celeventic advantages (existing product — not aspirational fiction)

Already present in Celeventic flagships (see `internal-benchmark.md`):

- Ceremony-grade **place cards** with exact admission capacity  
- **QR admission** + party isolation  
- Memory Vault, wishes, gifts (when configured)  
- Soft-intro / cinematic openings on premium layouts  
- Studio editor + marketplace catalogue  

Competitors publicly emphasize RSVP tracking and catalogue breadth; Celeventic’s gap is **uneven quality across non-flagship catalogue SKUs**, not absence of an invitation platform.

## Proposed Celeventic innovations (proposals — not shipped)

| Innovation | Why | Constraint |
|---|---|---|
| Immutable layout versions (v1 pin / v2 opt-in) | Protect live Edwin/Seraphine/Femmora/Memorial invites | Must ship before redesigns |
| Category-distinct creative DNA | Avoid “every invite looks like a wedding” | New versions only |
| Capability modules with category allow-lists | Feature parity without cloning wedding UI into funerals | No fake controls |
| Exact-capacity guest language | Clearer than “plus-one” ambiguity | Already started in place-card copy on other branch |

## What we will not do

- Copy competitor card designs, animations, illustration packs, or branding  
- Scrape gated template HTML/CSS  
- Claim accessibility/performance wins without measurements  

## Competitor comparison matrix (public evidence)

| Dimension | Paperless Post | Partiful | Evite | Joy | Greenvelope | Celeventic opportunity |
|---|---|---|---|---|---|---|
| Invitation presentation | Card catalogue | Social event pages | Cards + event pages | Wedding site suite | (blocked) | Ceremonial microsite depth already in flagships |
| Opening interactions | Marketing-level | Light | Light | Site onboarding | — | Skippable cinematic openings (Experience 3.0) |
| RSVP | Positioned | Explicit tracking | Explicit tracking | Planning + RSVP | — | Already strong; unify presentation across layouts |
| Guest personalization | Guest list framing | Co-host / social | Host tools | Couple-centric | — | Place card + QR + exact capacity |
| Sharing | Implied | Strong social | Event pages | Wedding share | — | Invite share + CeleYou already present |
| Mobile UX | Responsive marketing | Mobile-first product | Responsive | Responsive | — | Must remain mobile-first for v2 |
| Customization | Template editor (account) | Limited public detail | Editor (account) | Site builder | — | Extend Studio without replacing it |
| Accessibility / perf | Not measured | Not measured | Not measured | Not measured | — | Require reduced-motion + lazy media on v2 |
| Distinctive depth | Catalogue breadth | Social RSVP | Mass market | Registry/planning | — | Admission security + ceremonial storytelling |

## Original opportunities (PROPOSED)

1. **Immutable layout versions** so upgrades never mutate live invites.  
2. **Category-intelligent section packs** (wedding ≠ memorial ≠ launch).  
3. **Admission-grade personalization** (QR + party isolation) presented with editorial craft.  
4. **Studio-configurable openings** that remain skippable and reduced-motion safe.  

## Phase 2 conclusion

Market leaders win on **catalogue breadth + RSVP/host tooling**. Celeventic can lead on **bespoke ceremonial depth + admission security**, if Experience 3.0 upgrades unused layouts via **new versions** without touching protected live experiences.
