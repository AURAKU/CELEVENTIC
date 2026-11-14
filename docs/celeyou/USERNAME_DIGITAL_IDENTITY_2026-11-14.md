# CeleYou unique usernames and permanent digital identity

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Status:** Implemented in local source. Applied to local `prisma/dev.db` only. Not committed. Not pushed. Not deployed. `prisma/production.db` was not touched.

Display names stay free-form and may repeat. Public usernames are unique. Digital cards keep their own opaque QR and NFC tokens. The official CeleYou mark, plate theme, and card layout were not changed.

## Database changes

Additive SQLite only.

| Change | Purpose |
| --- | --- |
| `users.celeYouPrimaryCardId` | Owner-selected primary public card for `/u/{username}` |
| `celeyou_usernames` unique on `normalized` | Registry of ACTIVE, ALIAS, HOLD, RESERVED, SLUG |
| Indexes on `userId+kind`, `kind+holdUntil`, `cardId` | Availability and admin lists without full-table scans |
| `celeyou_username_events` | Username claim, change, hold, reserve, release audit |
| Trigger `celeyou_hold_usernames_on_user_delete` | 90-day HOLD even if application delete skips the service helper |

Migrations:

- `prisma/migrations/20261114170000_celeyou_usernames/migration.sql`
- `prisma/migrations/20261114180000_celeyou_username_delete_hold/migration.sql`
- Duplicate-safe apply path: `scripts/sql/apply-celeyou-sqlite.ts`

Seed on first apply:

- Every live card slug becomes `SLUG`, so `/u/{existing-slug}` cannot be claimed by another account.
- Existing `User.username` values become `ACTIVE` when free.
- Reserved system names are inserted: admin, support, help, security, billing, api, celeyou, celeventic, official, plus route tokens (`u`, `c`, `n`, `card`, `studio`, and others).
- First retained card per owner is backfilled as primary.

`User.name` remains non-unique. `DigitalBusinessCard.publicToken` and `SmartCardNfcDevice.publicToken` are unchanged.

## API changes

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/celeyou/usernames/availability` | Rewrite to the internal availability route |
| `GET /api/digital-business-cards/usernames/availability` | Advisory check. Rate limit 30/min IP, 60/min signed-in user. Returns `{ username, available, reason, suggestions, message }`. Never returns email, phone, or owner ids |
| `GET/PATCH /api/digital-business-cards/username` | Owner identity, atomic claim, primary-card selection. Username change requires `confirm: true` (409 `needsConfirm`). Claim rate 8/hour |
| `GET/POST /api/admin/celecard/usernames` | Paginated search, history, reserve. View vs suspend permissions. AuditLog + username events |

Assignment is a Prisma `$transaction` against the unique `normalized` index. A `P2002` conflict becomes `TAKEN`. Availability is never the final authority.

Canonical normalize: NFKC, strip `@`, lowercase, ASCII `[a-z0-9._]`, 3–30, no leading/trailing/consecutive periods. Homoglyphs and other Unicode letters fail the pattern after NFKC.

## Frontend changes

- Username field with `@` prefix, 400ms debounce, live valid/taken/reserved states, copyable `celeventic.com/u/{username}`, and suggestion chips.
- Registration / first-time onboarding uses the same field. Display name is never rewritten to resolve a conflict.
- Account settings: current handle, public URL, copy, primary-card picker, confirmation before a change.
- Studio identity panel: same claim API and confirmation.
- Public `/u/{username}` is a real page (the old rewrite to `/card/:slug` was removed) so a username that is not the card slug still resolves. Layout is the existing `DigitalCardPublicView`.
- Admin CeleYou desk tab **Usernames**: search, kind filter, pagination, history, reserve with reason.

Suggestions use display name, nickname, initials, company, profession, and keywords. Sequential `-2`, `-3` suffixes are not generated.

## Migration strategy

Reversible and additive.

1. Apply columns and tables. Do not drop slug, QR, or NFC columns.
2. Bridge every existing slug as `SLUG` so those URLs keep resolving.
3. Do not auto-assign numeric usernames. Owners without a handle keep `/u/{slug}` until they pick one in settings or onboarding.
4. Hyphen slugs such as `kojo-mensah` stay valid profile URLs. New usernames allow periods and underscores, not hyphens, so they cannot collide with those slugs by format.
5. Username change moves the old ACTIVE row to HOLD for 90 days with `redirectTo` the new handle. The name is not released for reuse during HOLD.
6. Account deletion HOLDs names for 90 days (service + SQLite trigger). `releaseExpiredUsernameHolds` deletes expired HOLD rows; claim also deletes an expired HOLD inside the same transaction before insert.
7. Production apply, when authorized later: `npx tsx scripts/sql/apply-celeyou-sqlite.ts prisma/production.db` on a backup copy first. Do not `prisma db push` live. Do not run this against production from this session.

## Existing URL compatibility

Inspected live routes before adding identity. Permanent card destinations stay:

| Artifact | Token | Guest destination |
| --- | --- | --- |
| Profile | username or preserved slug | `/u/{handle}` |
| Smart QR | `DigitalBusinessCard.publicToken` | `/c/{publicToken}` |
| NFC | `SmartCardNfcDevice.publicToken` | `/n/{nfcToken}` |

Local `prisma/dev.db` Kojo Mensah:

- slug `kojo-mensah` stored as `SLUG`
- QR token `cmw9ryoql08kdb5gq7hisd05w` unchanged
- NFC active `cmwaogena03fwb57vgkyttjwa`, replaced `cmwaq6k5p01psb52ez98t0l3r` unchanged

HTTP on `:3012`:

| Check | Result |
| --- | --- |
| `GET /u/kojo-mensah` | 200, original Elegant Frost plate, display name Kojo Mensah |
| `GET /card/kojo-mensah` | 200, same public layout |
| `GET /c/{publicToken}` no-follow | 307 to the production card URL (guest origin rewrite). Token not rotated |
| `GET /n/{replaced}` | 200 paused/replaced copy, not the live profile |
| Browser `/u/kojo-mensah` | Official teal mark, original landscape plate, CeleYou lockup intact |

A username change updates `/u/{username}` only. QR and NFC keep resolving through `/c` and `/n` to the same card id.

## Concurrency

`username-identity.test.ts`:

- Two accounts named **Owuraku Afari** claimed distinct handles and kept the same display name.
- The second account could not steal the first handle.
- Two simultaneous `claimCeleYouUsername` calls for one handle: **1 fulfilled, 1 rejected**.
- After a change, the old handle resolved as `alias` and `publicToken` plus slug stayed the same.
- Primary-card switch moved `/u/{username}` to the other owned card without rotating QR.

`npm run test:celeyou`: **321 / 321 passed**.

## Security

| Control | Result |
| --- | --- |
| Unique constraint + transaction | Concurrent claim has a single winner |
| Authz | Unauthenticated GET/PATCH username 401. Admin list 403 |
| Reserved names | `@celeyou` availability `RESERVED`. Settings UI shows reserved plus alternative chips |
| Rate limits | Availability and claim windows as above |
| Enumeration | Availability returns TAKEN/RESERVED/INVALID without owner PII. Rate limited |
| Suspended owners | Claim rejected with 403 |
| Redirects | Alias uses `permanentRedirect` to `/u/{new}`. OG/vCard follow the registry to the card slug, not an open redirect |
| Unicode | NFKC then ASCII-only pattern. Visually deceptive non-Latin letters are invalid |
| Hijack | 90-day HOLD on change and delete. Orphan ACTIVE rows without a user are treated as HOLD |

## Remaining blockers

- Not deployed. Production DB not migrated. Do not apply until a backup and an authorized window exist.
- `releaseExpiredUsernameHolds` is implemented but not on a scheduled job. Expired HOLDs are still cleared at the next successful claim of that exact name.
- No standalone impersonation-ticket queue. Admins investigate from the username directory, history, and reserve action.
- `multipleCards` catalog entitlement is not newly gated at create. Existing unbounded card create is preserved. Primary-card selection is live.
- Data-deletion *request* does not HOLD names until the account is actually deleted (intentional).
- Local `/c/{token}` follow to `www.celeventic.com` can fail DNS in this environment. The 307 Location still uses the same publicToken. Live production QR behavior is unchanged.

## Acceptance

CeleYou can host unlimited people with the same display name. Public usernames are unique. Card identity is the opaque `/c` and `/n` tokens. Existing QR and NFC destinations were not rewritten. Existing profile slugs continue to resolve until their owners choose a username. No production deploy was performed.
