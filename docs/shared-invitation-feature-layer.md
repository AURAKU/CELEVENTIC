# Shared Invitation Feature Layer — Architecture & Plan

Status: **PLAN (no code yet)** · Owner: platform · Scope: platform-wide guest-facing
feature layer across every invitation template + every existing live invitation.

This document maps the "Global System-Wide Update Requirement" spec to what
**already exists** in the codebase and specifies the **minimum additive design**
for the gaps. The guiding principle (spec §2, §18): **extend the existing
EntitlementService — do not build a parallel feature system.**

---

## 0. Executive summary

Most of the requested architecture already exists as the **EntitlementService +
FeatureKey registry + blueprint registry + `EventEnabledFeature` + packages**,
and the public renderer is already `force-dynamic`, so several headline
acceptance criteria are **already satisfied**:

| Spec requirement | Already true because… |
|---|---|
| §1/§19.2–3 Existing published invitations get features, URLs unchanged, no republish | Public renderer `src/app/invite/[link]/page.tsx` is `dynamic="force-dynamic"`, `revalidate=0`; reads latest event/invitation/order/design each request. Nothing is baked at publish. |
| §7/§19.9 Live config updates appear promptly | Same — plus admission endpoints are `no-store` (built in the Post-Admission phase). |
| §2 Central feature registry + defaults + permissions | `src/lib/blueprints/feature-keys.ts` (`FeatureKey`), `src/lib/blueprints/registry.ts` (defaults + `sortOrder`), `src/services/entitlements/entitlement.service.ts` (resolver + permissions via `FEATURE_TO_PERMISSION`). |
| §4 Event config + platform default inheritance | `EntitlementService.canUseFeature()` resolves blueprint default → plan/package → `EventEnabledFeature`. |
| §13 Feature ordering | `EventEnabledFeature.sortOrder` + blueprint registry `sortOrder`. |
| §11 Permission model (server-enforced) | `resolveEventAccess` / `requireEventPermission` / `EventPermissionKey`. |
| §9 Provisioning/backfill mechanism | `src/services/entitlements/workspace-provision.service.ts` seeds `EventEnabledFeature`. |
| §12 Background jobs for bulk | `BackgroundJob` model + `JobStatus`. |
| §6 Soft-delete/retain financial+admission+audit | `EventGiftPayment`, `EventWalletLedgerEntry`, `AdmissionEvent` (append-only), `AuditLog`, `QrScan` are already retain-only; gift/receipt have `revokedAt`/status. |

**Therefore the real work is 6 additive gaps, not a rewrite:**

1. **Invitation-level override** (the 3rd inheritance level) — event config is per-event today.
2. **Guest-facing feature resolver** — one function the public renderer/portal calls to get `{enabled, order, config, version}` per guest-facing feature (today guest gating is ad-hoc: `addonFulfillmentService.hasFeature` + inline checks).
3. **Feature-version fields** (§10) — additive columns + schema-validated defaults.
4. **Invitation-features backfill command** (§9) — idempotent, resumable, manifest.
5. **Template feature adapter** (§3) — presentation tokens with a polished default.
6. **Guest-facing management UI + per-feature audit + bulk + dependency warnings** (§5, §12, §16, §17).

---

## A. Shared feature architecture (§2)

Reuse and extend:

- **Registry:** extend `FeatureKey` with the guest-facing ids not yet present:
  `ENTRY_PASS`, `MANUAL_ADMISSION_CODE`, `PARTY_ADMISSION`, `POST_ADMISSION_PORTAL`,
  `SEATING_REVEAL`, `EVENT_SERVICES`, `ANNOUNCEMENTS`, `GUEST_HELP`, `AUDIO`,
  `MAP_DIRECTIONS`, `COUNTDOWN`, `GIFT_WALLET` (alias of `CONTRIBUTIONS`/`EVENT_WALLET`),
  `LIVE_PROGRAMME` (alias of `TIMELINE`/`AGENDA`). Existing ones reused as-is:
  `MENU`, `RSVP`, `MEMORY_VAULT`, `SEATING`, `GALLERY`, `QR_ADMISSION`, `THANK_YOU`, `DRESS_CODE`.
- **Defaults:** a new `INVITATION_FEATURE_DEFAULTS: Record<FeatureKey, InvitationFeatureDefault>`
  (`{ enabledByDefault, guestFacing, order, configSchema (zod), version }`) in
  `src/lib/invitation-features/registry.ts`. Platform default is layer 1.
- **Configuration resolution (new thin wrapper over EntitlementService):**
  `src/services/invitation-features/feature-resolver.ts` →
  `resolveInvitationFeatures(invitation, event, order?)` returns
  `ResolvedInvitationFeatures = Record<FeatureKey, { enabled, order, config, version, source }>`.
- **Renderer/permissions/theme adapter:** the public renderer + portal consume the
  resolved map; permissions stay in EntitlementService; presentation via the adapter (§C).

No admission/wallet/QR/seating/memory logic is duplicated — the resolver only decides
*visibility + order + config*; the existing services still own the behaviour.

## B. Existing published-invitation compatibility (§1)

- URLs are `Invitation.uniqueLink` / `slug` — **never changed**.
- Renderer already dynamic → enabling a feature (event or invitation level) appears on
  the next guest load with no republish.
- Backfill only *adds* missing config rows + missing passes; it never rewrites URLs,
  guests, RSVPs, seating, or existing QR.

## C. Template adapter architecture (§3, §14)

```ts
interface InvitationTemplateFeatureAdapter {
  themeTokens(design): FeatureThemeTokens;      // colours, type, radius, border, motion
  present?(featureKey, ctx): FeaturePresentation | undefined; // optional per-feature override
}
```
- `src/lib/invitation-features/adapters/default-adapter.ts` — derives tokens from
  `design.colors` + `design.fonts` (works for every template, incl. legacy/static).
- Per-template adapters (`forever-afaris`, `traditional-marriage`) provide richer tokens
  (blush/champagne, peach/bronze). Lookup by `design.layout` with default fallback →
  **no invitation breaks because its template predates a feature.**

## D. Configuration inheritance (§4)

Resolution order (invitation override → event → platform default), implemented on top of
`EntitlementService`:

1. **Invitation override** — new sparse JSON `Invitation.featureConfig` (`{ [FeatureKey]: {enabled?, order?, config?} }`). Absent = inherit.
2. **Event config** — `EventEnabledFeature` (isEnabled/isLocked/sortOrder) + package/addons/plan tier (existing `canUseFeature`).
3. **Platform default** — `INVITATION_FEATURE_DEFAULTS` + blueprint `defaultModules`.

No duplicated config: invitation JSON stores only *overrides* (sparse).

## E. Admin & organiser controls (§5, §12)

- Extend the existing per-feature toggle API `/api/events/[id]/entitlements/[featureKey]`
  and add invitation-level `/api/invitations/[id]/features/[featureKey]`.
- Management UI section "Invitation Features" in the event dashboard: enable/disable/
  reorder (drag = `sortOrder`), preview, apply-to-all / selected / exclude, reset-to-default.
- **Bulk** via `BackgroundJob` (affected count, confirm, success/failure report, resumable, audit).
- Server-enforced permissions via `requireEventPermission` (never UI-only).

## F. Safe deletion & archival (§6, §16)

- Retain-only (never hard-delete): `AdmissionEvent`, `QrScan`, `Payment`,
  `EventWalletLedgerEntry`, `EventGiftPayment`, `EventGiftReceipt`, `AuditLog`.
- "Delete feature" = set invitation/event override `enabled=false` (hide), keep records.
- Hard-delete allowed only for unused draft config rows with no dependent activity.
- Dependency-warning copy table (spec §16) rendered before disable/delete.

## G. Cache & revalidation (§7) / H. Real-time (§8)

- Renderer stays `force-dynamic`; admission/payment status endpoints stay `no-store`.
- Add `revalidateTag`/`revalidatePath` on config writes for any cached read paths.
- Real-time: no transport exists → **polling now** (as built for admission), behind a
  small `publishFeatureEvent(name, payload)` seam so SSE/WS can drop in later. Events:
  the §8 list (`INVITATION_FEATURE_ENABLED`, `PASS_REVOKED`, `PORTAL_LOCKED`, …).

## I. Backfill (§9)

`scripts/backfill-invitation-features.ts` (+ `npm run invitation-features:backfill`):
- Flags: `--dry-run`, `--event-id`, `--limit`, `--resume` (cursor), `--rollback` (manifest-driven).
- Steps (idempotent): find published invitations missing `featureConfig`/version → seed
  defaults; ensure `EventEnabledFeature` rows exist (reuse `workspace-provision`); when
  `QR_ADMISSION` enabled, generate missing guest QR + `ensureGuestManualCode` (unique per event);
  set `featureVersion`/`lastMigratedAt`. Writes a JSON manifest of changed records; never
  duplicates passes/config; preserves URLs/guests/RSVP/seating/QR.

## J. Feature versioning (§10)

Additive: `Invitation.featureVersion Int @default(1)`, `Invitation.lastMigratedAt DateTime?`,
`Event.featureConfigVersion Int @default(1)`. Zod schemas with `.default()` for every
feature config → missing fields never fail an old invitation; migrations fill forward.

## K. Permission rules (§11)

Reuse `UserRole` + `EventPermissionKey` + `resolveEventAccess`. Map:
feature management → `EDIT_EVENT`/`MANAGE_GUESTS`; admission/reset → `MANAGE_GUESTS`
(scanners with only `SCAN_QR` excluded); guest = only features enabled for their invitation;
platform admin via `hasFullPackageAccess`. All checks server-side.

## L. Audit (§17)

Reuse `AuditLog` (+ add `AuditAction` values or `entity="invitation_feature"`); optionally
mirror to `EventActivityLog`. Record actor/role/event/invitation/action/before/after/reason/
timestamp/device for every feature create/enable/disable/edit/reorder/archive/restore/
bulk/backfill/QR-(re)gen/admission+portal+wallet+seating change.

---

## Data-model changes (all additive)

| Model | Change |
|---|---|
| `Invitation` | `featureConfig Json?` (sparse overrides), `featureVersion Int @default(1)`, `lastMigratedAt DateTime?` |
| `Event` | `featureConfigVersion Int @default(1)` |
| `FeatureKey` | extend enum-like const with guest-facing keys (code only, no DB) |
| `AuditAction` | (optional) add feature/admission values |

No table drops, no URL changes, no guest/RSVP/seating/QR regeneration. SQLite: apply via
`db push` (repo workflow) + provide versioned migration delta.

---

## Phased build plan

- **Phase A — Foundation:** registry extension + `resolveInvitationFeatures()` + version
  fields + backfill command + wire already-shared features (admission portal, RSVP, map,
  countdown, memory) through the resolver with a default adapter. Unit + integration tests + build.
- **Phase B — Template adapter:** adapter interface + default + forever-afaris/traditional adapters.
- **Phase C — Management + audit + bulk + soft-delete warnings.**
- **Phase D — Real-time seam + cache invalidation + background bulk jobs.**

## Acceptance-criteria mapping (§19)

Already satisfied: 2, 3, 4, 9, 16 (dynamic renderer + retain-only records).
Phase A: 1, 10, 11, 12, 13, 14, 15, 17, 18. Phase B: 10, 11. Phase C: 5, 6, 7, 8.
All phases preserve 19 (no breakage) via additive + feature-flag defaults.

## Final-report skeleton (§20 A–T)

To be filled per phase: A architecture, B compat, C adapter, D inheritance, E controls,
F deletion, G cache, H real-time, I backfill, J versioning, K permissions, L audit,
M files created, N modified, O live-invitation tests, P build, Q deploy, R backfill cmds,
S rollback, T limitations.

## Risks

- **Blast radius:** the resolver sits on every live invitation's render path → Phase A must
  be behind defaults that reproduce today's behaviour exactly (feature enabled-state
  unchanged for existing invitations) and covered by regression tests against
  Traditional, Forever Afaris, a dynamic, and a static template before rollout (§15).
- SQLite/no-migration-history repo → continue `db push` + provide versioned delta.
