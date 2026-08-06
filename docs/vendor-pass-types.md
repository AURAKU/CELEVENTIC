# Vendor Pass Types

How an organiser shapes the **Pass type** picker on `/dashboard/guests` →
*Vendor & Team Passes*, and why removing a type never invalidates a pass that is
already in a vendor's hands.

---

## The two things an organiser actually does

Open **Generate Vendor Pass** and hit *Manage types* next to the Pass type
select:

```
Pass type                                    Manage types
[ Musical Band                            v ]

Pass types for this event
[ New pass type (e.g. Catering)      ]  [ + Add type ]

Vendor ×  Performer ×  Musical Band ×  DJ ×  …  Catering · 3 in use ×

Hidden built-in types
Exhibitor ⟲   Sponsor ⟲
```

1. **Add** — type a name (Catering, Security Dogs, Stage Crew) and it appears in
   this event's picker immediately.
2. **Remove** — the bin icon. What that means depends on the type; see below.

Everything is **per event**. Adding "Catering" to a wedding never changes the
picker on anybody else's event.

---

## Data model

| Piece | Where it lives |
| --- | --- |
| Platform built-ins | `VendorTeamPassType` enum (`VENDOR`, `MUSICAL_BAND`, `SECURITY`…) |
| One event's list | `event_vendor_pass_types` (`EventVendorPassType`) |
| The type on an issued pass | `vendor_team_passes.passType` + `categoryLabel` |

`EventVendorPassType` rows come in two kinds, both scoped to one event:

- `source = "CUSTOM"` — a type the organiser invented. `key` is an uppercase
  slug of the label (`Security Dogs` → `SECURITY_DOGS`), unique per event.
- `source = "SYSTEM"` — an override for a built-in. Built-ins are enum values
  shared by the whole platform, so an event never deletes one; it writes
  `isActive = false` here and the type drops out of *this* picker.

A pass issued against a custom type is stored as `passType = CUSTOM` with the
type's label **snapshotted** into `categoryLabel`. That snapshot is what the
badge, the public pass page and the printed access-card PNG read, so a card
printed as "Security Dogs" still says "Security Dogs" long after the type is
gone.

The `<select>` carries `MUSICAL_BAND` for a built-in and `CUSTOM:SECURITY_DOGS`
for a custom type; the server resolves that value into the two columns above.

---

## What deletion actually does

| Type | Not used by any live pass | Used by live passes |
| --- | --- | --- |
| Custom | Row is deleted outright | Confirm, then **soft-delete** (`isActive = false`) |
| Built-in | **Hidden** for this event | Confirm, then hidden |

Built-in types are never destroyed — hiding is the strongest action available,
and a hidden built-in can be restored with one click from the manage panel.
A custom type still carried by live passes is deactivated rather than deleted so
those passes keep both their label and their history.

"In use" counts non-archived vendor passes on the event. Revoked and archived
passes do not block a deletion; archived ones are out of circulation and a
revoked card is already refused at the gate.

Once a type is hidden or deactivated it can no longer mint new passes. That is
enforced in `resolveVendorPassTypeSelection`, not in the UI, so a stale browser
tab cannot slip through.

---

## Permissions

| Action | Permission | Endpoint |
| --- | --- | --- |
| Read the picker | `MANAGE_VENDOR_ACCESS`, `MANAGE_GUESTS` or `SCAN_QR` | `GET /api/events/:id/vendor-pass-types` |
| Add / restore | `MANAGE_VENDOR_ACCESS` or `MANAGE_GUESTS` | `POST /api/events/:id/vendor-pass-types` |
| Remove | `MANAGE_VENDOR_ACCESS` or `MANAGE_GUESTS` | `DELETE /api/events/:id/vendor-pass-types/:key[?confirm=1]` |

Door staff can read the picker (they see type names in the pass list) but cannot
change it. Event owners and organisation collaborators get write access through
their event permissions; platform admins get it on every event through
`resolveEventAccess`. Every add and remove is written to the audit log as
`event_vendor_pass_type`.

---

## Testing

```bash
npm run test:vendor-pass-types   # pure rules + database-backed service
npm run test:admission           # vendor capacity/gate regression
npm run test:admission-passes    # access card, entry log, scan log
```

By hand on `/dashboard/guests`:

1. **Generate Vendor Pass → Manage types → Add** "Catering". It is selectable
   at once; the created pass badge and printed card both read "Catering".
2. Delete "Catering" while that pass exists: the first attempt explains how many
   passes use it and asks to confirm; after confirming, the type leaves the
   picker and the issued pass keeps its label and still scans.
3. Delete an unused custom type: it disappears with no second prompt.
4. Delete a built-in (e.g. Exhibitor): it moves to *Hidden built-in types* and
   comes back with one click.
