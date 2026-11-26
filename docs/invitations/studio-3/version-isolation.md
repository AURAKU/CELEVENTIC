# Invitation Studio 3.0 — Version Isolation Architecture

## Problem

Guest rendering keys off `InvitationDesignConfig.layout`. Multiple catalogue SKUs share one layout. Editing a layout component or shared CSS changes every invitation already pinned to that layout — including live Edwin, Seraphine, Femmora, and memorial invites.

`Invitation.featureVersion` does **not** isolate visuals.

## Solution (backward compatible)

1. Add optional `layoutVersion` on `InvitationDesignConfig`.  
2. **Omitted / `undefined` / `1` ⇒ current protected renderer path (bit-identical behavior).**  
3. `layoutVersion >= 2` ⇒ resolve from a Studio 3 registry of **new** components/assets.  
4. Existing rows need **no migration**; absence means v1.  
5. New Studio creations may opt into latest version explicitly.  
6. Never rewrite `layoutVersion` on published invites automatically.

## Module

`src/lib/invitation/layout-version.ts`

- `DEFAULT_LAYOUT_VERSION = 1`  
- `resolveLayoutVersion(design)`  
- `PROTECTED_LAYOUT_SLUGS` (proven live/benchmark layouts)  
- `isProtectedLayout(layout)`  
- `canRegisterStudio3Version(layout, version)` — rejects registering v2 that would replace v1 files in-place  
- `studio3LayoutKey(layout, version)` — registry key  

## Renderer wiring (implemented)

`invitation-renderer.tsx` uses `resolveInvitationLayoutBranch`:

- version ≤ 1 → `LegacyInvitationLayout` (extracted historical switch; protected path)
- version ≥ 2 + registry hit → Experience 3.0 component
- version ≥ 2 + no registration → `Experience3Fallback` (never silently render a different layout)

Registry: `src/lib/invitation/studio3/experience-registry.ts`.  
Native Experience 3.0 references (`ix3-*`) register on import via `register-references.ts`.  
Existing catalogue layouts remain unregistered at v2 until explicitly approved — omitted/`layoutVersion: 1` stays on legacy.

## Schema

JSON field only — **no** `prisma db push` required for the pin.  
Optional later: indexed column for analytics — separately reviewed migration.

## Rollback

Remove v2 registry entries; invites with `layoutVersion: 1` or unset continue on v1 paths.
