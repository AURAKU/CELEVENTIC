# Invitation Experience 3.0 — Reference Experiences

**Rule:** These are **new layout slugs**. They do not modify Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, Memorial candle, or any other historical layout.

| Layout slug | Design family | Tone | Opening |
|---|---|---|---|
| `ix3-editorial-wedding` | editorial-wedding | Light ivory / ink | Monogram (skippable) |
| `ix3-brand-launch` | brand-launch | Dark launch | Cinematic (skippable) |
| `ix3-memorial` | memorial | Solemn warm stone | Portrait (skippable, quiet motion) |

## Engineering

- Definitions: `src/lib/invitation/studio3/reference-definitions.ts`
- Components: `src/components/invitation/experience3/*`
- Registration: `register-references.ts` (imported by `invitation-renderer.tsx`)
- Shared modules reused: `InvitationRsvpPanel`, `InvitationActions`, place card / entry pass chrome from renderer

## Protection

- `classifyLayoutStatus(ix3-*)` → **ELIGIBLE**
- All existing catalogue layouts remain PROTECTED or UNKNOWN
- Protected source paths unchanged

## Not done yet

- Marketplace catalogue SKUs / pricing (requires product authorization)
- Studio picker surfacing
- Production deploy
- Exhaustive visual QA across 320–1920px (pending local preview pass)
