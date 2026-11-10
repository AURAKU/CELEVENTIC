# CeleCard progress tracker

Updated: 2026-11-09

V1 digital experience (dummy Ama): Card Mode, landscape, share metadata, QR tap, public profile, Save contact. Signed-in Create → Publish is not browser-verified. Real-device camera and rotation are pending.

Continuity V2.0: lifecycle, courtesy DTO, reconnect, Design Vault, reminder offsets, admin policy form. Dummy courtesy at `/card/ama-serwaa-courtesy` browser-verified (modal on load/reload, close keeps preview, anonymous reconnect). Billing catalog is served from `/api/digital-business-cards/plans`. Paystack sandbox and signed-in reactivation are not.

| Feature | Class |
|---|---|
| Shared-account CeleCard signup | VERIFIED COMPLETE (unit) |
| Owner create / edit / publish | VERIFIED COMPLETE (studio + API; browser owner journey not in e2e) |
| Public live / withheld profiles | VERIFIED COMPLETE (unit + dummy browser) |
| Profile QR `/c/{token}` | VERIFIED COMPLETE (dummy) |
| QR PNG/SVG export | VERIFIED COMPLETE (PNG/SVG/transparent/branded; camera scan on hardware pending) |
| Card PNG export with embedded QR | VERIFIED COMPLETE (1712×1080 Gold Folio dummy; camera scan of the file pending) |
| Live QR tap to public profile | VERIFIED COMPLETE (dummy Card Mode and public plate; hardware camera pending) |
| Card Mode / immersive present | VERIFIED COMPLETE (dummy browser: phone, tablet, desktop, orientation metrics; hardware rotation pending) |
| Personalized OG 1200×630 | VERIFIED COMPLETE (server meta + 1200×630 PNG; unpublished 404; phones/emails stripped) |
| Owner show/share desk | IMPLEMENTED — TESTING PENDING (dummy Show my card verified; signed-in studio behind login) |
| vCard | VERIFIED COMPLETE (unit; omits protected fields) |
| Social + pay + bank sharing | VERIFIED COMPLETE (unit + dummy studio) |
| NFC landing | PARTIALLY IMPLEMENTED |
| NFC write | IMPLEMENTED — TESTING PENDING (Chrome Android Web NFC only) |
| Per-item privacy redaction | VERIFIED COMPLETE (unit; server DTO + vCard) |
| Access codes | IMPLEMENTED — TESTING PENDING (owner/guest browser E2E) |
| Request access | IMPLEMENTED — TESTING PENDING (owner/guest browser E2E) |
| Connect Back inbox | IMPLEMENTED — TESTING PENDING (studio paginated inbox + courtesy reconnect API; login wall) |
| Connect rate limit | VERIFIED COMPLETE (route + unit policy) |
| Lifecycle state machine | VERIFIED COMPLETE (unit; DRAFT/ACTIVE/EXPIRING/GRACE/COURTESY/SUSPENDED/DELETED) |
| Courtesy Mode DTO + modal | VERIFIED COMPLETE (dummy `/card/ama-serwaa-courtesy`; private reach absent from HTML and JSON) |
| Courtesy reconnect | VERIFIED COMPLETE (dummy anonymous request; owner email path unproven on a paid card) |
| Design Vault | IMPLEMENTED — TESTING PENDING (studio + APIs; login wall) |
| Renewal reminders 14/7/3/1/0/+3/+14/+30 | IMPLEMENTED — TESTING PENDING (unit offsets; `scripts/run-celecard-renewals.ts` exists, not scheduled) |
| Owner courtesy / reactivate copy | IMPLEMENTED — TESTING PENDING (studio + billing; login wall) |
| Admin CeleCard overview | IMPLEMENTED — TESTING PENDING (`/admin/celecard` + policy PATCH form; login wall) |
| Analytics dashboard | PARTIALLY IMPLEMENTED (lifecycle events written; no owner charts) |
| Admin console | PARTIALLY IMPLEMENTED (CeleCard lifecycle page only) |
| Digital wallet pass (Apple/Google) | NOT STARTED (separate phase after the web Card Mode launch) |
| First journey Register → Create → Share unpaid | VERIFIED COMPLETE (local Kojo Mensah; visitor withheld; `/c/{token}` stable) |
| Live Paystack sandbox acceptance | BLOCKED (PAYSTACK keys empty; checkout now returns 503 instead of crashing) |
| Production deploy | NOT STARTED (authorization required) |

Local SQLite: additive `smartcard_access_*` and Continuity V2 columns/tables applied to `prisma/dev.db` (`scripts/sql/celecard-continuity-v2.sql`). Did not run `prisma migrate deploy` because this database was shaped with `db push` and 25 older migration files are untracked there.

Never treat UI-only as complete.
