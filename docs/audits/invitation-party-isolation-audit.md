# Invitation-party isolation audit

**Repository:** `AURAKU/CELEVENTIC`  
**Local path:** `/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main`  
**Audit branch:** `audit/invitation-party-isolation`  
**Base commit:** `0d2fee9`  
**Auditor date:** 2026-08-04  
**Node:** 24.x (audit runs)

## Executive summary

Canonical party ownership is the **`Invitation`** row (`uniqueLink` → guests / `GuestPass` / `AdmissionEvent` / seating via `Guest.invitationId`). There is **no separate Guest Party model** for public surfaces.

**Critical FAIL found and fixed:** `?view=invite` nulled `companionHandoffHref`, which also nulled `partyAdmission`, so **View Event Access disappeared** after partial admit when guests reopened the ceremony.

**Additional FAIL found and fixed:** public memory-upload API returned an arbitrary sibling invitation’s `uniqueLink` by `eventId` order — a cross-party link leak.

Isolation unit/leakage tests pass. Admission concurrency/idempotency coverage exists and passes under `test:admission-passes`. Production deploy was **not** performed in this audit session.

---

## Canonical data model (real)

```
Event
  └─ Invitation  (party root: id, uniqueLink, name, admissionAllowance, admittedCount, admissionState)
       ├─ Guest[]            (invitationId optional FK — repair + scrub protect public surfaces)
       ├─ GuestPass[]        (invitationId required; partySize / admittedCount / code / token)
       ├─ AdmissionEvent[]   (invitationId required; append-only trail)
       ├─ InvitationGuestWish[] (invitationId optional; public list requires invite scope)
       ├─ SeatingCompanionHold / SeatingPartyPlan (invitationId required)
       └─ SeatingAssignment via Guest.seatingAssignments (no direct invitationId column)
```

**Plus-ones:** capacity under the invitation (`admissionAllowance` / `Guest.plusOnes` / `GuestPass.partySize`) — not independent invitations.

---

## Requirement traceability matrix

| Requirement ID | Requirement | Status | Evidence | Files inspected | Tests run | Test result | Defect found | Fix applied | Commit reference | Remaining risk |
|---|---|---|---|---|---|---|---|---|---|
| R-A1 | Safe git state before edits | PASS | Clean tree; no rebase/merge; HEAD=`0d2fee9` = `origin/main`; branch `audit/invitation-party-isolation` | git | n/a | n/a | none | branch created | (this branch) | none |
| R-B1 | Party A never exposes Party B (scrub) | PASS | `filterForeignPartyGuests` + unit cases OBUAH vs Akua | `party-isolation.ts`, `party-leakage.ts` | `party-isolation.test.ts`, `party-leakage.test.ts` | pass | none | none | pending | DB mislinks need repair script |
| R-B2 | Party B never exposes Party A | PASS | Same scrub suite | same | same | pass | none | none | pending | same |
| R-B3 | Shared event ≠ merged parties | PASS | Queries keyed by `uniqueLink` / `invitationId` | invite page, event-day, admission-status | party-isolation | pass | none | none | pending | admin lists are event-wide by design |
| R-B4 | Shared table ≠ invitation merge | PASS | `filterPartyOwnedRows` shared-table unit | `party-isolation.ts`, `event-companion.test.ts` | new shared-table test | pass | none | regression test | pending | layout JSON on seating token may still embed foreign guestIds |
| R-C1 | Traceability matrix exists | PASS | This document | `docs/audits/invitation-party-isolation-audit.md` | n/a | n/a | none | created | pending | must stay updated |
| R-D1 | Canonical ownership is Invitation | PASS | Schema models Invitation/Guest/GuestPass/AdmissionEvent | `prisma/schema.prisma` L464+ | n/a | n/a | no separate public Party model | documented | pending | Guest.invitationId nullable |
| R-E1 | Migrations SQLite-safe | PASS | `npm run migrations:test:sqlite` (see run log) | `prisma/migrations/**` | migrations:test:sqlite | see build section | none in this change set | none | pending | production migrate not run here |
| R-F1 | Public invite E2E ownership | PARTIAL | Invite page invitation-scoped; CTA bug fixed | `invite/[link]/page.tsx` | event-companion + admission | pass (unit) | View Event Access gated by `view=invite` | `resolvePartyAdmissionSurface` | pending | live HTTP NOT TESTED this session |
| R-F2 | No eventId-only public guest dumps | PARTIAL | Memory upload fixed; thank-you guestbook remains event-wide by design | memory-upload route, thank-you messages | n/a | n/a | memory-upload picked sibling invite | return `invitationLink: null` | pending | seating layout JSON |
| R-G1 | Unique-link resolves one party | PASS | `findUnique({ uniqueLink })` | invite page, admission-status | party-isolation | pass | none | none | pending | live negative IDs NOT TESTED |
| R-H1 | Public payload party-only | PARTIAL | Place card + event-day scrub; structural payload ≠ exact JSON shape in prompt | place-card, event-day | scrub tests | pass | none structural leak found in unit | CTA + memory fix | pending | snapshot HTTP tests incomplete |
| R-I1 | Plus-ones are capacity slots | PASS | `admissionAllowance` / pass `partySize` | schema, admission-logic | partial-admission tests | pass | none | none | pending | none |
| R-J1 | Admission state calculation | PASS | Server `getInvitationAdmission` + progress formatter | admission.service, party-isolation | partial-admission, party-isolation | pass | none | none | pending | none |
| R-K1 | Idempotent / race-safe scan | PASS | Integration races + duplicate scan | guest-pass.integration.test.ts | test:admission-passes | pass | none | none | pending | SQLite serialization limits true parallel |
| R-L1 | Partial admit keeps invitation + CTA | FAIL→PASS | Was FAIL under `?view=invite` | page.tsx, PartyAdmissionSwitch, invitation-renderer | resolvePartyAdmissionSurface tests | pass | CTA null when ceremony view | eventAccessHref + inline CTA | pending | live UI NOT TESTED |
| R-L2 | View Event Access / Back to Invitation | PARTIAL | Components exist; Back on event-day; View fixed for ceremony | party-admission-switch, event-day | unit | pass | view=invite CTA | fix + inline placement | pending | browser a11y NOT TESTED |
| R-M1 | Viewer identity (shared vs member) | PASS | `shouldDefaultToEventAccess` + viewerAdmitted | party-isolation, event-companion | tests | pass | none | none | pending | no cookie-invented identity |
| R-N1 | Live admission progress polling | PASS | no-store + focus/visibility + 12s poll while partial | admission-status route, PartyAdmissionSwitch | code inspect | n/a | none | none | pending | fake-timer tests NOT TESTED |
| R-O1 | Seating isolation | PARTIAL | Event-day invitation guests; event-seat verify uses invitation name | seating paths, event-seat verify | shared-table unit | pass | pass.displayName preferred raw | prefer invitation.name | pending | seating token layout |
| R-P1 | Scanner modal isolation | NOT TESTED | Code paths exist; no browser automation run this session | gate-scan UI | gate-scan unit | unit only | unknown live flash | none | pending | Playwright not run |
| R-Q1 | Display names stay invitation-owned | PASS | resolvePublicPartyDisplayName + entry pass | party-isolation, invite page | scrub tests | pass | none | none | pending | none |
| R-R1 | Audit scripts dry-run | PASS | Ran audit-party-isolation-live, repair dry-run, audit-admission-identity | scripts/* | dry-run | findings: missing passes on sample DB | incomplete identity on local DB | none applied | pending | do not apply to production blindly |
| R-S1 | Repair script safety | PASS | dry-run default; --apply requires --only-high | repair-party-isolation.ts | dry-run planned=0 | pass | no SQLite file backup in script itself | documented risk | pending | add explicit DB file backup before --apply on prod |
| R-T1 | Security/privacy APIs | PARTIAL | admission-status counts only; memory leak fixed | routes above | unit | pass | memory invite link | fixed | pending | seating layout guestIds |
| R-U1 | Performance / no event-wide public guests | PARTIAL | Invite loaders invitation-scoped | invite page | n/a | n/a | none new | none | pending | N+1 not profiled |
| R-V1 | Automated isolation suite | PASS | npm run test:admission (minus pre-existing vitest orphan) | __tests__ | 182 pass / 1 pre-existing fail | companion-studio needs vitest | none from this work | pending | exclude or migrate companion-studio |
| R-W1 | Responsive / mobile UI | NOT TESTED | No Playwright/browser pass this session | PartyAdmissionSwitch | n/a | n/a | unknown | inline placement added | pending | browser verification |
| R-X1 | Build + .next/BUILD_ID | PASS | `npm run build` exit 0; BUILD_ID=`VopvacLpygd28vHM5EPkD` | package.json, .next/BUILD_ID | build | pass | none | none | pending | — |
| R-Z1 | Commit + push | (see final) | git | n/a | n/a | — | — | pending | no force push |
| R-AA1 | Production deploy | NOT TESTED | Not authorized/executed in this session | deploy scripts | n/a | n/a | — | prepare only | n/a | live smoke required |

---

## Incorrect queries found

1. **`src/app/invite/[link]/page.tsx`** — `partyAdmission` required `companionHandoffHref`, which was null under `preferInviteCeremony` → CTA missing.
2. **`src/app/api/public/memory-upload/[token]/route.ts`** — `invitation.findFirst({ where: { eventId } })` returned a sibling party link.
3. **`src/app/api/event-seat/verify/route.ts`** — preferred raw `GuestPass.displayName` without invitation label preference.

## Corrected queries / logic

1. `resolvePartyAdmissionSurface` — Event Access CTA uses `eventAccessHref` even when auto-handoff is off.
2. Memory upload returns `invitationLink: null` (event-scoped token).
3. Event-seat verify prefers `invitation.name`, filters guests by invitationId.

## Components changed

- `party-admission-switch.tsx` — `placement: fixed | inline`
- `invitation-renderer.tsx` — inline CTA above QR
- `premium-invite-wrapper.tsx` — hide fixed banner on portal (inline owns it); ceremony always plays
- `forever-afaris-wedding-opening.tsx` — reduced motion still shows gate
- `guest-invitation-portal.tsx` / types — thread `partyAdmission`

## Migrations

No new migrations in this remediation. Existing SQLite migration suite exercised via `migrations:test:sqlite`.

## Audit / repair script results (local DB, redacted)

- Isolation findings: 3× `invitation_missing_live_pass` (incomplete identity — not cross-party mix).
- Repair dry-run: `planned: 0`.
- No production apply.

## Viewer identity (documented)

| Mode | Behavior |
|------|----------|
| Shared party link | Stay on invitation while `remainingCount > 0`; Event Access when `admittedCount > 0` |
| Member `?guest=` token | `viewerAdmitted` drives default companion jump |
| Ceremony reopen | `?view=invite` — no auto-handoff; CTA still available |

---

## Production deploy (prepared, not executed)

```bash
# On VPS only, Celeventic process only — never pm2 restart all / Spark & Drive
cd /var/www/CELEVENTIC && bash scripts/deploy-vps.sh
```

**Rollback:** restore previous `.next` + PM2 restart `celeventic` only; restore SQLite backup taken before migrate.

## Remaining risks

1. Public seating token may still return plan `layout` with foreign `guestIds` (structural).
2. Repair script lacks automatic filesystem SQLite backup before `--apply`.
3. Browser/responsive and live smoke: NOT TESTED this session.
4. Pre-existing `companion-studio.test.ts` imports missing `vitest` under `tsx --test`.
