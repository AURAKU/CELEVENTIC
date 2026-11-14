# CeleYou Release Readiness & System Integration — 2026-11-14

**Verdict: NO-GO for production deploy.** Stopped at the production approval gate. No automatic deploy was performed.

Statuses use only **PASS**, **FAIL**, and **BLOCKED**. Unexecuted checks are **BLOCKED**, never PASS.

---

## 1. Completed features (in tree)

| Area | Status | Notes |
| --- | --- | --- |
| Free plan + optional 7-day Pro trial (server entitlements) | PASS | Feature-flagged; trial gated on paid history |
| Existing subscriber protection module + audit script | PASS | `subscriber-protection.ts`, audit script, docs |
| Paid-after-grace stays COURTESY (not Free) | PASS | Release fix in `lifecycle.ts` this session |
| Username identity `/u/{username}` + permanent `/c` `/n` tokens | PASS | Covered by automated suite |
| Connect Back lead pipeline (New → Archived) | PASS | Stages, filters, counts wired |
| Reminder scheduling upgrade | PASS | Tomorrow / 3d / 7d / custom datetime; default 1 day preserved; cancel independent of stage |
| Hidden dock apps full color (no feint) | PASS | Alipay lock badge only; full color in browser |
| Company logo / house seal sizing on plate | PASS | Classic landscape preserved |
| Prepaid GHS catalog (49 / 129 / 239 / 399) + Concierge separate | PASS | International pricing flag off |

---

## 2. Outstanding issues

| Issue | Status | Impact |
| --- | --- | --- |
| No production-exported sanitized subscription dump available to this agent | BLOCKED | Phase 1 production-copy audit incomplete |
| Local Next on 3012 intermittently times out on `/u` and `/n` under curl | FAIL | Perf instability local only; browser `/u` still rendered |
| `/c/{publicToken}` on local 3012 redirected to `https://www.celeventic.com/card/kojo-mensah` | BLOCKED | Confirm deploy host `APP_URL` / public origin before cutover |
| Full browser E2E of Free→trial→paid→renewal→expire not executed end-to-end | BLOCKED | Covered partially by unit/integration tests |
| Connect Back reminder UI browser click-path not executed | BLOCKED | Code + unit/wiring tests PASS |

---

## 3. Subscriber-protection audit results

### Code & unit verification — PASS

- Module: `src/lib/digital-business-card/subscriber-protection.ts`
- Tests: included in `npm run test:celeyou` (349/349 PASS)
- Docs: `docs/celeyou/EXISTING_SUBSCRIBER_PROTECTION_2026-11-14.md`
- Audit script: `scripts/celeyou-subscriber-protection-audit.ts` (read-only)

### Ten protection criteria

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Existing paid subscriptions remain active | PASS (code/tests) / BLOCKED (prod copy) | Classification + COURTESY fix; no prod export |
| 2 | Remaining subscription days unchanged | PASS (code/tests) / BLOCKED (prod copy) | Activation refuses shorten; migration additive |
| 3 | Existing prices unchanged | PASS (code/tests) / BLOCKED (prod copy) | Catalog + charge quote preference; no rewrite |
| 4 | Entitlements remain available | PASS (code/tests) / BLOCKED (prod copy) | Paid/grace/courtesy gates |
| 5 | No automatic trial for paid subscribers | PASS | Trial eligibility + `paymentFailureShouldActivate() === false` |
| 6 | No incorrect Free downgrade | PASS (code) | Paid history after grace → `COURTESY`, not `FREE` |
| 7 | QR / NFC destinations functional | PASS (token continuity) / BLOCKED (prod host confirm) | Tokens unchanged; local `/c` redirected to production host |
| 8 | Payment history preserved | PASS (code/migration) / BLOCKED (prod copy) | Additive migration; audit `destructiveUpdates: false` |
| 9 | Renewal behavior compatible | PASS (tests) | Billing lifecycle suite; early renewal from current end |
| 10 | Ambiguous legacy not auto-reclassified | PASS (code/tests) | `existing_ambiguous_account` + auto-apply flag false |

### Audit runs executed

**A. Local `prisma/dev.db`** — executed

```json
{
  "cardBuckets": { "active": 0, "expired": 0, "trial": 1, "free": 0, "pending_payment": 0, "other": 0 },
  "accountClasses": { "new_trial_account": 1 },
  "reviewRequiredAccounts": 1,
  "destructiveUpdates": false
}
```

**B. Synthetic sanitized fixture** (`/tmp/celeyou-sanitized-audit.db` via `scripts/celeyou-seed-sanitized-audit-fixture.ts`) — executed

```json
{
  "cardBuckets": { "active": 1, "expired": 2, "trial": 1, "free": 0, "pending_payment": 0, "other": 1 },
  "accountClasses": { "new_trial_account": 1, "existing_active_subscriber": 1 },
  "successAdvertisingPayments": 1,
  "activeNfcDevices": 2,
  "destructiveUpdates": false
}
```

Note: Fixture is **synthetic sanitized**, not a production export.

**C. Production sanitized export** — BLOCKED (not provided; agent must not pull live VPS DB)

---

## 4. Automated test results

| Suite | Result |
| --- | --- |
| `npm run test:celeyou` | **PASS** — 349 pass / 0 fail |
| Focused subscriber-protection + Connect reminder tests | **PASS** (included above) |

Release fix that unblocked the suite: paid history after grace resolves to `COURTESY` instead of incorrectly falling through to `FREE`. Tests for Free/trial/catalog/Connect empty copy/username multi-card Pro entitlement were aligned to product rules.

---

## 5. Browser test results

| Check | Status | Evidence |
| --- | --- | --- |
| Public profile `/u/kojo-mensah` | PASS | Title “Kojo Mensah on CeleYou”; heading; plate visible |
| Original card plate (elegant-frost classic) | PASS | Landscape gold border, CeleYou mark, tagline “One Identity. Infinite Connections.” |
| Official logo / no redesign | PASS | Teal C-orb + brand lockup unchanged |
| Payment wallets (GCB, MoMo, Alipay) | PASS | Alipay full color with EyeOff badge only |
| Connect Back CTA | PASS | “Renvoyer vos coordonnées…” / Se connecter en retour |
| Contact save CTA | PASS | Enregistrer le contact |
| Share CTA | PASS | Partager |
| Username routing | PASS | `/u/kojo-mensah` resolves |
| QR token route `/c/{publicToken}` | BLOCKED | 307 to `https://www.celeventic.com/card/kojo-mensah` (host origin); browser followed to chrome-error |
| NFC route `/n/{nfcToken}` | BLOCKED | Local curl timeout; not visually confirmed this session |
| Mobile viewport regression | BLOCKED | Not executed this session |
| Connect inbox reminder presets UI clicks | BLOCKED | Not executed; source wiring tested |
| Full Free→trial→paid journey in browser | BLOCKED | Not executed |

---

## 6. Security findings

| Control | Status | Notes |
| --- | --- | --- |
| Session gates on owner APIs | PASS | `getServerSession` on subscribe/trial/activation/username/etc. |
| Rate limits | PASS | Meet, trial, activation, username availability, connect prefs |
| Idempotency on concierge checkout | PASS | Idempotency key present |
| Security headers (`next.config.ts`) | PASS | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| CSP / HSTS | BLOCKED | Not asserted against production responses this session |
| Guest payload secret stripping | PASS | Access suite |
| No auto-charge after trial | PASS | `paymentFailureShouldActivate() === false`; trial opt-in only |
| Production auth penetration | BLOCKED | Not executed |

---

## 7. Performance findings

| Check | Status | Notes |
| --- | --- | --- |
| Public `/u` browser render | PASS | Profile usable |
| Public `/u` curl latency | FAIL | Intermittent 8–10s timeouts on 3012; later sample 200 in ~0.22s |
| Connections pagination | PASS | `page` / `pageSize` / `take` in workspace service |
| NFC `/n` curl | FAIL | Timeout this session |
| Production APM / DB EXPLAIN | BLOCKED | Not executed |

---

## 8. Database migration requirements

Apply **additive only** (already in tree; review before production):

1. `20261114170000_celeyou_usernames`
2. `20261114180000_celeyou_username_delete_hold`
3. `20261114210000_celeyou_freemium_trial`

Guarantees for freemium migration:

- No `UPDATE` / `DELETE` of `digital_business_cards` subscription fields
- No QR `publicToken` / NFC `publicToken` rewrite
- Schema default `FREE` applies to **new inserts only**

**Production `prisma db push` against live DB: prohibited.** Use reviewed additive SQL / migrate deploy with backup.

---

## 9. Deployment blockers

1. **BLOCKED** — Production sanitized subscriber audit not run against real exported records.
2. **BLOCKED** — Explicit human deployment approval not obtained (required).
3. **BLOCKED** — Confirm production public origin so `/c` and `/n` destinations match issued QR/NFC stock.
4. **FAIL** — Local server instability on some public routes under curl; stabilize or verify on staging host before cutover.
5. **BLOCKED** — Full payment webhook renewal/expiry dry-run on staging not executed this session.
6. Rollback plan must be acknowledged by operator (see §10).

Until all blockers clear: **production deployment is prohibited.**

---

## 10. Recommended deployment sequence (after approval)

1. Snapshot / backup production SQLite (or host backup) and export sanitized subscription rows for audit.
2. Run `celeyou-subscriber-protection-audit.ts` against that sanitized copy → require `destructiveUpdates: false` and paid cohorts intact.
3. Apply additive migrations on a staging clone; smoke `/u`, `/c`, `/n`, Paystack webhook idempotency, trial opt-in, Connect stages/reminders.
4. Deploy backend build with flags:
   - `CELEYOU_FEATURE_FREE_PLAN=true`
   - `CELEYOU_FEATURE_PRO_TRIAL=true`
   - `CELEYOU_FEATURE_INTERNATIONAL_PRICING=false`
   - `CELEYOU_FEATURE_AUTO_APPLY_FREE_TRIAL_TO_LEGACY=false`
5. Canary: new Free signup + optional trial only; existing paid untouched.
6. Expand gradually; monitor payments, trial expiry jobs, NFC tap counts.
7. **Do not** auto-charge after trial; conversion is explicit checkout only.

### Rollback plan

1. Keep previous app artifact / PM2 process list ready (operator-owned; agent does not SSH).
2. Feature-flag off Free/trial if needed (`CELEYOU_FEATURE_PRO_TRIAL=false`, optionally Free off) without rewriting paid rows.
3. Migrations are additive — do not reverse-drop trial tables under load unless operator-approved; paid rows remain untouched.
4. QR/NFC tokens are not regenerated by this release — rollback restores app binary/config only.
5. Re-run subscriber-protection audit after rollback to confirm paid cohorts unchanged.

---

## Phase summary

| Phase | Status |
| --- | --- |
| 1 Subscriber protection | **BLOCKED** (code PASS; prod sanitized copy missing) |
| 2 Free / trial / paid journey | **PASS** (automated) / **BLOCKED** (full browser E2E) |
| 3 Connect Back + reminders | **PASS** (code + tests); UI click-path **BLOCKED** |
| 4 Regression | **PASS** (profile/plate/payments/connect CTA); QR host / NFC / mobile **BLOCKED** |
| 5 Performance & security | **PASS** (controls present); latency intermittency **FAIL**; prod CSP/HSTS **BLOCKED** |
| 6 Release report | **PASS** (this document) |

**Production approval gate: CLOSED.** Awaiting explicit deployment approval after blockers clear.
