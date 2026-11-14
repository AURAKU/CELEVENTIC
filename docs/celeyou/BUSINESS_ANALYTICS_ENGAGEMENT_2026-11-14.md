# CeleYou business analytics and engagement

Date: 14 November 2026  
Scope: strengthen existing owner Activity using `SmartCardInteraction`. No new Prisma table. No new paid analytics lock. Not deployed.

## 1. Existing system (audit)

Already in place before this pass:

- Model `SmartCardInteraction` (cardId + createdAt index, kind index). Comment: privacy-minimized, no raw IPs in dashboards.
- Card `viewCount` plus `profile_open` rows.
- Public beacon `POST /api/digital-business-cards/public/{slug}/events` (sendBeacon, 204, crawler/owner skip, 40/min rate limit).
- Server QR: `/c/{token}` writes `qr_open` only when `recordOpen`.
- Server NFC: `/n/{token}` writes `nfc_tap` only when tap outcome is `open`.
- Owner API `GET /api/digital-business-cards/{id}/analytics` with date range and cursor pagination.
- Studio Activity panel (Arrive / Reach / Pass on), lazy-loaded, date presets.
- Admin command overview already counted live cards, paid terms, expiring, courtesy.

Owner authorization is `getDigitalCardForUser`. Published Pro is the only live plan; analytics was not separately paywalled. That stays.

## 2. Event taxonomy

| Kind | Source | Outcome | Meaning |
| --- | --- | --- | --- |
| `profile_open` | Public profile server | completed | Guest opened `/u` or `/card`. Owners and crawlers skipped. |
| `qr_open` | `/c/{publicToken}` | completed | Smart QR **link** used. The same URL can be typed or shared. |
| `nfc_tap` | `/n/{nfcToken}` and outcome `open` | completed | NFC **tag address** used. Paused, lost, or replaced tags are not taps. |
| `vcard_save` | Guest Save Contact tap | attempted | Tap. Not proof the phone saved the contact. |
| `vcard_download` | `contact.vcf` served | completed | Contact file was actually downloaded. |
| `call_tap` / `whatsapp_tap` / `email_tap` / `website_tap` | Reach tap | attempted | Published action opened. |
| `social_tap` | LinkedIn and other socials | attempted | Brand stored in meta (`linkedin`, …). |
| `location_tap` | Maps tap | attempted | |
| `meeting_open` | Guest picked a meeting slot | attempted | Booking UI used. |
| `meeting_booked` | `POST /meet` success | completed | Meeting request stored. |
| `payment_open` | Wallet / bank sheet opened | attempted | **Not a Paystack charge.** |
| `share_tap` | Share sheet or copy | attempted | Not proof a message was sent. |
| `connect` | Connect Back submitted | completed | |

Client beacons cannot mark `completed`. `celeYouEventOutcome` forces payment/share/save taps to attempted.

## 3. Attribution

- QR and NFC use distinct tokens (`/c` vs `/n`). Counts are channel-accurate, not “this person physically scanned a printed code.”
- Copy on the owner dashboard states that a `/c` link can also be typed or shared.
- NFC copy states that only the tag address is counted.
- Device mix is `phone | tablet | desktop | unknown` from the User-Agent family. The raw UA is not stored.

## 4. Dashboard

Studio Activity now includes:

- Overview metrics (views plus Arrive / Reach / Pass on).
- Date presets (today, 7d, 30d, month, all, custom). Custom ranges clamp to 90 days.
- Engagement trend (lazy SVG, last 30 days when totals are all-time).
- Popular actions ranked, labelled attempted vs completed.
- Device mix for the trend window.
- Paginated recent activity (`Load more` via cursor).
- Honest footnotes for QR, NFC, contact, share, and payment.

Polling is 30 seconds and pauses while the tab is hidden. Public profiles still use sendBeacon and do not wait on analytics.

## 5. Privacy and retention

- No IP, email, or User-Agent in interaction meta returned to owners.
- Rate-limit keys may hash IP in memory only.
- Owner activity sanitizes to `surface`, `reason`, `brand`, `outcome`, `device`, `attribution`.
- Cross-account reads 404 via `getDigitalCardForUser`.
- Display retention: trend and custom ranges bound to 90 days; series scan at most 4,000 rows. Rows are not auto-deleted (`CELEYOU_ANALYTICS_RETENTION_DAYS = 730` as a documented bound, not a purge job).

## 6. Subscription

Analytics remains owner-authorized. `advancedAnalytics` on unpublished Free/Business/Teams is not activated. Trial and Pro owners who already open studio keep Activity. No silent premium lock.

## 7. Admin

`getCeleCardCommandOverview` now adds:

- `publishedCards`
- `engagement` for the last 30 days: profile opens, QR, NFC, contact taps, vCard downloads, payment opens, shares

Tiles appear on CeleYou services overview. Aggregates only. No visitor identities.

## 8. Tests

`npm run test:celeyou`: **307 / 307 pass**.

New `analytics.test.ts` covers taxonomy, attempted vs completed, reach mapping, device sanitization, trend/popular/clamp, owner-only API, and no paid lock.

## 9. Performance (local, 14 Nov 2026)

| Measurement | Result |
| --- | --- |
| In-memory trend + popular + devices for 4,000 rows | **11 ms** |
| Owner analytics API after warmup (`/analytics` for Kojo) | **499–1,298 ms** |
| Same API during first compile of the new query | 22–120 s (dev compile, not production) |
| Public event path | sendBeacon / 204; 40 events/min plus 1 per kind per 2 s |

Indexed `cardId + createdAt` groupBy remains the overview query. Trend uses a bounded `findMany` (max 4,000). No full-table scan on owner dashboards. Admin engagement is last 30 days only.

## 10. Screenshots

Local studio Activity on Kojo Mensah (`127.0.0.1:3012`), 14 Nov 2026:

- Profile views **602**
- QR opens **7**, NFC taps **3**, Save contact **22**
- Calls **1**, WhatsApp **1**, Shares **2**, Connections **3**
- Date range All time, Live badge, CeleYou teal/cream tiles

The live API for that card already returns `popular`, `trend` (30 points), `notes`, `activity` (20 + cursor), and `vcardDownloads`. The expanded client sections (trend chart, popular list, device mix, Load more) are in the studio panel source. A stuck webpack pack cache on the long-running `:3012` dev process kept serving the previous client bundle during this session. Restart that Next process before visual QA of the new blocks. Do not treat the older screenshot as missing server data.

## 11. Remaining gaps

| Gap | Why |
| --- | --- |
| Historical rows have `device: unknown` | Device category starts with new events. |
| No daily rollup table | Reused `SmartCardInteraction`. Add `SmartCardDailyStat` later if a card exceeds 4,000 events / 30 days. |
| Playwright e2e | Chromium install still failed in this environment. |
| Auto purge after 730 days | Not implemented. Destructive. |

## 12. Deployment

Do **not** auto-deploy.

1. No Prisma migration.
2. Restart the Node process that serves studio so the Activity panel bundle refreshes.
3. Confirm Paystack is unrelated: `payment_open` must never credit a subscription.
4. Smoke: owner analytics 200, other user’s card 404, `/c` still counts `qr_open`, `/n` paused tag does not count `nfc_tap`, Save Contact tap is `vcard_save`, vcf response is `vcard_download`.
