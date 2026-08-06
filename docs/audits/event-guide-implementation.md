# Event Guide — Implementation Audit

Branch: `feature/event-guide-qr-hub`
Scope: unified public **Event Guide** (Programme | Seating | Menu), organizer builder, physical QR signage,
privacy-safe seating finder, and full offline support (Level 1 PWA + Level 2 Venue Offline Pack).

---

## 1. What already exists (audited before writing code)

### 1.1 Public event surfaces

| Route | File | What it does | Verdict |
| --- | --- | --- | --- |
| `/event-programme/[publicToken]` | `src/app/event-programme/[publicToken]/page.tsx` | Resolves an `EventQrLink` of type `PROGRAMME`, reads programme items out of the live invitation's studio wedding-board via `resolveCompanionTheme`. Unstyled slate/teal markup. | **Keep** as a legacy deep link. Its data path is the source of truth we compose. |
| `/event-menu/[publicToken]` | `src/app/event-menu/[publicToken]/page.tsx` | Resolves `EventQrLink` type `MENU`, reads `menuBody`/`menuUrl` from the published invitation's `featureConfig` via `readCompanionMenuConfig`. | **Keep**. Same — its data path is composed, not duplicated. |
| `/event-seat/[publicToken]` | `src/app/event-seat/[publicToken]/page.tsx` | Client page, code-only lookup, posts to `/api/event-seat/verify`, renders `GuestSeatingCard`. | **Keep**. We generalise its privacy model rather than re-implement it. |
| `/event-help/[publicToken]`, `/event-venue/[publicToken]` | same pattern | Contact phone / venue detail pages. | **Keep**, out of Event Guide MVP tab set. |

`notFound()` is used for every invalid token today, which renders the generic 404 — one of the explicit
product gaps ("polished unavailable page, not blank/500").

### 1.2 Token + QR infrastructure

`EventQrLink` (`prisma/schema.prisma`, `event_qr_links`) is already an event-scoped, tokenised, status-managed
public destination with `title/subtitle/heading/footerText`, `designJson`, `metadata`, `expiresAt`, and
`@@unique([eventId, type, title])`. `EventQrLinkService` already implements `ensureStandard`, `getByToken`,
`publicUrl`, `setStatus`, `rotateToken`, and writes audit logs.

`generatePublicLinkToken()` (`src/lib/qr-hub/vendor-token.ts`) mints `eql_<24 base64url chars>` from
`randomBytes(18)` — 144 bits, unguessable. `mintVendorToken` / `hashVendorToken` give us the
HMAC-signed + SHA-256-stored token pattern for secrets that must never be stored in plaintext.

`/api/qr/image` renders branded PNG/SVG for arbitrary `data=` URLs with the event's centre mark.
`EventQrPackService` already builds ZIP and multi-up A4 PDFs with `pdf-lib` + `archiver`.

**Verdict: no new token system, no new QR renderer, no new PDF stack.**

### 1.3 Authorization

`requireQrHubAccess(eventId)` → `resolveEventAccess` → owner / collaborator / staff / org-member with a
permission `Set`. Returns `canManage`, `canDownload`, `canManageVendor`, `canViewScans`.

**Verdict: reuse verbatim.** Event Guide writes require `canManage`; pack downloads require `canDownload`.

### 1.4 Theme

`resolveCompanionTheme(invitation)` already merges template config → stored design config → catalog creative
identity into `{colors, fonts, layout, backgroundImageUrl, programmeItems, accentWash, paperWash}`, with
defensive coalescing for partial colour tokens (a real past crash). `companionFontStyles` produces CSS font
stacks.

**Verdict: reuse verbatim as the "Use Invitation Theme" implementation.** Overrides layer on top.

### 1.5 Content sources

- Programme: `invitation.designConfig.studio.weddingBoard.programmeItems` (fallback `studio.visionBoard.programmeItems`), typed `WeddingBoardProgrammeItem { id, time, title, description? }`.
- Menu: `invitation.featureConfig` → `{ menuBody, menuUrl }`.
- Paste import: `parseProgrammeOutline(text)` in `src/lib/admission/companion-studio.ts` already parses `2:00 PM — Ceremony — detail`, `Ceremony at 2:00 PM`, `14:00 Ceremony`, and bare titles, and `programmeItemsToOutline` round-trips it.

**Verdict: no new parser, no new programme type, no new menu type.**

### 1.6 Seating

`/api/event-seat/verify` requires an exact `GuestPass.code`, resolves the invitation party, filters
`partyGuests` to the pass's own `invitationId` (explicit cross-party isolation), and returns exactly one
party's reception + ceremony assignment via `pickSeatingAssignment`. `GuestSeatingCard` renders it.

Gaps versus the Event Guide spec: no name-based mode, no minimum query length, no rate limit, no bounded
match count, no "which party member" disclosure control.

### 1.7 Offline patterns already in the repo

- `src/lib/admission/offline-store.ts` — IndexedDB with a package store + a queue store, `projectLocalState` for replaying the local queue over the downloaded snapshot, `hashTokenInBrowser` mirroring the server hash. This is the pattern to follow.
- `src/lib/offline-qr-client.ts` — older `localStorage` variant.
- There is **no service worker and no PWA runtime today** (`public/manifest.json` exists; nothing registers a SW).

**Verdict: reuse the IndexedDB shape and the "snapshot + queue + projection" idea; the service worker is genuinely new.**

---

## 2. Reuse vs. new — decision table

| Concern | Decision |
| --- | --- |
| Public token, status, revocation, rotation | **Reuse** `EventQrLink` + `EventQrLinkService`. Two new enum values: `EVENT_GUIDE`, `EVENT_GUIDE_OFFLINE`. |
| Organizer authz | **Reuse** `requireQrHubAccess`. |
| Theme | **Reuse** `resolveCompanionTheme` + `companionFontStyles`; add a validated override layer. |
| Programme data | **Reuse** `WeddingBoardProgrammeItem` + `parseProgrammeOutline`. |
| Menu data | **Reuse** `CompanionMenuConfig` / `readCompanionMenuConfig`. |
| Seating lookup | **Reuse** `pickSeatingAssignment`, `normalizeAdmissionCode`, `GuestSeatingCard`; **new** privacy-safe finder service that generalises `/api/event-seat/verify`. |
| QR images | **Reuse** `/api/qr/image` + `generateBrandedQrPng/Svg`. |
| Print exports | **Reuse** `pdf-lib` + `sharp`; **new** sign designer templates and page geometry. |
| Rate limiting | **Reuse** `rateLimit()`. |
| Audit trail | **Reuse** `createAuditLog`. |
| Publication state, draft vs published, versioning | **New** `EventGuide` model. Nothing existing carries a draft/publish lifecycle for event-day content. |
| Venue offline pack | **New** `EventGuideOfflinePack` model + signed export + local runner. |
| Guide analytics | **New** `EventGuideViewStat` — aggregate counters only, no per-visitor rows. |

### Why a new `EventGuide` model is not duplication

The guide **does not store a second copy of the programme or menu as its authoring surface**. It stores:

1. Configuration that has no home today (enabled, default tab, header visibility, seating mode, theme overrides).
2. An **optional override** for programme/menu, used only when the organizer edits inside the guide.
3. A **published snapshot** — the immutable, versioned artifact that guests and offline caches read.

`resolveGuideContent()` composes: `guide override (published) → invitation source → empty`. An organizer who
never touches the guide editor still gets their invitation programme and companion menu automatically.

The snapshot is required, not decorative: without it, "draft is never public", "offline cache keyed by
publication version", and "never silently overwrite newer server data" are all unimplementable.

---

## 3. Routes

### Public (no auth, token-scoped)

| Route | Purpose |
| --- | --- |
| `GET /event-guide/[publicToken]` | The guide. `?tab=programme\|seating\|menu` deep links. Server-rendered shell + themed client experience. |
| `GET /api/public/event-guide/[publicToken]` | Published snapshot JSON (`version`, `publishedAt`, header, theme, programme, menu, seating config). The service worker caches exactly this. |
| `POST /api/public/event-guide/[publicToken]/seating` | Privacy-safe seating finder. |
| `POST /api/public/event-guide/[publicToken]/view` | Fire-and-forget aggregate view counter. |

Invalid / revoked / disabled / unpublished → **200 with a themed "not available yet" page**, never a 404 shell
or a 500. The payload API returns `410 Gone` with `{ revoked: true }` so the service worker can purge.

### Organizer (session + event permission)

| Route | Purpose |
| --- | --- |
| `GET /dashboard/events/[id]/event-guide` | Builder: Content, Appearance, Seating, Publish, QR & Signs, Offline Readiness. |
| `GET /api/event-guide?eventId=` | Full builder state + permissions. |
| `POST /api/event-guide` | Action dispatch (`save_content`, `save_appearance`, `save_seating`, `import_programme`, `publish`, `unpublish`, `rotate_token`, `set_link_status`, `configure_offline`, `rotate_offline_token`, `revoke_offline_token`). Every write carries `expectedVersion` for optimistic concurrency. |
| `POST /api/event-guide/sign` | Printable sign PDF/PNG. |
| `GET /api/event-guide/offline-pack?eventId=` | Signed Venue Offline Pack ZIP. |
| `POST /api/event-guide/offline-sync` | Upload local queue, download latest, conflict report. |

---

## 4. Security & privacy

### Public surface never exposes

Event DB ids, organizer/user ids, invitation ids, guest ids, emails, phone numbers, full guest lists,
admission QR tokens or their hashes, payment data, or any draft content. The payload API builds its response
from an explicit allow-list — there is no `select: *` or spread of a Prisma row anywhere on the public path.

### Seating finder

- Never returns a list of everyone. Bounded by `maxMatches` (1–5, default 3).
- Minimum query length (default 3 for name mode, 4 for code mode); shorter input is rejected before any DB read.
- Rate limited per token + client IP: 12 attempts / 60s, then 429 with a calm retry message.
- **Party isolation**: results are filtered to the matched party's own `invitationId`, exactly as
  `/api/event-seat/verify` does. Plus-ones are rendered nested under the party, never as separate searchable people.
- Name mode is opt-in per event; the default is admission-code mode, which is the more private of the two.
- Response contains display name, table/zone/seat labels and party members only — no ids, no contact details.
- Ambiguous name matches return "more than one match, please add a surname" rather than disclosing the candidates.

### Organizer surface

Every mutating handler calls `requireQrHubAccess` and checks `canManage` before touching data, and writes a
`createAuditLog` entry. Optimistic concurrency: writes send `expectedVersion`; a mismatch returns `409` with
the current state so the UI can reconcile instead of clobbering a co-editor.

### Accessibility

`assessGuideContrast()` computes WCAG 2.1 relative-luminance contrast for body text, heading text and the
primary action against the resolved background. Publish is blocked below 4.5:1 for body text and 3:1 for
large text, with the failing pairs named. This runs on the server at publish time, so it cannot be bypassed
from the client.

---

## 5. Offline architecture

### 5.1 Level 1 — online-first PWA (ships in this branch)

**Trigger.** The service worker is registered *only* after a guest successfully loads a **published** guide
online. A draft, disabled, or revoked guide never registers it.

**Scope.** `navigator.serviceWorker.register('/event-guide-sw.js', { scope: '/event-guide/' })`. The worker
cannot see `/dashboard`, `/api/event-guide`, or any other origin path.

**What is cached**

| Cached | Not cached |
| --- | --- |
| Route shell + its Next.js chunks | Any `/dashboard` or organizer route |
| `/api/public/event-guide/{token}` payload (programme, menu, theme, header) | Draft content — the payload only ever contains the published snapshot |
| Theme background, event logo, approved public images | Guest lists, names, emails, phones |
| Fonts and nav assets | Admission QR tokens or hashes |
| — | Seating results (see 5.2) |

**Cache isolation.** Cache name is `event-guide:v1:{publicToken}:{publishedVersion}`. A different event, or
the same event republished, gets a different cache. On activation the worker deletes every
`event-guide:*` cache whose token matches but whose version does not, and every cache belonging to a token
the client has not visited. Cross-event bleed is structurally impossible because the token is in the key.

**Revocation.** Every successful online payload fetch refreshes the cache. A `410 Gone` (revoked/unpublished/
disabled) causes the worker to delete all caches for that token and the page to show the unavailable state.
The client also re-validates on `online` and on `visibilitychange`.

**Staleness UX.** `OfflineBanner` shows a small "Offline — showing your saved guide", the last successful sync
time as a relative string, and "content may have changed since then". Online with a newer version available
shows a single "Updated — refresh" action.

**Chunk safety.** A `ChunkLoadError` (or a failed dynamic import) triggers `recoverFromStaleChunks()`: unregister
the worker, delete `event-guide:*` caches, and reload **once**, guarded by a `sessionStorage` flag so a
persistently broken deploy cannot cause a reload loop. Old caches are pruned on every `activate`.

**Seating while offline.** The Seating tab renders an explicit, calm message — "Seat lookup needs an internet
connection. Your programme and menu are available offline." No spinner, no request, no infinite loader. The
Programme and Menu tabs stay fully usable.

### 5.2 Why standard offline mode never contains seating

A public PWA cache is a browser asset: anything in it can be read by anyone holding the device or inspecting
storage. Shipping a seating index there would mean publishing a guest list. Therefore in Level 1, seating is
**server-only, always**. The optional "Venue Offline Seating" capability is Level 2, is organizer-enabled per
event, and never ships the index as a public downloadable browser asset — it ships inside an authenticated,
signed, expiring pack that an organizer downloads while signed in.

### 5.3 Level 2 — Venue Offline Pack

**Shape.** A signed ZIP, downloaded by an authorised organizer, run on a laptop / mini-server / venue PC on
the venue Wi-Fi. Guests scan the **Venue Offline QR** and reach the guide over the local network.

```
manifest.json        format, packVersion, guideVersion, eventTitle, issuedAt, expiresAt,
                     tokenPrefix, seatingPrivacyMode, signature (HMAC-SHA256 over the body digests)
guide.json           published snapshot: header, theme, programme, menu — identical to the public payload
seating-index.json   privacy-mode-filtered search index (absent entirely when seating is off)
assets/              theme background, logo — public assets only
server/serve.mjs     zero-dependency Node runner
README.md            operator instructions, including the Wi-Fi-only warning
```

**Token.** `mintOfflinePackToken()` produces `egp1.<nonce>.<hmac>`; only `sha256(token)` is stored on the
server (`EventGuideOfflinePack.tokenHash`), matching the existing vendor-pass pattern. The raw token is shown
once at download time and embedded in the pack manifest. Rotating or revoking it invalidates every previously
downloaded pack on next sync and immediately breaks the Venue Offline QR's link once re-imported.

**Integrity.** The manifest carries an HMAC-SHA256 signature over the SHA-256 digests of every packed file.
`serve.mjs` verifies the signature at boot and refuses to start on mismatch, so a tampered pack does not run.

**Expiry & ownership.** `expiresAt` (default: event end + 48h) is enforced both server-side at export and
locally by the runner, which stops serving and prints a clear message. The manifest names the event and the
pack version; it contains no organizer credentials, no session cookie, no API key, no private invite links,
no emails, no full phone numbers, and no payment data.

**Local API restrictions.** The runner serves only `GET /guide/<token>`, `GET /assets/*`,
`POST /guide/<token>/seating`, and `POST /guide/<token>/event`. Directory browsing is off, path traversal is
rejected, unknown paths return 404 with no body, and the seating endpoint is rate limited per client IP with
the same thresholds as production.

**Seating privacy modes** (organizer choice; default is the most private option that still works):

| Mode | Index contains | Guest enters |
| --- | --- | --- |
| `CODE_ONLY` *(default)* | SHA-256 of the admission code → table/zone label | their code |
| `HASHED_NAME` | SHA-256 of a normalised name key → table/zone label | their name |
| `NAME_INDEX` | normalised name → table/zone label | their name |

`CODE_ONLY` and `HASHED_NAME` mean the pack contains **no readable guest names at all** — a stolen pack yields
nothing without already knowing the code or the exact name. `NAME_INDEX` is available for events that need
tolerant matching and is clearly labelled as the least private option in the admin UI.

**Sync.** Pre-event: the organizer downloads the pack, which snapshots published content + theme + token +
version + (optionally) the seating index. During the event: the runner queues anonymous events (tab opened,
seating search attempted/succeeded — counts only, no queries, no names, no IPs). On reconnect the organizer
uploads the queue through the authenticated `/api/event-guide/offline-sync`, which:

- rejects a queue whose `packVersion` no longer matches a live, unrevoked pack,
- **never overwrites newer server data** — if `serverGuideVersion > packGuideVersion` the content half of the
  sync is refused and reported as a conflict, while anonymous counters still merge (they are additive),
- returns a sync report: accepted counters, conflicts, current server version, and whether a fresh pack is needed.

The local pack **cannot modify live seating**. It has no write path to seating at all; assignment changes
remain an authenticated organizer workflow in the seating studio.

### 5.4 Two QR types — never auto-replacing each other

| | Online | Venue Offline |
| --- | --- | --- |
| `EventQrLinkType` | `EVENT_GUIDE` | `EVENT_GUIDE_OFFLINE` |
| Destination | `https://www.celeventic.com/event-guide/{publicToken}` | organizer-configured, e.g. `http://eventguide.local/guide/{offlineToken}` |
| Sign label | **Main** | **Backup — event Wi-Fi only** |

They are separate rows with separate tokens and separate statuses. Rotating one never touches the other, and
the sign designer's dual-QR layout always labels which is which, printing the Wi-Fi name under the backup code.

### 5.5 Honest limits of Level 2 in this branch

What ships: the pack **format**, the authenticated signed **export**, the **local runner script**, the **sync
API with conflict detection**, and the **Offline Readiness admin with a guided test**. What does not ship: a
managed hardware appliance, automatic local DNS/mDNS provisioning for `eventguide.local`, TLS on the local
address, or auto-discovery. The operator must run the script and configure the local hostname or use the
printed IP address. Residual risks are listed in §8.

---

## 6. Migrations

One additive, SQLite-safe migration: `20260806120000_event_guide`.

- Two new `EventQrLinkType` enum values. In SQLite, Prisma enums are `TEXT` with a `CHECK`-free representation,
  so adding values requires **no table rewrite and no data migration**.
- `CREATE TABLE event_guides` (one row per event, `eventId` unique, FK `ON DELETE CASCADE`).
- `CREATE TABLE event_guide_offline_packs` (FK to `event_guides`, `ON DELETE CASCADE`).
- `CREATE TABLE event_guide_view_stats` (aggregate counters, unique on `(guideId, day, tab)`).

No `DROP`, no `ALTER … RENAME`, no column type changes, no back-fill of existing rows, and therefore nothing
that `prisma migrate reset` would be needed for. Every existing row keeps working: an event with no
`event_guides` row simply has no guide, and `resolveGuideContent` falls back to the invitation sources.

Validated with `npm run migrations:validate:sqlite` and `prisma migrate status`.

---

## 7. Tests

| Area | File | Asserts |
| --- | --- | --- |
| Token isolation | `src/lib/event-guide/__tests__/guide-access.test.ts` | wrong type, revoked, disabled, expired, and unpublished tokens all resolve to `unavailable` with a reason — never to content. |
| Draft is never public | same | a `DRAFT` guide yields no programme/menu in the public payload. |
| Public payload safety | `src/lib/event-guide/__tests__/public-payload.test.ts` | serialised payload contains no `id`, email, phone, or admission-token shaped values. |
| Seating privacy | `src/lib/event-guide/__tests__/seating-finder.test.ts` | min query length, max matches, ambiguous-match refusal, cross-party leakage, plus-ones nested under party. |
| Theme | `src/lib/event-guide/__tests__/theme.test.ts` | invitation theme is inherited; overrides apply; contrast gate blocks unreadable combinations. |
| Import parse | `src/lib/event-guide/__tests__/programme-import.test.ts` | paste formats parse, import stages to draft and never auto-publishes. |
| Offline cache isolation | `src/lib/event-guide/__tests__/offline-cache.test.ts` | cache keys differ per token and per version; stale-version and foreign-token caches are pruned. |
| Offline pack privacy | `src/lib/event-guide/__tests__/offline-pack.test.ts` | pack contains no emails/phones/admission tokens; `CODE_ONLY`/`HASHED_NAME` contain no readable names; signature verifies and detects tampering; expiry enforced. |
| Sync conflicts | `src/lib/event-guide/__tests__/offline-sync.test.ts` | newer server version is never overwritten; counters merge additively; a revoked pack's queue is rejected; replaying the same queue twice does not double-count. |
| QR labelling | `src/lib/event-guide/__tests__/qr-signage.test.ts` | online and venue-offline links are distinct rows/tokens; the offline sign always carries the Wi-Fi-only warning. |

Run with `npm run test:event-guide` (node's built-in runner via `tsx --test`, matching every other suite in
this repo — the repo has no vitest and no Playwright dependency, so device coverage is expressed as
fixture-driven viewport tests rather than a new browser runner; see §8).

---

## 8. Risks & residual gaps

1. **Level 2 is scripts + format + runner, not an appliance.** No mDNS, no TLS on the local address, no
   auto-update. Mitigation: the Offline Readiness checklist walks the operator through the 10 steps and the
   printed sign carries the Wi-Fi-only warning.
2. **HTTP on the local address.** Browsers treat `http://eventguide.local` as a non-secure origin, so the
   local guide gets no service worker and no persistent cache. It works as a plain server-rendered page. This
   is correct — the pack is the offline mechanism there, not the browser cache.
3. **`NAME_INDEX` privacy mode ships readable names inside the pack.** It is opt-in, labelled, and never the
   default. Organizers who choose it are shown exactly what it means before saving.
4. **No Playwright in this repo.** Device-profile coverage is implemented as viewport/layout unit tests plus
   documented manual device checks, rather than adding a browser runner and its binaries to a repo that has
   never had one. If Playwright is later adopted, the fixtures in `src/lib/event-guide/__tests__/fixtures.ts`
   are already env-driven and carry no real tokens.
5. **Aggregate-only analytics** means no funnel analysis. Deliberate: per-visitor rows on a public guest
   surface are a privacy liability we chose not to create.
6. **Programme/menu still originate in the invitation** for organizers who never open the guide editor. If an
   invitation is unpublished after the guide is published, the published snapshot keeps serving the last
   approved content, which is the safe behaviour but can look stale. Surfaced in the builder as
   "published snapshot is older than the current invitation content".

---

## 9. Deploy

```bash
bash /root/deploy-celeventic-live.sh
```

Rollback: `pm2 restart celeventic` after `git checkout <previous-sha>` and `npx prisma migrate deploy` is a
no-op for this migration (it is purely additive, so the previous build runs unchanged against the new schema —
no down-migration is required). If the guide must be switched off without a deploy, set the `EVENT_GUIDE`
`EventQrLink` status to `DISABLED` for the affected event; guests get the polished unavailable page.
