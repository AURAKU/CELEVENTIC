# Invitation Studio 3.0 — Implementation Status

**Last updated:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Deploy:** Not authorized — do not deploy / do not merge to `main` without explicit approval.

## Stage progress

| Stage | Status |
|---|---|
| A — Foundation | **In progress** — inventory, benchmarks, competitive research, design standard, version-isolation module |
| B — Premium reference templates (new versions) | Not started (blocked on production eligibility + renderer v2 wiring) |
| C — Remaining eligible templates | Blocked (0 ELIGIBLE until production usage query) |
| D — Studio integration | Not started |
| E — QA / performance / a11y | Partial unit tests for version isolation only |
| F — Release prep | Not started |

## Latest stage report

### 1. Work completed

- Phase 0 inventory + Phase 1 internal benchmark (prior commits).
- Phase 2 competitive benchmark from fetched public pages (Paperless Post, Partiful, Evite, Joy; Greenvelope blocked).
- Phase 3 design standard draft for **new versions only**.
- Version isolation architecture doc + `layoutVersion` field + pure helpers/tests.
- **Did not** modify protected template components or `invitation-renderer` switch paths.
- **Did not** query/write production DB; **did not** deploy.

### 2. Files changed (this continuation)

- `docs/invitations/studio-3/competitive-benchmark.md` (new)
- `docs/invitations/studio-3/design-standard.md` (new)
- `docs/invitations/studio-3/version-isolation.md` (new)
- `docs/invitations/studio-3/IMPLEMENTATION_STATUS.md` (updated)
- `src/types/invitation-design.ts` (`layoutVersion?: number`)
- `src/lib/invitation/layout-version.ts` (new)
- `src/lib/invitation/__tests__/layout-version.test.ts` (new)

### 3. Templates upgraded

None.

### 4. Templates protected

Unchanged list — Forever Afaris, Seraphine, Aurelia, Traditional Marriage, Femmora, Memorial family, plus all UNKNOWN layouts treated as protected.

### 5. Features implemented

- Version pin helpers only (no guest-visible change when `layoutVersion` omitted).

### 6–8. Tests

| Suite | Result |
|---|---|
| `src/lib/invitation/__tests__/layout-version.test.ts` | Executed this stage |

### 9. Performance findings

Not measured. No new client bundles for invites yet.

### 10. Remaining risks

1. Production usage still unverified → zero ELIGIBLE upgrades.  
2. Renderer not yet branched on `layoutVersion` (intentional until first v2 exists).  
3. Shared Aurelia/Seraphine component still couples two protected layouts.  
4. Global invite CSS remains a regression vector for any future careless edit.

### 11. Git

- Branch: `feat/invitation-studio-3`
- Commit: `578ffadc`

### 12. Recommended next stage

1. Authorized **read-only** production SQL for template/layout usage → reclassify ELIGIBLE.  
2. Wire `invitation-renderer` to `shouldUseLegacyInvitationRenderer` with **no behavior change** for v1 + unit/visual baseline.  
3. Capture protected invite screenshots.  
4. Build first **v2** reference for a conclusively unused layout (or a brand-new layout slug) — never edit v1 files.

## Explicit non-actions

- No production data writes  
- No `prisma db push`  
- No deploy / no merge to `main`  
- No edits to Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, or Memorial template sources  
