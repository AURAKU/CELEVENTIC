# Branch & Commit Reconciliation

**Date:** 2026-11-17  
**Branch:** `feat/invitation-studio-3`

## HEAD

```
a0698b2b (and later commits on this branch as work continues)
```

Verify locally with:

```bash
git rev-parse HEAD
git branch --show-current
```

## Reported commits

| Commit | Message (short) | Relationship to HEAD |
|---|---|---|
| `0c547bb9` | docs: record Studio 3.0 audit commit SHA | **Ancestor** of HEAD |
| `84e26fcc` | docs: record Experience 3.0 protection commit SHA | **Ancestor** of HEAD |

Both reported stages are included in the current branch history. There is no fork divergence: `84e26fcc` is a later commit on the same line that already contains `0c547bb9`.

Approximate distance at reconciliation time: **14+ commits** after `0c547bb9`.

## Deliverables present on HEAD (verified by path)

| Area | Present |
|---|---|
| Protected-template manifest | Yes — `protected-manifest.ts` + JSON |
| Feature parity matrix | Yes |
| Experience engine architecture docs | Yes |
| Immutable `layoutVersion` + legacy renderer split | Yes |
| Isolation / protection tests | Yes (`npm run test:invitation-studio3`) |
| Production audit SQL (not executed) | Yes — `phase-2/production-usage-audit.sql` |
| Competitive benchmark | Yes |
| Native reference layouts `ix3-*` | Yes — new slugs only |
| Capacity-copy stash | **Not restored** (`stash@{0}` remains on main WIP) |

## Stale status correction

Reports that list “Immutable layout versioning — Not implemented” are **out of date** relative to HEAD. Version isolation is implemented; production usage verification remains pending authorization.
