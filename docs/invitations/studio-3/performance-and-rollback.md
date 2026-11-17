# Performance Assessment & Rollback Plan

**Date:** 2026-11-17  
**Status:** ASSESSED (no Lighthouse lab run this pass — measurements marked accordingly)

## Performance approach (Experience 3.0 native refs)

| Practice | Status |
|---|---|
| Essential info above fold without waiting for optional motion | Implemented (opening skippable; content mounts behind gate) |
| Hero image `priority` + `sizes` | Implemented in shell |
| Below-fold / optional modules data-gated | Implemented (countdown/timeline only when data exists) |
| Reduced-motion | Implemented (opening instant; countdown seconds paused) |
| No default audio on memorial / preview gallery music off | Implemented |
| CSS modules scoped to experience3 | Implemented — avoids global invite CSS edits |
| Lazy route for preview gallery | Next.js app router page split |
| Full Lighthouse / bundle audit | **NOT RUN** this pass |

## Rollback (no production deploy occurred)

If Experience 3.0 references must be disabled:

1. Remove or stop importing `register-references.ts` from `invitation-renderer.tsx`.  
2. Native layouts then resolve to `Experience3Fallback` (safe message) — **v1 legacy invites unaffected**.  
3. Optionally delete `/invitations/experience3` routes.  
4. Historical invites with omitted/`layoutVersion: 1` continue on `LegacyInvitationLayout` unchanged.  
5. No database rewrite required (version pin is JSON-optional).

## Deployment

**Not authorized.** Do not merge to `main`. Do not deploy from this branch without explicit approval.
