# Invitation Studio 3.0 — Implementation Status

**Last updated:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`  
**Deploy:** Not authorized — do not deploy / do not merge to `main` without explicit approval.

## Stage progress

| Stage | Status |
|---|---|
| A — Foundation (inventory, protection, versioning design) | **In progress** — inventory + benchmark written; version isolation **not yet implemented** |
| B — Premium reference templates (new versions) | Not started |
| C — Remaining eligible templates | Blocked (0 ELIGIBLE until production usage query) |
| D — Studio integration | Not started |
| E — QA / performance / a11y | Not started |
| F — Release prep | Not started |

## This report (Phase 0 + Phase 1)

### 1. Work completed

- Created dedicated branch `feat/invitation-studio-3`.
- Inspected catalogue (`48` SKUs), layout union (`24` layouts), renderer, Prisma models, feature registry, visibility rules.
- Probed local `prisma/dev.db` (fixture only — not production).
- Documented absolute protection rule and shared-dependency risk.
- Wrote internal benchmark against Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, Memorial.

### 2. Files changed

- `docs/invitations/studio-3/template-inventory.md` (new)
- `docs/invitations/studio-3/internal-benchmark.md` (new)
- `docs/invitations/studio-3/IMPLEMENTATION_STATUS.md` (new)

### 3. Templates upgraded

None. (Correct — redesigns are blocked until version isolation + production eligibility.)

### 4. Templates protected

All proven live / benchmark layouts and every UNKNOWN layout (default PROTECTED):

- `forever-afaris-wedding`
- `seraphine-champagne-wedding`
- `aurelia-editorial-wedding`
- `traditional-marriage-ceremony`
- `luxury-fashion-flagship` (Femmora)
- `memorial-candle-tribute` family (11 SKUs)
- Plus all other catalogue layouts pending production proof

### 5. Features implemented

None in product code this stage. Documentation and architecture constraints only.

### 6–8. Tests

| Executed | Passed | Failed |
|---|---|---|
| N/A (docs-only stage) | — | — |

### 9. Performance findings

Not measured this stage. Flagship templates already lean on client media; Studio 3 must add lazy-load / CLS rules before new motion ships.

### 10. Remaining risks

1. **No visual version pin** on `Invitation.designConfig` — editing a layout file today would change live invites.  
2. **SKU ≠ layout** — birthday/corporate/funeral families share layouts; one edit fans out.  
3. **Production usage unknown** for most layouts — must run read-only VPS SQL before marking ELIGIBLE.  
4. Shared Aurelia/Seraphine component means Seraphine protection covers Aurelia file changes and vice versa unless split by version.  
5. Global invite CSS in `globals.css` is a silent regression vector.

### 11. Git

- Branch: `feat/invitation-studio-3`
- Commit: `c042288d`

### 12. Recommended next stage

**Stage A continued — Foundation engineering (still no visual redesigns):**

1. Authorized **read-only** production query for `invitation_orders.templateSlug` and `invitations.designConfig.layout`.  
2. Design + implement **immutable layout versioning** (pin existing invites to v1; Studio opt-in to v2).  
3. Baseline screenshots of protected invites (visual regression).  
4. Then Phase 2 competitive research doc (`competitive-benchmark.md`) without copying proprietary art.  
5. Only after (1)+(2): choose first **new** category reference versions (Stage B).

## Explicit non-actions

- No production data writes  
- No `prisma db push` / migrate reset  
- No deploy  
- No merge to `main`  
- No edits to Forever Afaris, Traditional Marriage, Aurelia/Seraphine, Femmora, or Memorial template sources in this stage  
