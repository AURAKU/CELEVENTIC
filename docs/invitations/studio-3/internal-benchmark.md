# Invitation Studio 3.0 — Internal Benchmark

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Rule:** Reference only. Do **not** modify these templates, assets, shared styles, or production records.

## Benchmark set

| Experience | Layout / SKU | Why it is a benchmark |
|---|---|---|
| Forever Afaris / Edwin & Lordina | `forever-afaris-wedding` | Live luxury wedding production; cinematic pages; sealed place card |
| Traditional marriage | `traditional-marriage-ceremony` | Cultural luxury stack (ceremony, journey, gallery, respond, thank-you) |
| Aurelia editorial | `aurelia-editorial-wedding` | Editorial couture / public catalogue flagship |
| Seraphine champagne | `seraphine-champagne-wedding` | Champagne wedding variant on Aurelia renderer (Kojo & Fafa) |
| Femmora flagship | `luxury-fashion-flagship` / `femmora-flagship-soft-opening` | Fashion launch / soft opening reveal |
| Memorial candle family | `memorial-candle-tribute` (+ funeral SKUs) | Dignified memorial baseline |

## Visual design (observed in code)

### Typography

- Wedding flagships combine display serifs (Cormorant / EB Garamond), scripts (Parisienne / Great Vibes), and tracked eyebrows.
- Traditional marriage uses a dedicated palette module (`traditional-marriage-palette.ts`) with gratitude eyebrow + ceremony hierarchy.
- Aurelia/Seraphine use editorial module CSS (`aurelia-editorial-wedding.module.css`) for dense long-form storytelling.
- Forever Afaris uses page modules + opening choreography (`forever-afaris-wedding-opening.tsx`, pages, intro module CSS).

### Color & finishing

- Ivory / champagne / navy / gold accents on wedding flagships; restrained metallic frames on place cards.
- Traditional marriage: peach silk / heritage luxury — not generic floral spam.
- Femmora: fashion-house brand color system via luxury-fashion experience presets.
- Memorial: solemn neutrals, candlelight / cloth motifs — celebratory motion is inappropriate here.

### Layout composition

- Mobile-first invite viewport (`invite-viewport-root`, max-width columns ~480→960).
- Clear section rhythm: cover / opening → personalization → story → schedule → venue → RSVP → pass / QR.
- Place card as a ceremonial “reserved for you” object (shared `PlaceCard` or template-owned equivalent).
- Aurelia omits shared place-card mount (template-owned personalization).

### Photography & media

- Role-typed media: `hero`, `intro`, `share`, gallery, background (`InvitationMediaAsset`).
- Layout media packs (`layout-media-identity.ts`) supply catalogue preview stock — guest uploads must win on published invites.
- Soft-intro / BEGIN gate patterns for premium openings (must not trap scroll or block details).

## Motion (observed)

| Pattern | Where | Notes |
|---|---|---|
| Opening / intro | Forever Afaris opening, soft-intro engine, Femmora curtain unveil | Must respect `prefers-reduced-motion` |
| Page / scene transitions | Aurelia journey moments, cinematic layouts | Editorial, not gamified |
| Countdown | Feature + layout engines | Category-appropriate |
| Envelope / seal | Soft-intro / embroidered envelope components | Do not autoplay audio unexpectedly |
| Gallery transitions | Template galleries + memory album hooks | Lazy-load below fold |

**Gap:** Motion quality is uneven outside the flagship layouts; many catalogue SKUs are thin skins over shared cinematic/classic shells.

## Guest functionality (capability map)

Status key: **Implemented** = wired end-to-end in flagships; **Reusable** = module exists for other layouts; **Partial** = UI or data incomplete; **Category-specific** = should not be forced everywhere.

| Capability | Status | Notes |
|---|---|---|
| Personalized greeting / place card | Implemented + reusable | `place-card` feature + adapters; capacity copy must stay exact |
| RSVP | Implemented | Shared panel + themed respond (e.g. traditional marriage) |
| Guest admission / QR pass | Implemented | Admission pass, party switch, guest pass card |
| Event schedule / programme | Partial → implemented on flagships | Not identical on every classic SKU |
| Maps / directions | Implemented | Maps utils + journey links |
| Calendar / reminders | Implemented | Smart calendar helpers |
| Countdown | Reusable / partial | Style engine per layout |
| Seating | Implemented when configured | Seat QR / lookup; omit if empty |
| Guest wishes | Implemented | Permissioned write-ups |
| Memory Vault / gallery | Implemented on supported events | Upload + public gallery tokens |
| Gifts / wallet | Implemented when campaign active | Reuse verified payment ledger — no new payment rails |
| Social share / OG cards | Implemented | Invite share + social image routes |
| Dress code | Partial | Field exists; presentation varies |
| Livestream / memorial tributes | Category-specific | Funeral family |
| Fashion lookbook / product reveal | Category-specific | Femmora / launch |

**Do not claim parity** merely because a component file exists — Studio 3 must verify persistence, guest auth, and empty states per category.

## What to copy vs what not to copy

### Copy (quality bar)

- Art direction seriousness and mobile finish of Forever Afaris / Aurelia / Traditional Marriage / Femmora.
- Composable guest modules (RSVP, pass, maps, wishes, memory) with honest empty states.
- Reduced-motion and non-blocking access to event details.

### Do not copy

- Making every category look like a luxury wedding.
- Editing shared CSS/components that Forever Afaris, Seraphine, Traditional Marriage, Femmora, or Memorial already mount.
- Porting wedding-only sections into funerals or corporate events.

## Distinctive directions for future **new versions** (not edits to v1)

| Category | Direction (Studio 3 target) | Must avoid |
|---|---|---|
| Luxury wedding | Editorial couture, cinematic open | Generic gold gradient spam |
| Traditional marriage | Cultural luxury, heritage storytelling | Costume clichés / disrespectful motifs |
| Funeral | Dignified memorial | Celebratory confetti / playful motion |
| Product / fashion launch | Reveal + lookbook | Wedding stationery aesthetics |
| Birthday | Contemporary celebration | Copying wedding place-card ceremony blindly |
| Corporate gala | Executive agenda + access | Over-ornamented romance |
| Concert | Immersive poster / lineup | Soft ivory wedding chrome |

## Shared systems to reuse (without mutating protected mounts)

- `src/lib/invitation-features/*` (feature registry, place card)
- Guest portal shell (`guest-invitation-portal.tsx`) — extend via versioned slots, not breaking changes
- Experience / soft-intro engines — new profiles, not rewriting live profiles
- Studio editor (`invitation-studio`) — add controls that persist to `designConfig` for **new** versions only

## Phase 1 conclusion

Celeventic already has world-class **reference** experiences. Studio 3 should:

1. Freeze those as immutable v1 benchmarks.  
2. Extract capability modules with category allow-lists.  
3. Ship **new** layout versions / SKUs that meet the same quality bar with distinct creative DNA.  
4. Never “improve” a shared dependency in a way that changes protected invitation pixels.
