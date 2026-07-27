# Personalised Place Card & Partial Group Admission

Extends the Guest Entry Pass system (PR #38) with two guest-facing capabilities
that share its models, services and offline package. Nothing here forks a second
pass system, and nothing here required a schema migration.

---

## 1. Personalised Place Card

A single shared implementation renders on **every** invitation template —
existing, legacy and future — because it lives in the shared invitation feature
layer rather than inside any template.

### How it renders

`InvitationRenderer` draws the place card in the common closing section, above
the Guest Entry Pass, so a guest reads:

> main invitation → **place card** → **party allowance** → RSVP/details →
> Guest Entry QR Pass → admission code & instructions

Because `/invite/[link]` is `force-dynamic`, an already-published invitation
picks up a wording, allowance or arrival change on the very next guest view. No
re-publish, no cache bust.

### Presentation

Colours, typography, border radius and the motion budget come from the
template's feature adapter (`getTemplateFeatureAdapter`), which always falls
back to `defaultFeatureAdapter`. A template that has never heard of place cards
still themes one correctly. A template that asks for `motion: "none"` overrides
the organiser's animation choice.

### Configuration

Stored as a sparse override at `Invitation.featureConfig.PLACE_CARD.config` and
resolved through the normal inheritance chain (invitation → event → platform
default). Organisers control: enable, heading, salutation, recipient display,
recipient type, group name, wording, allowance display wording, supporting
message, theme, frame style, monogram, animation, visibility, section order and
one-click presets.

Recipient types: individual, couple, plus-one, family, household, organisation,
reserved table, custom group. Unset types are inferred from the party size.

**The structured party allowance stays the source of truth.** The place card
only decides how that number is worded — it never invents one.

### Enabling it

Dashboard → Invitations → *Place card* next to any invitation. The panel writes
through `PATCH /api/invitations/:id/features` with `featureKey: "PLACE_CARD"`.

Defaults: enabled, `visibility: "when_assigned"` — so it appears on personalised
guest links and stays off generic share links until an organiser says otherwise.

---

## 2. Partial group admission

### At the gate

| Party | Behaviour |
| --- | --- |
| Allowance 1 | Admitted on scan. No prompt. |
| Allowance > 1, more than one place open | Scanner asks *"How many are arriving now?"* — a stepper plus quick-pick buttons |
| One place left | Admitted on scan. Nothing to choose. |
| Fast admission on (safe auto rule) | Remainder admitted in one tap |
| Partial arrival disabled for the event | Whole party admits together, as before |

Named members can be ticked off instead of counting; their plus-ones are folded
into the head count so the two inputs can never be double-added. Heads with no
name on the guest list are shown as unnamed companions and admitted purely as a
quantity.

The group QR stays active until the allowance is exhausted. `GuestPass.status`
moves `ACTIVE → PARTIALLY_ADMITTED → ADMITTED`; the invitation projection and
the append-only `AdmissionEvent` ledger follow.

### Concurrency

`applyPassAdmission` compare-and-swaps on `GuestPass.revision`. Two scanners
racing for the last place produce one admission and one "already admitted" — the
loser re-reads and reports the true state rather than double counting.

### Offline

The gate package is now **v2**: per-pass allowance, admitted, remaining,
members with their seats, status and a short admission history. Devices holding
a v1 package keep working — every v2 field is optional on read and derived when
absent.

Offline runs the same decision engine as the online gate, including the "how
many now?" rule, so a dark gate can never be more permissive than a connected
one. A queued record that would exceed the allowance is flagged `CONFLICT` for
organiser review on sync, never silently accepted.

---

## 3. Seating continuity

`resolveSeatingContinuity` projects a party's seat rows against how many heads
are currently inside:

- Seats are reserved for the **whole** group from the moment they are assigned.
- 2 of 3 arriving reveals exactly 2 seats; the third stays held at the same table.
- A late arrival is given the seat that was being held, not a new one.
- Table-only events (no seat labels) preserve the party's remaining table capacity.
- Missing seating degrades to an `unseatedCount` the host desk can act on — a
  party is never turned away over it.

Members admitted as a bare quantity (no names ticked) still get seats revealed
in a stable list order, so the guest is always told where to sit.

The projection is shown to the gate operator, on the invitation, and in the
post-admission portal.

---

## 4. Portal & organiser corrections

### Guest-facing portal

A part-arrived party sees admitted count, remaining places, the seats that are
live now, and the seats still being held — all in plain language. No admission
status codes ever reach a guest.

### Corrections

`POST /api/invitations/:id/admission/correct` (RBAC: `MANAGE_GUESTS`, same as
reset):

| Action | Effect |
| --- | --- |
| `undo_last` | Reverses the most recent admitting row |
| `correct_quantity` | Sets the exact number of heads inside |
| `readmit` | Admits the full allowance |
| `move_seat` | Moves one member or the whole group to another table |
| `restore_seat` | Puts a released seat back |

Reset (one / selected / all) remains at
`POST /api/invitations/:id/admission/reset`.

`GET /api/invitations/:id/admission/correct` returns the ledger.

**Every action is append-only.** A correction adds a `CORRECTION` / `READMIT` /
`RESTORE` row; the mistaken row is never deleted, so what actually happened at
the door is always reconstructable. The portal relocks only when the admitted
count returns to zero.

---

## Files

**Reused from PR #38 (unchanged in behaviour):** `GuestPass`, `AdmissionEvent`,
`EventAdmissionSettings`, `Invitation.admissionAllowance/admittedCount/
admissionState/featureConfig`, `applyPassAdmission`, `resetAdmission`,
`decideAdmission`, `EntryPassGate`, `buildOfflinePackage`,
`reconcileOfflineAdmissions`, the invitation feature registry and template
feature adapters.

**Created**

- `src/lib/invitation-features/place-card.ts` — config, presets, view model
- `src/lib/admission/seating-continuity.ts` — seat projection
- `src/components/invitation/place-card.tsx` — shared themed component
- `src/components/invitation/place-card-editor-panel.tsx` — organiser controls
- `src/services/invitation-features/place-card.service.ts` — server resolution
- `src/app/api/invitations/[id]/admission/correct/route.ts` — corrections + ledger
- Tests: `place-card.test.ts`, `partial-admission.test.ts`,
  `offline-partial-admission.test.ts`

**Modified**

- `src/lib/invitation-features/registry.ts` — `PLACE_CARD` feature key
- `src/lib/admission/pass-decision.ts` — quantity prompt, allowance/remaining
- `src/lib/admission/offline-store.ts` — v2 local projection
- `src/services/admission/admission.service.ts` — corrections + history
- `src/services/admission/guest-pass.service.ts` — seating continuity context
- `src/services/admission/offline-admission.service.ts` — package v2
- `src/components/admission/entry-pass-gate.tsx` — quantity stepper, held seats
- `src/components/invitation/invitation-renderer.tsx` — renders the place card
- `src/app/invite/[link]/page.tsx`, `.../event-day/page.tsx`
- `src/app/api/admission/admit/route.ts`
- `src/app/dashboard/invitations/page.tsx`
- `src/types/invitation-design.ts`, `src/app/globals.css`

## Verification

```bash
npm run test:admission              # 72 tests
npm run test:invitation-features    # 31 tests
npx tsc --noEmit
npm run build
```

No schema migration. No new environment variables.
