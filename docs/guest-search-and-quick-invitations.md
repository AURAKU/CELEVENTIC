# Smart Guest Search & Quick Invitations

How an organiser finds a guest, and how they add one in about four seconds.

This sits on top of the Bulk Guest Import stack in the same branch. Everything
described here creates the *same* objects a bulk import creates — there is no
separate "quick invitation" type. At the gate, on the invite page and in
analytics, a name typed into the quick form is indistinguishable from a name
pasted into a spreadsheet import.

---

## The two things an organiser actually does

### 1. Find somebody

One search box on `/dashboard/guests`. It accepts whatever the organiser has to
hand:

| They type | It matches |
| --- | --- |
| `Kofi Obuah`, `obuah kofi`, `obu` | Invitation name, in any token order |
| `Ama` | A named party member inside a couple or family invitation |
| `0244123456` | A phone stored as `+233244123456` |
| `kofi@example.com` | Guest email |
| `4821` / `482137` | Guest Entry Pass admission code |
| `table 12`, `T12`, `12` | Seating assignment |

Press `/` anywhere on the page to jump into the box.

### 2. Add somebody

A name is the only required field:

```
CREATE PERSONALISED INVITATION
Guest or invitation name *   [ Mr Kofi Obuah        ]
Number of people admitted    [ − ]  1  [ + ]  1 2 4 6 8 10
Phone (optional)             Email (optional)
[ Preview ]  [ Create Invitation ]
```

Creating yields a live link, a signed QR entry pass, an event-scoped admission
code and a place card. No phone, no email, no spreadsheet.

---

## Design decisions worth knowing

### Search runs in two stages, not one

SQLite can filter quickly but cannot rank, and cannot fold accents.

1. **Narrow** — a bounded `LIKE` query over only the fields the parsed query
   could plausibly match. On a normal event this returns everything.
2. **Widen** — if stage one came back with fewer than three hits *and* the query
   looks like a name, the event's most recent invitations are pulled (same
   ceiling) and ranked in memory.

Stage two is what makes `Adjei` find `Adjeí`. The alternative — a denormalised
`searchKey` column — was rejected because it drifts out of date behind any
write path that forgets to update it, and a guest who cannot be found at the
door is a worse failure than a slightly wider query.

Both stages are capped at `CANDIDATE_LIMIT` (300), so search cost is bounded
regardless of guest-list size.

### Ranking lives in TypeScript, not SQL

`src/lib/guest-search/query.ts` is pure: no Prisma, no network, no clock. It is
the part a bad change would hurt most, so it is unit-testable in isolation and
reused verbatim by the service and the tests.

The score bands encode one rule: **an exact credential always beats a name.** A
typed admission code is unambiguous; a name never is. Searching `4821` puts the
guest whose code is 4821 above the guest sitting at table 4821.

Ties break on recency, then name, so results do not reorder under the cursor
between keystrokes.

### Every typed token must find a home

`kofi mensah` does not match `Mr Kofi Obuah`. Token-prefix AND-matching is what
lets an organiser type a surname first without drowning in false positives.

### The allowance is a stepper, not a text field

The number decides how many people a door lets through. A mistyped `12` instead
of `2` is a problem nobody discovers until the event. Presets exist because the
honest distribution of real answers is 1, 2 and "a table".

Names are read for a suggested allowance — `Mr & Mrs Obuah` arrives as two,
`Kofi Boateng +1` as two, `Kofi Boateng (3)` as three. `The Mensah Family`
arrives as a **question**: family and group sizes are unknowable from text, so
they come back unconfirmed and the form asks rather than guessing.

### Duplicates warn, never merge

Creating a second `Kofi Mensah` is refused with HTTP 409 and the list of
possible matches until the organiser acknowledges it. Two cousins really can
share a name, so the system asks — it never silently merges or silently
duplicates.

Contact matches (same phone, same email) are treated as stronger evidence than
a shared name.

### Editing never moves the URL

`PATCH /api/invitations/:id/personalisation` changes the name, allowance and
contact details. `uniqueLink` and `slug` are untouched, so a link already
sitting in a guest's WhatsApp thread keeps working after the host fixes a
spelling. Widening the party widens the existing pass rather than minting a new
QR the guest would have to be re-sent.

### There is no delete

An invitation that has been handed out cannot be made never to have existed.

- **Archive** hides the invitation and revokes its pass. The pass row survives,
  so an old printout is politely refused at the gate instead of reading as an
  unknown QR. Always reversible.
- **Restore** reissues a *new* pass rather than reactivating the revoked one,
  and carries admitted head counts forward so a party already inside cannot
  re-enter on the replacement.
- **Revoke pass** withdraws the credential without disinviting anyone.

---

## Permissions

| Action | Requires |
| --- | --- |
| Search | `MANAGE_GUESTS` **or** `SCAN_QR` |
| Create, edit, archive, revoke | `MANAGE_GUESTS` |

Door staff can search deliberately: finding a guest whose screenshot will not
scan is the most common real use of this feature, and locking them out pushes
them back to shouting across the hall. Minting invitations is a higher bar,
because it issues a credential that opens a door.

Searches are always scoped to one event. An admission code is only unique
within an event, and cross-event results would let a member with access to one
event enumerate another. Invitation ids are never trusted on their own — the
owning event is resolved and authorised first.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/guest-search` | Search. `eventId`, `q`, `limit`, `includeArchived`, `includeGeneralPasses` |
| `POST` | `/api/invitations/quick` | Create. Returns the invitation **and** its search card |
| `POST` | `/api/invitations/quick/preview` | Dry run. Writes nothing |
| `PATCH` | `/api/invitations/:id/personalisation` | Edit in place, URL preserved |
| `POST` | `/api/invitations/:id/lifecycle` | `ARCHIVE` / `RESTORE` / `REVOKE_PASS` / `REISSUE_PASS` |

Rate limits per user and IP, per minute: search 240, preview 120, edit 90,
create 60, lifecycle 60. Search is generous because it fires per keystroke;
creation is tight because each call mints a credential and burns an admission
code from a finite space.

`POST /api/invitations/quick` returns `409` with a `duplicates` array when the
guest may already exist. Resend with `acknowledgeDuplicates: true` to proceed.

---

## Where the code lives

```
src/lib/guest-search/
  query.ts              Query parsing, ranking, highlighting  (pure)
  party-allowance.ts    Allowance rules and name suggestions  (pure)
  types.ts              Wire shapes shared by server and client
  api-auth.ts           Permission gates and rate limiting

src/services/guest-search/
  guest-search.service.ts    Two-stage search
  quick-invite.service.ts    Create, preview, edit, lifecycle

src/services/invitations/
  personalised-invitation.ts Primitives shared with the bulk importer

src/components/guest-search/
  smart-guest-search.tsx     Search box, debounce, result list
  guest-result-card.tsx      One result, overflow actions, inline edit
  quick-create-card.tsx      The create form
  party-allowance-field.tsx  Stepper and presets
```

`personalised-invitation.ts` is the important one. Both the bulk importer and
the quick form build invitations from it. If they diverged, a name typed into
the form and the same name pasted into an import would produce invitations that
behave differently at the gate — the class of bug that stays invisible until
event day.

---

## Tests

```bash
npm run test:guest-search       # 40 unit tests, no database
npm run test:guest-search-e2e   # 24 integration tests, real database
```

The unit tests cover query classification, ranking order, accent folding, phone
suffix matching, highlight ranges and allowance clamping. The load-bearing ones
assert *ordering*, not just retrieval: anyone can return the right row; what
makes this usable at a door is that the right row is first.

The integration tests cover the properties that only exist once rows are
written: a name-only guest gets a complete admissible invitation with a place
card; credentials are unique and event-scoped; a local phone number finds a
guest stored internationally; editing does not move the URL or replace the
pass; archiving withdraws the pass without deleting history; and a search never
reaches into another event.

Integration tests need a database:

```bash
DATABASE_URL="file:./test.db" npx prisma db push --skip-generate
DATABASE_URL="file:./test.db" npm run test:guest-search-e2e
```

---

## Known pre-existing failures elsewhere

`npm run test:admission-passes` reports 19 passing and 3 failing. These are
**not** caused by this work — the same three fail on a pristine `main`, and on
a pristine copy of `guest-pass.service.ts`.

All three are stale assertions in the PR #38 suite that PR #39's true partial
admission changed the semantics of:

- a dry run now reports `PARTIAL_ADMIT` where the test expects `ADMIT`
- a re-scan now asks the operator how many are arriving, returning
  `admitQuantity: 0` until confirmed, where the test expects an immediate 2
- admission reset expects a portal flag the reset path no longer sets

They deserve a focused follow-up that decides which behaviour is intended,
rather than being quietly rewritten from a search PR.

## Bug fixed on the way through

`ensureInvitationPass` always minted `tokenVersion: 1`, so issuing a pass for an
invitation that already had a revoked one violated the
`(invitationId, tokenVersion)` unique constraint and threw. Reachable in
production whenever a revoked pass was later reinstated — a replaced lost phone,
or a restored invitation. Both pass-minting paths now allocate from the highest
version ever issued, counting revoked and reissued rows, since those are kept
deliberately so an old QR is recognised and refused.
