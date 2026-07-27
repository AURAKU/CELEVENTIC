# Guest Entry Pass — QR Admission, Manual Codes & Offline Gate

The Guest Entry Pass is the admission artefact a guest sees at the bottom of a
published invitation: one signed QR, one human-readable admission code, and a
party allowance the gate can never exceed. It works online, offline, from a
printout, and from a screenshot.

This document is the operator + engineer runbook: architecture, settings,
deploy, and rollback.

---

## 1. Architecture

```
Invitation  ──1:1──▶  GuestPass  ──▶  QrScan (audit)
                          │
                          ├──▶ AdmissionEvent (append-only ledger)
                          ├──▶ Invitation.admittedCount / admissionState (projection)
                          └──▶ OfflineCheckin (queued gate records)

Event  ──1:1──▶  EventAdmissionSettings (policy)
```

The pass layer is **additive** on top of the existing `QrCode` / `QrScan` gate
stack. Legacy per-guest and per-ticket QR codes keep working unchanged; the
pass is the invitation-level artefact that supersedes them when
`qrAdmissionEnabled` is on.

### One decision engine, two runtimes

`src/lib/admission/pass-decision.ts` is a pure function. The server calls it
inside the admit transaction, and the browser calls the same function against
the cached offline package. An offline gate therefore can never be more
permissive than the online one — the only difference is that an offline
admission is queued and reconciled later.

### Files

| Concern | Path |
| --- | --- |
| Token minting / verification / hashing | `src/lib/admission/pass-token.ts` |
| Client-safe token format helpers | `src/lib/admission/pass-token-format.ts` |
| Admission code policy (4 vs 6 digit) | `src/lib/admission/pass-code.ts` |
| Decision engine (pure) | `src/lib/admission/pass-decision.ts` |
| Settings defaults + resolution | `src/lib/admission/admission-settings.ts` |
| Offline IndexedDB store | `src/lib/admission/offline-store.ts` |
| Pass lifecycle (issue/regenerate/revoke/admit) | `src/services/admission/guest-pass.service.ts` |
| Atomic admission writer + projection | `src/services/admission/admission.service.ts` |
| Offline package + reconciliation | `src/services/admission/offline-admission.service.ts` |
| Guest-facing pass | `src/components/admission/guest-entry-pass.tsx` |
| Gate UI | `src/components/admission/entry-pass-gate.tsx` |
| Organiser settings | `src/components/admission/admission-settings-panel.tsx` |
| Backfill | `scripts/backfill-guest-passes.ts` |

### API

| Route | Method | Permission | Purpose |
| --- | --- | --- | --- |
| `/api/admission/admit` | POST | `SCAN_QR` | Scan or type a code; `dryRun` previews |
| `/api/admission/passes` | POST | `MANAGE_GUESTS` | Issue / bulk-issue / regenerate / revoke |
| `/api/admission/offline` | GET/POST | `SCAN_QR` | Download package; register device; sync |
| `/api/admission/conflicts` | GET/POST | `MANAGE_GUESTS` | Review + resolve offline conflicts |
| `/api/admission/pass-image` | GET | signed token | Branded pass QR (PNG/SVG) |
| `/api/events/[id]/admission-settings` | GET/PUT | `VIEW_EVENT` / `EDIT_EVENT` | Event policy |

---

## 2. Security model

**Token.** `cvp1.<22-char nonce>.<22-char HMAC tag>` — 128 bits of entropy, no
database identifier anywhere in the payload. The tag is verified before the
database is touched, so forged QRs cost nothing.

**At rest.** Only `sha256(token)` is stored (`GuestPass.tokenHash`, unique). The
token is re-derived on demand from the public `tokenNonce` plus
`ADMISSION_PASS_SECRET`. A database dump alone cannot mint a working pass.

**Codes.** Compared with `timingSafeEqual`. Rate limited per event + operator +
IP using the event's own `manualCodeAttemptLimit` / window. Every attempt,
successful or not, is written to `QrScan`.

**Concurrency.** Admission is a compare-and-swap on `GuestPass.revision` inside
a transaction. Two scanners racing the same pass produce exactly one admission;
the loser re-reads and reports the true state.

**Offline.** The package carries hashes, never tokens. An offline record that
would exceed the allowance is flagged `CONFLICT` for organiser review — never
silently accepted. Sync is idempotent on a client-generated `clientRecordId`.

**Regeneration.** The previous pass row becomes `REISSUED` rather than being
deleted, so an old printout reads as "replaced — ask for the new one" instead
of "unknown QR". Admitted heads carry forward so a reissue cannot let a party
in twice.

---

## 3. Event settings

All settings live on `EventAdmissionSettings` and are edited from
**Dashboard → QR Admission → Admission settings**. Every field has a safe
default; an event that never opens the panel behaves exactly as it did before
this feature shipped.

`qrAdmissionEnabled` is the master switch and defaults to **off**. Turning it
on back-fills passes for every existing invitation on that event.

Key policies:

- **`duplicatePolicy`** — `BLOCK` (default) / `WARN` / `ALLOW` on a repeat scan.
- **`allowPartialArrival`** — admit part of a party now, the rest later.
- **`allowReEntry` + `reEntryWindowMinutes`** — re-entry without inflating counts.
- **`portalUnlockPolicy`** — `ON_FIRST_ADMISSION` (default) / `ON_FULL_ADMISSION` / `MANUAL`.
- **`hideSeatingUntilAdmitted`** — table and seat stay hidden until scanned in.
- **`validityLeadHours` / `validityTrailHours`** — derived window around the event date.
- **`offlinePackageTtlMinutes`** — after this, a cached list refuses to admit.

---

## 4. Deploy

### Prerequisites

Set `ADMISSION_PASS_SECRET` (recommended) or rely on `NEXTAUTH_SECRET`.

```bash
openssl rand -base64 48
```

Add it to the deployment environment **before** the first pass is issued.
Changing it later invalidates every issued pass (see rollback below).

### Steps

```bash
# 1. Apply the additive migration
npx prisma migrate deploy        # or: npx prisma db push

# 2. Regenerate the client and build
npx prisma generate
npm run build

# 3. Verify
npm run test:admission
npm run test:admission-passes

# 4. (Optional) provision passes ahead of enabling the feature
npm run admission:backfill:dry-run
npm run admission:backfill -- --all-events
```

The migration (`prisma/migrations/20260727120000_guest_entry_pass`) is fully
additive: two new tables, and only nullable-or-defaulted columns on
`qr_scans` and `offline_checkins`. No data is rewritten and no backfill is
required before deploy.

### Enabling for an event

1. Dashboard → QR Admission → pick the event.
2. Open **Admission settings** and switch on **QR admission**. Passes are issued
   for every invitation on save.
3. Guests see their pass at the bottom of the invitation on their next visit.
4. At the gate, use the **Guest Entry Pass gate** card: scan, or type the code.
5. Before going on-site, tap **Download list** on each gate device so it can
   admit without signal.

---

## 5. Rollback

The feature is switch-driven, so rollback is graduated — you rarely need the
database.

**Level 1 — disable for one event (instant, no deploy).**
Turn off **QR admission** in Admission settings. The pass disappears from
invitations and the gate falls back to the legacy scanner. Pass rows are kept,
so re-enabling restores the same codes.

**Level 2 — disable the guest-facing pass but keep the gate.**
Turn off **Show pass on the invitation**. Staff can still admit by code.

**Level 3 — revert the application.**
Deploy the previous release. The new tables are unreferenced by old code and
the added columns are nullable/defaulted, so the old build runs unchanged
against the new schema. **No migration rollback is needed**, and none is
recommended while pass rows exist.

**Level 4 — drop the schema (last resort, destructive).**

```sql
DROP TABLE "guest_passes";
DROP TABLE "event_admission_settings";
-- The added columns on qr_scans / offline_checkins are harmless; on SQLite,
-- dropping them requires a table rebuild and is not worth the risk.
```

Take a database backup first. This destroys the admission audit trail.

**Secret rotation.** Changing `ADMISSION_PASS_SECRET` invalidates every issued
token (codes still work). Recover with:

```bash
npm run admission:backfill -- --all-events   # re-issues where no live pass exists
```

For passes that already exist, regenerate them from the organiser tools so each
guest gets a fresh QR and code.

---

## 6. Operating notes

- **Screenshots scan.** The QR is rendered on a plain white plate in high
  contrast `pass` mode; a screenshot works as well as the live page.
- **Brightness.** The pass and its fullscreen view both prompt the guest to
  raise brightness — the single biggest cause of slow gate scans.
- **Offline conflicts** surface at `/api/admission/conflicts`. Accepting one
  admits the remaining heads; rejecting returns the pass to service.
- **Queued records are never dropped.** Only records the server accounted for
  are removed from the device queue; anything it could not resolve stays
  queued for the next sync.
- **A pass failure never breaks an invitation.** Pass loading on the published
  invite is wrapped in try/catch, and the rendered section sits behind an error
  boundary.
