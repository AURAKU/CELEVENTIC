# Live invitation parity audit

**Repository:** `AURAKU/CELEVENTIC`
**Local path:** `/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main`
**Audit branch:** `fix/live-invitation-parity`
**Base commit:** `fcd6dd8`
**Auditor date:** 2026-08-05
**Node:** 24.15.0 (build + test runs)

## Executive summary

"Parity" here means one thing: **the invitation a guest opens on their phone is
the invitation the host approved in Studio** — same content, same media, same
ceremony, on any browser, from any link carrier.

Three independent classes of defect were breaking that promise in production,
and each of them presented to the host as the same unhelpful symptom ("it works
for me, it's broken for them"):

1. **Link fragility.** `Invitation.uniqueLink` was looked up with a single
   exact-match query. Every link that had been through WhatsApp, SMS, an email
   client or a QR scanner — percent-encoded, angle-bracket wrapped, trailing
   slash, trailing full stop, zero-width characters from a rich-text paste —
   404'd, while a clean paste of the same token worked. The guest and the host
   were provably holding the same link and getting different results.

2. **Non-public media URLs.** Studio uploads and CSV/JSON imports persisted
   whichever origin the author's browser happened to be on. `http://localhost:3000/uploads/…`,
   `http://192.168.1.x/uploads/…`, `http://macbook-pro.local/uploads/…` and even
   raw `/var/www/…/public/uploads/…` filesystem paths were written into rows and
   then served into guest HTML, where they render as broken images on every
   device outside the author's network. The old check only knew about
   `localhost` and `127.0.0.1`.

3. **Unguarded ceremony beats.** The brand film, tap gate and envelope reveal
   are decoration in front of the invitation, but an exception in any of them
   took down the whole route — the guest got a blank white screen instead of the
   content they came for.

All three are fixed, plus the operational gap that made them so hard to
diagnose: there was **no way to tell which build was actually serving guests**,
so a deployed fix and a stale process were indistinguishable.

`npm run build` passes on Node 24.15.0. 92 unit assertions across link
normalisation, media-URL sanitisation, wedding-board copy and intro/audio
sequencing pass. `npm run smoke:live-invitations` passes 19/19 checks against a
local server with a real invitation token — including both mangled-link forms,
which is the end-to-end proof that the repair path works over HTTP and not just
in unit tests.

**Verification against the production deployment was not performed in this
session.** The smoke runner exists for exactly that and must be run against
`https://www.celeventic.com` with real tokens after deploy.

---

## Defect 1 — link fragility

### Root cause

`getInvitationByLink` and three sibling call sites each did their own
`prisma.invitation.findUnique({ where: { uniqueLink: link } })`. That is
correct for a clean token and wrong for every carrier-damaged form of the
same token.

### Fix

A two-layer design, because the token is a **bearer credential** and lookup
tolerance must never become token weakness.

`src/lib/invitation/invite-link.ts` — pure, client-safe, no Prisma:

| Export | Responsibility |
|---|---|
| `normalizeInviteLink` | Canonical form: strips zero-width/NBSP, unwraps `<…>` `"…"` `(…)`, decodes percent-encoding (bounded at 3 passes, so `%2525…` terminates), reduces a full URL/path to its token segment, drops query + fragment. Idempotent. |
| `isPlausibleInviteToken` | `^[A-Za-z0-9_-]{6,128}$` — gates the fuzzy fallbacks. |
| `inviteLinkCandidates` | Ordered, de-duplicated lookup list. **Index 0 is always the caller's untouched value.** |
| `inviteLinkIsCanonical` | Keeps the clean path at exactly one query. |

`src/services/invitations/invite-link-resolver.service.ts` — the database half:

1. Exact, case-sensitive `@unique` lookup on the untouched value.
2. Normalised candidates, highest confidence first.
3. Case-insensitive match **only when it resolves to exactly one row**.

Step 3 is raw SQL (`LOWER(uniqueLink) = LOWER(?) LIMIT 2`) because SQLite's
BINARY collation makes Prisma `equals` case-sensitive and `mode: "insensitive"`
is unsupported on this provider. `LIMIT 2` is the safety property: **more than
one match is ambiguous and is rejected**, so a case-folded query can never hand
a guest another party's invitation. A dialect surprise is caught and logged
rather than taking a live invitation down.

### Wired call sites

| Surface | File | Behaviour |
|---|---|---|
| Ceremony page | `src/app/invite/[link]/page.tsx` | Repairs, then **redirects to the canonical token** so reloads, share cards, `event-day` and the admission poller all agree on one URL. `guest` / `view` params are preserved. |
| Event-day portal | `src/app/invite/[link]/event-day/page.tsx` | Same forgiving lookup; every generated href carries the canonical token. |
| Admission poller | `src/app/api/invite/[link]/admission-status/route.ts` | Inherits the page's token, so it must tolerate the same forms — otherwise the invitation renders but admission silently reports "disabled". |
| Guest wishes | `src/app/api/invite/wishes/route.ts` | Accepts repaired links so the guestbook does not 400 on a page that rendered fine. |
| Service | `src/services/invitations/invitation.service.ts` | Exact first (one query for a clean link), repair only on miss. |

### What was deliberately *not* done

- **Case is never folded in normalisation.** `normalizeInviteLink` preserves it
  exactly; case-insensitivity exists only as an unambiguous single-row fallback.
- **No token was regenerated.** Every link already in a guest's hands still
  resolves byte-for-byte — there is a dedicated `legacy link compatibility`
  test suite asserting this, because a normalisation change that altered them
  would silently invalidate every invitation already sent.
- **No fuzzy/prefix/LIKE matching.** Every fallback is an explicit, ordered,
  finite candidate.

---

## Defect 2 — non-public media URLs

### Root cause

`resolvePublicMediaUrl` treated any absolute `http(s)://` URL that wasn't
`localhost`/`127.0.0.1` as a legitimate CDN. A LAN address is indistinguishable
from a CDN under that rule.

### Fix

`src/lib/uploads/media-url.ts` gained `hostIsNonPublic`, which additionally
rejects RFC 1918 ranges (`10.x`, `192.168.x`, `172.16–31.x`), link-local
`169.254.x`, loopback `127.x`, `*.local` / `*.internal` suffixes, and bare
dotless LAN hostnames. Non-public hosts are reduced to their path so the
guest's own origin serves the file.

Every media reference handed to the guest bundle in `invite/[link]/page.tsx`
now passes through the resolver: gallery URLs, cover image, resolved
background image/video, memory-upload QR, gift QR.

Covered by 13 assertions in `src/lib/uploads/__tests__/media-url.test.ts`,
including a guard that genuinely public CDN hosts stay absolute and that
server filesystem paths are stripped.

---

## Defect 3 — a broken ceremony beat took the whole invitation down

`src/components/invitation-os/ceremony-error-boundary.tsx` guards each beat
(`soft-intro`, `tap-to-begin`, `reveal`) inside `premium-invite-wrapper.tsx`.

It deliberately **does not render an error card** — an error card in front of a
wedding invitation is its own kind of failure. It falls *through* to the next
beat, which ends at the guest portal: the content the guest actually came for.
The ceremony is the only thing lost, and the host hears about it in the console
rather than the guest hearing about it on the page.

### Route-level boundary

`src/app/invite/error.tsx` covers every `/invite/*` route. Its first move is to
try to fix itself: a `ChunkLoadError` (or any stale-asset variant — failed CSS
chunk, failed dynamic import) means the browser is holding asset URLs from a
build that no longer exists. This is the single most common way a live
invitation breaks for exactly one guest: they opened the link, the host
deployed, and their WhatsApp WebView resumed a page whose JavaScript is gone.

Recovery reloads **once**, scoped per pathname in `sessionStorage`, because a
reload loop in front of a wedding invitation is worse than an honest recovery
card. The fallback card never says "error" or "digest" unless the guest opens
the detail line.

---

## Defect 4 — intro audio and the opening gesture

The brand film owns the audio stage for its whole runtime, so the invitation's
own music track must not be audible until a later beat. But autoplay policy
means a track that is never touched during a user gesture can never be started
programmatically afterwards.

`introGestureAudioAction` (`src/lib/experience-engine/soft-intro.ts`) decides
what the "Open Invitation" gesture spends itself on — never `"play"`:

- `"prime"` — buffer only, used whenever a real gesture still lies ahead
  (Tap to Begin, or the envelope tap when that beat owns the opening).
- `"arm-silently"` — only for pipelines that jump straight from film to portal
  with no further gesture.

`armSilently` (`src/lib/music/invitation-audio-manager.ts`) plays the element
muted at volume 0 and pauses on the next tick, which is enough for Safari and
Chrome to mark it user-activated, then rewinds to the trim start. No sound
reaches the guest.

`INTRO_FAILED_GATE_HOLD_MS` (15s) covers the case where the clip fails before
the guest ever tapped: the branded gate stays on the poster so opening remains
a deliberate gesture, but nobody is ever stranded.

### Copy repair

`resolveOpeningInstruction` (`src/lib/invitation/wedding-board.ts`) repairs
stored seal-only hints ("Lift the seal to open") at read time. The envelope now
opens from a tap anywhere on the ceremony, so that copy told guests to do
something narrower than what actually works. Host-authored copy is otherwise
respected.

---

## Operational gap — which build is actually serving guests?

Parity bugs were repeatedly misdiagnosed because a guest would report a blank
invitation, the fix would be deployed, the guest would still see it, and nobody
could prove whether the running server had the fix, had a warm `.next` cache,
or had never restarted at all.

`src/lib/runtime/build-fingerprint.ts` is surfaced on `GET /api/health` (on
both the healthy and degraded branches — knowing *which build* is degraded is
the whole point of asking a sick server what it is):

| Field | Source | Why |
|---|---|---|
| `commit` | `CELEVENTIC_COMMIT_SHA` → `GIT_COMMIT_SHA` → `SOURCE_COMMIT` → `VERCEL_GIT_COMMIT_SHA` | Which code. Sanitised to a 12-char hex prefix — never a raw env value. |
| `buildId` | `.next/BUILD_ID` | Distinguishes two deploys of the same commit. |
| `startedAt` | Process boot | Reveals whether a deploy actually restarted the server. |
| `env` | `NODE_ENV` | — |

Deliberately narrow. This endpoint is public, so it must never become a way to
enumerate the environment: no env dumps, no paths, no internal package
versions.

---

## Tooling

### `npm run smoke:live-invitations`

`scripts/smoke-live-invitations.mjs` answers the question that could not be
answered during the incident: *does this exact invitation link work for a guest,
on this deployment, right now?* Everything is checked from outside the app, over
HTTP, with a real mobile Safari user-agent.

Per invitation it asserts: no unexpected redirect (or a redirect that settles on
the same token), HTTP 200, HTML that is neither the branded error card nor the
404 shell, `cache-control` that is not publicly cacheable, **no non-public URLs
/ filesystem paths / private field markers in the payload**, that referenced
`_next/static` assets and `/uploads/` media actually return 200, that
`admission-status` and `wishes` answer the same token, and that mangled forms
(trailing slash, percent-encoded) still resolve.

```bash
BASE_URL=https://www.celeventic.com \
INVITE_LINK_SINGLE=<token> \
INVITE_LINK_GROUP=<token> \
INVITE_LINK_MEDIA=<token> \
npm run smoke:live-invitations
```

Tokens come from the environment and are **redacted in every line of output**
(`aB3_…32ch`), including inside error text, because a CI log or a pasted
terminal transcript must never become a way into someone's invitation. Exit
code 1 on any required failure; warnings never fail the run.

### `npm run audit:invitation-links`

`scripts/audit-invitation-links.ts` finds rows whose *stored* token carries
transport damage. These invitations can never be opened — the guest sends the
clean token, the row holds a dirty one, and no amount of request-side
normalisation can fix a broken row.

Safety rules, all enforced in code rather than documented and hoped for:

1. **Dry-run is the default.** `--repair` is required to write anything.
2. **Full tokens are never printed.** Findings show `head…tail (Nch)` with
   whitespace rendered as visible escapes, since the whitespace *is* the finding.
3. **Repair only touches unambiguous whitespace damage.** A pasted URL, a case
   collision, or a canonical form already held by another row is reported for a
   human and left alone.
4. **Every repair writes a JSON backup + redacted manifest first**, then runs in
   a single transaction that re-checks for collisions inside the transaction and
   rolls back whole on any surprise.

`.backups/` is gitignored — those files hold real bearer tokens.

---

## Requirement traceability matrix

| ID | Requirement | Status | Evidence | Tests | Remaining risk |
|---|---|---|---|---|---|
| P-01 | Mangled links resolve | PASS | `normalizeInviteLink` + resolver | `invite-link.test.ts`, local E2E 200 | prod NOT TESTED |
| P-02 | Clean link stays one query | PASS | `inviteLinkIsCanonical`, exact-first | `invite-link.test.ts` | none |
| P-03 | Exact match always first | PASS | `inviteLinkCandidates[0]` = untouched | `invite-link.test.ts` | none |
| P-04 | Case never folded silently | PASS | `LIMIT 2`, ambiguity → not found | `invite-link.test.ts` | needs prod collision scan |
| P-05 | Legacy tokens unchanged | PASS | dedicated legacy suite | `invite-link.test.ts` | none |
| P-06 | Canonical URL redirect | PASS | `invite/[link]/page.tsx` | local E2E: 308 → canonical | prod NOT TESTED |
| P-07 | event-day tolerant | PASS | `repairInviteLink` wired | build | prod NOT TESTED |
| P-08 | admission-status tolerant | PASS | `repairInviteLink` wired | local E2E 200 + JSON | prod NOT TESTED |
| P-09 | wishes tolerant | PASS | `repairInviteLink` wired | local E2E 200 | prod NOT TESTED |
| P-10 | No localhost URLs in payload | PASS | `hostIsNonPublic` | `media-url.test.ts` | existing rows unrepaired |
| P-11 | No LAN / `.local` URLs | PASS | RFC1918 + mDNS rejection | `media-url.test.ts` | same |
| P-12 | No filesystem paths | PASS | `/var/www/…` stripped | `media-url.test.ts`, local E2E | same |
| P-13 | Public CDNs stay absolute | PASS | CDN allowlist preserved | `media-url.test.ts` | none |
| P-14 | Ceremony failure ≠ blank screen | PASS | `CeremonyErrorBoundary` fallthrough | build | no unit test for boundary |
| P-15 | Route error boundary | PASS | `app/invite/error.tsx` | build | not exercised live |
| P-16 | ChunkLoadError recovery | PASS | once-per-path session guard | build | not exercised live |
| P-17 | Intro owns audio stage | PASS | `introGestureAudioAction` | `intro-audio-sequencing.test.ts` | device matrix NOT TESTED |
| P-18 | Music armed within gesture | PASS | `armSilently` | `intro-audio-sequencing.test.ts` | iOS Safari NOT TESTED live |
| P-19 | Opening copy matches gesture | PASS | `resolveOpeningInstruction` | `wedding-board.test.ts` | none |
| P-20 | Build identity observable | PASS | `/api/health` `build` | build | needs `CELEVENTIC_COMMIT_SHA` in deploy env |

---

## Verification performed

| Check | Command | Result |
|---|---|---|
| Link normalisation | `tsx --test src/lib/invitation/__tests__/invite-link.test.ts` | pass |
| Media URL sanitisation | `tsx --test src/lib/uploads/__tests__/media-url.test.ts` | pass |
| Wedding board copy | `tsx --test src/lib/invitation/__tests__/wedding-board.test.ts` | pass |
| Intro / audio sequencing | `tsx --test src/lib/experience-engine/__tests__/intro-audio-sequencing.test.ts` | pass |
| **Total** | | **92 assertions, 0 failures** |
| Production build | `npm run build` (Node 24.15.0) | pass — `/invite/[link]` 397 kB, `/invite/[link]/event-day` 169 kB |
| End-to-end over HTTP | `BASE_URL=http://127.0.0.1:3000 npm run smoke:live-invitations` with a real token | **19 checks, 0 failures** |

### What the end-to-end run proved

Both mangled forms returned 200 against a real server: `/invite/<token>/`
(trailing slash) and `/invite/<token>%20` (percent-encoded). Before this work
those were the exact shapes that 404'd. The payload carried no filesystem paths
and no private field markers, `cache-control` was `no-store, must-revalidate`,
every referenced `_next/static` asset returned 200, and `admission-status` and
`wishes` both answered the same token.

The health check reported `buildId` correctly when serving a production build
and `null` under `next dev` (which writes no `BUILD_ID`) — correctly a warning
rather than a failure.

### A note on trusting this runner

The first run reported four failures that were all artefacts, and fixing them
matters more than the run itself — a smoke test that cries wolf is one people
learn to ignore:

- **"branded error card" / "404 shell" false positives.** A *healthy* invitation
  page contains both strings: the not-found component travels in the route's
  flight payload and "Something went wrong" lives in the i18n dictionary, both
  as escaped JSON. A plain `includes()` therefore failed on every working page.
  The runner now matches only rendered element text (`>text`).
- **"non-public URL" false positive.** Against a local base, `http://localhost:3000`
  in the payload *is* the correct app URL. That check is now skipped when the
  base is local and enforced strictly otherwise.
- **404 on every CSS asset.** Caused by running `npm run build` while a
  `next dev` server was live: the production build overwrites `.next` underneath
  it and the dev server serves a manifest that no longer matches. Not a code
  defect — but worth knowing, since it produces a very convincing fake outage.
  Clear `.next` and restart dev after any local production build.

---

## Not done in this session — required follow-up

1. **Production HTTP verification.** The runner passes 19/19 locally; run it
   against the deployment with a single-guest, a group and a media-heavy token.
   Nothing here proves parity on the real box until that passes there.
2. **Stored-row audit.** Run `npm run audit:invitation-links` (dry-run) against
   production to see whether any row carries transport damage, and review the
   `needs-review` findings by hand before considering `--repair`.
3. **Deploy env.** Set `CELEVENTIC_COMMIT_SHA` in the deploy script so
   `/api/health` reports a commit rather than `null`.
4. **Device matrix.** Intro audio behaviour on real iOS Safari, Android Chrome
   and the WhatsApp/Instagram in-app WebViews is asserted at the sequencing
   layer only; it has not been observed on hardware.
5. **Existing media rows.** Sanitisation happens on read. Rows that persist a
   LAN or filesystem URL are now rendered correctly but are still wrong in the
   database.
