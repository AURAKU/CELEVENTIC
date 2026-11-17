# Invitation Experience 3.0 — Protected Template Manifest

**Machine-readable source of truth:** [`protected-template-manifest.json`](./protected-template-manifest.json)  
**Enforcement module:** `src/lib/invitation/studio3/protected-manifest.ts`  
**Version pin:** `src/lib/invitation/layout-version.ts`

## Absolute rules

1. **No in-place layout edits** — `mayModifyLayoutInPlace()` always returns `false`.  
2. **ELIGIBLE count is 0** until authorized production read-only usage proves unused layouts.  
3. **UNKNOWN ≡ treat as protected** — pending production proof.  
4. Upgrades ship only as `layoutVersion ≥ 2` or brand-new layout slugs.  
5. Protected source paths listed in the JSON must not be modified for Experience 3.0 visual work.

## Classification

| Status | Meaning | Action |
|---|---|---|
| **PROTECTED** | Proven live / seed / flagship / shared with proven | Study only; v2 registry if ever redesigned |
| **ELIGIBLE** | Conclusive zero production references | May register v2 (still no in-place v1 edit) |
| **UNKNOWN** | No conclusive proof | Same as protected until verified |

## Regenerating the JSON

```bash
npx tsx scripts/export-protected-invitation-manifest.ts
```

Or run the Experience 3.0 protection tests:

```bash
npx tsx --test src/lib/invitation/studio3/__tests__/protected-manifest.test.ts src/lib/invitation/__tests__/layout-version.test.ts
```

## Production proof still required

See SQL in `template-inventory.md`. Do not reclassify UNKNOWN → ELIGIBLE from local `prisma/dev.db` alone.
