# Invitation Studio 3.0 — Design Standard (new versions only)

**Status:** Draft standard for **layoutVersion ≥ 2** experiences.  
**Does not apply retroactively** to protected v1 layouts.

## Principles

Every new template version must feel: bespoke, authentic, premium, emotionally engaging, art-directed, mobile-first, polished, distinctive, accessible, and fast.

### Avoid

- Generic “AI brochure” grids  
- Decorative flower spam, default gold gradients, fake foil everywhere  
- Identical wedding aesthetics forced onto funerals, corporate, or launches  
- Nonfunctional buttons or placeholder guest data  

### Prefer

- Typography + composition + real photography  
- Category-appropriate restraint  
- Purposeful motion with static fallback  
- Honest empty states (omit section if data missing)

## Token layers

Tokens live **scoped per layout version** (CSS modules / data attributes). Do not leak into global `.invite-*` rules used by v1.

| Token group | Examples | Notes |
|---|---|---|
| Typography | `--inv3-font-display`, `--inv3-font-script`, `--inv3-font-body`, `--inv3-font-eyebrow` | Load only fonts used |
| Color | `--inv3-ink`, `--inv3-paper`, `--inv3-accent`, `--inv3-mute` | WCAG contrast for text |
| Spacing | `--inv3-space-1…8` | 4px base scale |
| Radius / border | `--inv3-radius-sm/md/lg`, `--inv3-stroke` | |
| Shadow | `--inv3-elev-1/2` | Soft, not muddy |
| Motion | `--inv3-ease`, `--inv3-dur-fast/med/slow` | Honor `prefers-reduced-motion` |
| Breakpoints | 375 / 640 / 800 / 960 | Match invite viewport shell |
| Density | `compact` / `editorial` / `ceremonial` | Category presets |
| Interactive | hover / focus-visible / pressed / disabled | Keyboard first |

## Motion rules (v2+)

1. Never block reading event details.  
2. No unexpected audio autoplay.  
3. No scroll traps.  
4. No continuous GPU-heavy loops on mobile.  
5. Always provide reduced-motion static path.

## Capability modules (quality parity, not clones)

Modules declare category allow-lists (see future `src/lib/invitation/studio3/capabilities`).  
Financial modules reuse existing gift/payment infrastructure only.

## Category creative north stars

Documented targets for **new** versions — not instructions to edit v1:

| Category | Creative north star |
|---|---|
| Wedding | Luxury editorial / cinematic open |
| Traditional marriage | Cultural luxury / heritage storytelling |
| Funeral | Dignified memorial |
| Corporate | Executive elegance |
| Product / fashion launch | Reveal + lookbook |
| Birthday | Contemporary celebration |
| Concert | Immersive poster / lineup |

## Acceptance for any new version

- Distinctive vs wedding flagships  
- Mobile Safari + Android Chrome friendly  
- Studio controls persist to `designConfig`  
- Protected v1 screenshots unchanged  
