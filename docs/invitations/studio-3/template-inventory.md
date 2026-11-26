# Invitation Studio 3.0 — Template Inventory

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Scope:** Phase 0 discovery only. No production mutations. No template visual changes.

## Absolute protection rule

Existing published / live invitations must remain completely unchanged — including shared CSS, components, assets, and configuration that would indirectly alter them.

**Default classification is PROTECTED.**  
A template is **ELIGIBLE** only when production evidence conclusively shows zero event, invitation, order, or historical references. Local fixtures alone are never sufficient.

## Architecture findings (verified in repo)

| Concern | Finding | Implication |
|---|---|---|
| Catalog SKUs | `src/lib/invitation-mvp/catalogue.ts` → `CATALOG_TEMPLATES` (**48** SKUs) | Public marketplace identity |
| Runtime layouts | `InvitationDesignConfig.layout` (`src/types/invitation-design.ts`) — **24** layout slugs | Guest render key |
| Many SKUs share one layout | e.g. 5 Birthday SKUs → `neon-celebration-party`; 11 Funeral SKUs → `memorial-candle-tribute` | Editing a layout changes every SKU on that layout |
| Renderer | `src/components/invitation/invitation-renderer.tsx` switch / cinematic path | Shared entry for all guest invites |
| Orders | `InvitationOrder.templateSlug` → `InvitationCatalogTemplate.slug` | Studio purchase / create funnel |
| Invitations | `Invitation.designConfig` JSON (`layout`, theme, media, experience) | Live guest experience |
| Feature version | `Invitation.featureVersion` exists for feature flags | **Not** a visual template version |
| Visual version isolation | **Not implemented** today | Must build immutable layout/version resolution **before** any redesign |
| Catalog DB overlay | `InvitationCatalogTemplate` + visibility (`listed` / hidden / revealed) | Browse can hide SKUs; direct links still resolve |

### Immutable versioning (required before redesigns)

Recommended shape (to implement in Stage A — not yet shipped):

```
layoutSlug + visualVersion  →  component / CSS / assets
Invitation.designConfig.layoutVersion (or equivalent) pins existing invites
New Studio picks = opt-in to latest version only
```

Prefer **new versions** over editing v1 files used by live events.

## Evidence sources used

| Source | Used for | Limit |
|---|---|---|
| Code references (`edwin-published-design`, deploy seeds, renderer special cases) | Confirmed live / benchmark layouts | Strong |
| Local `prisma/dev.db` | Sample references only | **Not** production |
| Production SQLite on VPS | **Not queried this pass** (no authorized read-only session in this audit) | Until queried, non-proven layouts stay **UNKNOWN → PROTECTED** |

### Local `prisma/dev.db` (fixture only)

| Key | Count |
|---|---|
| `invitation_orders` by `templateSlug` | `memorial-candle-tribute` × 1 |
| `invitations.designConfig.layout` | `seraphine-champagne-wedding`, `memorial-candle-tribute`, `forever-afaris-wedding` (1 each) |

### Code / ops evidence of live or seed usage

| Layout / SKU | Evidence |
|---|---|
| `forever-afaris-wedding` | Edwin & Lordina published design (`edwin-published-design.ts`); deploy smoke `/invitations/templates/forever-afaris-wedding` |
| `seraphine-champagne-wedding` | Deploy seed Kojo & Fafa (`layout: seraphine-champagne-wedding`); catalog defaults `listed: false` but still resolvable |
| `aurelia-editorial-wedding` | Public catalogue flagship; shared renderer with Seraphine |
| `traditional-marriage-ceremony` | Dedicated template stack; place-card / renderer special cases |
| `luxury-fashion-flagship` / `femmora-flagship-soft-opening` | Femmora flagship experience + media/music presets |
| `memorial-candle-tribute` (+ family SKUs) | Funeral layout family; local order; live funeral invites exist in production ops history |

## Summary counts

| Metric | Count |
|---|---|
| Catalog SKUs | 48 |
| Unique layouts | 24 |
| Categories present | Wedding (25), Funeral (11), Birthday (5), Corporate (5), Lunch/Femmora (1), Private Event (1) |
| PROTECTED (proven or shared with proven) | All SKUs on proven layouts + all UNKNOWN |
| ELIGIBLE (conclusively unused in production) | **0** until production read-only usage query |
| UNKNOWN | All layouts without production proof — treated as PROTECTED |

## Layout inventory (upgrade unit)

Eligibility is evaluated at **layout** level because that is what guests render.

| Layout | Catalog SKUs | Category | Usage status | Evidence | Shared dependencies | Upgrade eligibility | Risk |
|---|---|---|---|---|---|---|---|
| `forever-afaris-wedding` | forever-afaris-wedding | Wedding | **PROTECTED** | Edwin live design + deploy | Dedicated template files + shared place-card / portal | No — protect v1; any work = **v2 only** | Critical |
| `seraphine-champagne-wedding` | seraphine-champagne-wedding | Wedding | **PROTECTED** | Kojo & Fafa seed/live | Shares `AureliaEditorialWeddingTemplate` with Aurelia | No — v2 only | Critical |
| `aurelia-editorial-wedding` | aurelia-editorial-wedding | Wedding | **PROTECTED** | Public flagship + shared component with Seraphine | Aurelia module CSS, experience DNA | No — v2 only | Critical |
| `traditional-marriage-ceremony` | traditional-marriage-ceremony | Wedding | **PROTECTED** | Benchmark suite + renderer special cases | Own ceremony/journey/gallery/respond stack | No — v2 only | Critical |
| `luxury-fashion-flagship` | femmora-flagship-soft-opening | Lunch | **PROTECTED** | Femmora preset / experience | `luxury-fashion/*` + soft-intro / media | No — v2 only | Critical |
| `memorial-candle-tribute` | 11 funeral SKUs | Funeral | **PROTECTED** | Layout family for funerals; local + production funeral traffic | Cinematic funeral path / shared memorial components | No until version pin; then **new version** only | Critical |
| `classic-gold` | classic-gold, gilded-vows, gilded-opulence-pages | Wedding | **UNKNOWN → PROTECTED** | Default renderer fallback | `classic-gold.tsx`, cinematic siblings | Blocked pending production query | High |
| `arch-green` | arch-green, emerald-promise, emerald-cathedral | Wedding | **UNKNOWN → PROTECTED** | — | Shared layout component | Blocked | High |
| `kente-heritage-union` | kente-heritage-union, kente-court, kente-royale-pages | Wedding | **UNKNOWN → PROTECTED** | Cultural wedding family | Shared layout | Blocked | High |
| `luxury-rings` | luxury-rings | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `rustic-lace` | rustic-lace | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `boho-hexagon` | boho-hexagon | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `floral-garden` | floral-garden | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `passport-luxe` | passport-luxe | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `glass-acrylic` | glass-acrylic | Wedding | **UNKNOWN → PROTECTED** | — | Own template | Blocked | Medium |
| `royal-emerald-wedding` | royal-emerald-wedding | Wedding | **UNKNOWN → PROTECTED** | Cinematic family | `CinematicTemplate` | Blocked | High |
| `midnight-velvet-reception` | midnight-velvet-reception | Wedding | **UNKNOWN → PROTECTED** | Cinematic | `CinematicTemplate` | Blocked | High |
| `floral-garden-romance` | floral-garden-romance | Wedding | **UNKNOWN → PROTECTED** | Cinematic | `CinematicTemplate` | Blocked | High |
| `passport-destination-wedding` | passport-destination-wedding | Wedding | **UNKNOWN → PROTECTED** | Cinematic | `CinematicTemplate` | Blocked | High |
| `crystal-acrylic-luxury` | crystal-acrylic-luxury | Wedding | **UNKNOWN → PROTECTED** | Cinematic | `CinematicTemplate` | Blocked | High |
| `golden-islamic-nikkah` | golden-islamic-nikkah | Wedding | **UNKNOWN → PROTECTED** | Cinematic | `CinematicTemplate` | Blocked | High |
| `neon-celebration-party` | 5 birthday SKUs | Birthday | **UNKNOWN → PROTECTED** | Shared birthday layout | One layout for all birthday SKUs | Blocked; redesign = new layout version | High |
| `corporate-prestige-summit` | 5 corporate SKUs | Corporate | **UNKNOWN → PROTECTED** | Shared corporate layout | One layout for summit/boardroom/launch/investor/keynote | Blocked | High |
| `custom-media` | custom-media | Private Event | **UNKNOWN → PROTECTED** | Organizer canvas | Media-driven | Blocked | Medium |

### Categories missing from catalogue today

Graduation, baby shower, standalone concert/festival (beyond birthday “concert-night-bash” SKU), and dedicated product-launch **layouts** are not first-class catalogue categories yet — corporate SKUs currently reuse `corporate-prestige-summit`. Studio 3 may add **new** layout versions / SKUs without touching protected ones.

## Shared dependency risk map

Changing any of these without version isolation can alter protected invites:

- `src/components/invitation/invitation-renderer.tsx`
- `src/components/invitation/place-card.tsx` + `src/lib/invitation-features/place-card.ts`
- `src/components/guest-portal/*` (portal chrome, pass card, RSVP shell)
- `src/components/invitation/templates/cinematic-template.tsx` + cinematic CSS
- `src/components/invitation/templates/aurelia-editorial-wedding.tsx` (+ module CSS) — Seraphine + Aurelia
- Global invitation CSS in `src/app/globals.css` (invite-viewport, place-card, etc.)
- Soft-intro / experience engine (`src/lib/experience*`, `src/lib/experience-engine*`)
- Admission / QR guest pass components

## Required production read-only query (next audit step)

Run on VPS SQLite **read-only** (no writes):

```sql
-- Orders by catalog SKU
SELECT templateSlug, COUNT(*) AS orders
FROM invitation_orders
GROUP BY templateSlug
ORDER BY orders DESC;

-- Live invitation layouts
SELECT json_extract(designConfig, '$.layout') AS layout, status, COUNT(*) AS invites
FROM invitations
WHERE designConfig IS NOT NULL
GROUP BY 1, 2
ORDER BY invites DESC;
```

Reclassify UNKNOWN → ELIGIBLE only when **both** queries show zero references **and** no historical archive / analytics binding exists.

## Phase 0 conclusion

1. **Do not redesign any current layout file used by live invites.**  
2. **Implement visual version isolation first.**  
3. **Zero ELIGIBLE upgrades** until production usage is verified.  
4. Benchmarks to study (read-only): Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, Memorial candle family.
