# CeleYou Studio 2.0 — Phase 1 Audit & Architecture

**Status:** Phase 1 complete — inventory and proposal only. **No UI restructure shipped in this document.**  
**Date:** 2026-11-15  
**Source of truth:** `src/components/digital-business-card/digital-card-studio-client.tsx` (~1.6k LOC) + child desks  
**Route:** `/dashboard/business-card` → `DigitalCardStudioClient`  
**Onboarding (separate):** `/dashboard/business-card/start` → `CeleYouFirstCardOnboarding`  
**Related:** `/dashboard/business-card/billing`, `/nfc`, `/tap`, `/services`, `/concierge`

---

## 1. Critical constraints (confirmed in code)

| Constraint | Current behavior |
|---|---|
| Do not invent draft≠published without migration | One `StudioForm` + `baseline` JSON; Save publishes when `isPublished`; drafts autosave via PATCH with `publish:false` semantics in `studioPayloadFromForm(form, false)` |
| Do not dual-render the plate | Preview uses `DigitalCardFace` + `DigitalCardReachGrid` (same as guest) |
| URLs / QR / NFC | Slug + `publicToken`; Share desk + NFC studio path; no redesign of destinations |
| Entitlements | Live-term ribbon, activation plans, billing page; Free/Pro/trial rules stay server-side |
| Unsaved protection | `beforeunload` when `unsaved`; localStorage draft via `writeCeleYouStudioDraft`; server autosave only when `studioDraftMayServerAutosave(published)` |

---

## 2. Current Studio surface inventory

### 2.1 Visible DOM destinations (anchor jump nav)

| Anchor | Label today | Primary component / block |
|---|---|---|
| `#studio-activity` | Activity | `DigitalCardAnalyticsPanel` |
| `#studio-activation` | Activation | Inline plan picker + activate CTA |
| `#studio-identity` | Identity | Portrait, name, username, title, company, logo, bio |
| `#studio-look` | Design | `DigitalCardDesignDesk` + `DigitalCardDesignVault` |
| `#studio-contact` | Contact | Emails, phones, websites, locations, meeting desk, slug |
| `#studio-reach` | Reach | Social/pay catalogs + `DigitalCardOtherReservation` |
| *(no jump)* | Privacy | `DigitalCardPrivacyDesk` (Public / Code / Ask + access codes) |
| `#studio-arrange` | *(not in jump)* | `DigitalCardReachOrderEditor` guest page arrangement |
| `#studio-inbox` | Connections | `DigitalCardConnectionInbox` |
| `#studio-connect` | Follow-ups | `DigitalCardConnectAutomations` |
| `#studio-preview` | Share | Live toggles + `DigitalCardStudioPreview` + `DigitalCardShareDesk` |
| `#studio-live` | *(sub)* | Published + NFC ready checkboxes |

**Problem match vs screenshots:** Sticky horizontal `#studio-*` jump still leaves one vertical document. Activity + Activation sit *above* Identity. Preview is sticky mid-column on mobile (`order: 2`, max ~48vh) but buried relative to Contact/Reach/Privacy/CRM. Save lives in masthead only.

### 2.2 Feature inventory → Studio 2.0 destinations

#### A. My Card (default)

| Existing feature | Where it lives now | Keep as-is? |
|---|---|---|
| Portrait upload / crop / frame | `DigitalCardPortraitField` in `#studio-identity` | Yes |
| Marks / avatar studio options | Portrait field + avatar studio | Yes |
| Display name, title, company, bio | Identity fields | Yes |
| Company logo | `DigitalCardCompanyLogoField` | Yes |
| Username / slug | `DigitalCardSlugField` (+ username APIs) | Yes |
| Card list / New card | Masthead `startNew` | Yes |
| Live / Shareable / Offline badge | Masthead from `active` | Yes → status chip on overview |
| Live-term / subscription ribbon | `DigitalCardLiveTermRibbon` (often top of page) | Relocate summary to Settings; compact chip on My Card |
| Courtesy / expired CTA | Inline courtesy card | Settings + compact My Card banner |

#### B. Design

| Feature | Component | Notes |
|---|---|---|
| Start from a Look / themes | `DigitalCardDesignDesk` | Preserve all themes incl. Midnight Executive |
| Composition: classic, portrait-led, type-first, media-first, grid, iconic | Design desk | Organize under Layout category |
| Face lead / name scale | Design desk | Layout category |
| Background, lighting, finish, grain, paper | Design desk | Background / Effects categories |
| Design Vault save/restore/duplicate/delete | `DigitalCardDesignVault` | Saved Looks category |
| Keep layout when switching looks | Design desk checkbox | Preserve |

#### C. Links & Actions

| Feature | Component | Sub-dest |
|---|---|---|
| Emails / phones / websites (+ personal/business tags) | `DigitalCardRepeatFields` | Contact |
| Locations | Location fields + `DigitalCardLocationDrop` | Contact |
| Meetings / booking engine | `DigitalCardMeetingDesk` + drop | Booking |
| Social + messaging providers | Reach groups + `DigitalCardReachCatalog` | Social & Networks |
| Payments (MoMo, PayPal, bank, QR wallets, etc.) | `DigitalCardPayGroup` / `PayFields` | Payments |
| Other links | `DigitalCardOtherReservation` | Social & Networks |
| Privacy Public/Code/Ask + codes | `DigitalCardPrivacyDesk` | → **Settings › Privacy** (still applies to links) |
| Guest page stack/dock order | `DigitalCardReachOrderEditor` | Guest Page |
| Reach visibility preview | `applyReachVisibilityPreview` | Guest Page / Privacy |

#### D. Audience

| Feature | Component | API |
|---|---|---|
| Connections list, stages, search | `DigitalCardConnectionInbox` | `/api/digital-business-cards/[id]/connections` |
| Notes, labels, reminders | Same | PATCH connection |
| Export | Inbox | `/connections/export` |
| Automations + delivery | `DigitalCardConnectAutomations` | `/connect-automations`, preferences |
| Pipeline: New → Archived | Inbox stages | Preserve enum |

#### E. Insights

| Feature | Component | API |
|---|---|---|
| Profile views hero | Analytics panel | `/analytics` |
| Date range presets + calendar | `DigitalCardActivityRange` | Query string |
| Engagement trend chart | `DigitalCardAnalyticsChart` | `trend[]` |
| Arrive / Reach / Pass on stages | Analytics panel | Counts on payload |
| Popular, devices, notes | Analytics panel | Same |
| Recent activity + Load more + Hide/Show | Analytics panel | Cursor pagination |

#### F. Settings

| Feature | Where now | Notes |
|---|---|---|
| Privacy + access codes | Privacy desk mid-scroll | Dedicated privacy workspace |
| Published / NFC toggles | `#studio-live` | Card activation / sharing settings |
| Proximity discoverable | Share desk | Settings or Share global |
| Activation plans | `#studio-activation` | Billing / Activation |
| Subscription countdown / renew | Ribbon + `/billing` | Billing |
| Notifications / connect prefs | Automations + APIs | Settings |

#### Global (not a long section)

| Feature | Component |
|---|---|
| Save / Publish changes / Save draft | Masthead Save + autosave status |
| Share / Copy / plate attach / present / vCard | `DigitalCardShareDesk` |
| Preview modes Phone / Tablet / … | `DigitalCardStudioPreview` |
| Notices | `DigitalCardStudioNotice` |

---

## 3. Component & dependency map

```
DigitalCardStudioClient  (single form state: StudioForm)
├── useStudioAutosave → PATCH draft
├── studio-draft localStorage overlay on load
├── DigitalCardAnalyticsPanel ──→ GET analytics (+cursor)
├── Activation (inline) ──→ plans / activate APIs
├── Identity fields
│   ├── DigitalCardPortraitField ──→ avatar upload API
│   ├── DigitalCardCompanyLogoField
│   └── DigitalCardSlugField / username APIs
├── DigitalCardDesignDesk (theme + CeleCardDesign)
├── DigitalCardDesignVault ──→ designs API
├── Contact / Meeting / Location desks
├── Reach catalogs / pay / other
├── DigitalCardPrivacyDesk ──→ reach-visibility + access-codes
├── DigitalCardReachOrderEditor
├── DigitalCardConnectionInbox ──→ connections API
├── DigitalCardConnectAutomations
└── aside preview
    ├── DigitalCardStudioPreview
    │   ├── DigitalCardFace          ← plate renderer (shared)
    │   └── DigitalCardReachGrid     ← guest reach (shared)
    └── DigitalCardShareDesk ──→ share helpers / plate capture
```

**State:** Almost all identity/design/reach edits mutate one React `form` in the client. Connections, automations, analytics, access codes, vault, and avatar upload are **side APIs** (not in `baseline` JSON).  
**Implication for Studio 2.0:** Workspace shell can route destinations without splitting form state in Phase 2–3; CRM/Insights/Privacy can lazy-mount. Do **not** remount `form` per tab or unsaved edits will drop unless lifted to a persistent store/context.

---

## 4. Save-state analysis

| State | How expressed today | Gap vs Studio 2.0 brief |
|---|---|---|
| No changes | `saveStatus === null` when clean | OK; make chip always visible (“All changes published”) |
| Unsaved | “Unsaved. Save to publish.” / “Unsaved draft” | Need persistent chrome on every destination |
| Saving | “Saving draft…” (autosave) + Save button spinner | Distinguish draft autosave vs explicit Publish |
| Saved | “Draft saved” or toast `message` after Save | Explicit “Published” confirmation |
| Save failed | “Draft save failed” / `error` notice | Actionable retry in chrome |
| Published vs draft checkbox | `form.isPublished` in preview aside | Keep semantics; do not auto-publish on nav |

**Persistence paths**

1. **Explicit Save** → POST create or PATCH with publish payload (`studioPayloadFromForm(form, true)`).  
2. **Server autosave** → PATCH draft when unpublished-eligible.  
3. **Local draft** → `writeCeleYouStudioDraft` always while editing an `activeId`.  
4. **Privacy visibility** → separate PATCH on visibility change (can diverge from plate Save).  
5. **Connections / automations / vault** → immediate API; independent of plate Save.

**Risk:** Moving Privacy into Settings must keep visibility autosave and not imply plate “Published.”

---

## 5. API map (Studio-facing)

| Area | Endpoints (representative) |
|---|---|
| Card CRUD | `GET/POST /api/digital-business-cards`, `PATCH /api/digital-business-cards/[id]` |
| Avatar | `/api/digital-business-cards/avatar` |
| Slug / username | `/slug`, `/username`, `/usernames/availability` |
| Analytics | `/[id]/analytics` |
| Designs vault | `/[id]/designs` |
| Reach visibility | `/[id]/reach-visibility` |
| Access codes | `/[id]/access-codes`, `…/revoke` |
| Connections | `/[id]/connections`, `…/export` |
| Automations | `/[id]/connect-automations`, connect-preferences |
| Billing / trial / plans | `/billing`, `/trial`, `/plans`, `/activation` |
| NFC / tap | dashboard NFC routes + public `/n/[token]`, `/tap/[code]` |
| Public card | `/card/[slug]`, `/u/[username]`, OG routes |

Authorization remains session + owner checks on these routes — UI reorg must not weaken that.

---

## 6. Responsive layout today

| Breakpoint | Behavior |
|---|---|
| Mobile-first | Column desk: Identity → sticky Preview (capped height) → Work (design/contact/reach/…) |
| Jump nav | Sticky horizontal pill strip — scrolls sideways; does not unload sections |
| Desktop (`lg+`) | Multi-column desk (see `.celecard-studio-desk` media rules) with sticky preview |
| Dashboard chrome | Celeventic `main` + bottom mobile nav — CeleYou jump must not fight global nav |

**Studio 2.0 navigation proposal (choose in Phase 2 review)**

**Recommended:** **Workspace destination switcher** (segmented control / icon rail) scoped under `.celecard-studio`, **not** a second full-width bottom tab bar.

- **Mobile:** Top workspace header (status + Save + Preview) + compact destination select (My Card | Design | Links | Audience | Insights | Settings). Only active destination’s heavy tree mounts (except keep form state alive). Preview opens as full-screen sheet / route hash without discarding form.  
- **Desktop (≥1024):** Left nav (destinations) + center editor + right live preview (reuse `DigitalCardFace`). Global Save/Publish in top chrome.  
- **Deep links:** `/dashboard/business-card?desk=design|links|audience|insights|settings|card` (and keep legacy `#studio-*` redirects for one release).  
- **Share:** Persistent action in chrome (sheet), not a buried section.  
- **Avoid:** Nesting another bottom nav that duplicates Celeventic dashboard tabs.

---

## 7. Old → new destination map

| Today | Studio 2.0 |
|---|---|
| Masthead + badge + New/Save | Global chrome on all desks |
| Live-term ribbon (full) | Settings › Billing; compact status on My Card |
| Activity panel | **Insights** |
| Activation plans | **Settings › Activation / Billing** |
| Identity | **My Card** |
| Design desk + Vault | **Design** (categories: Templates, Layout, Background, Effects, Saved Looks) |
| Contact + Meeting + Location + Slug | **Links & Actions › Contact / Booking** (slug on My Card or Settings) |
| Reach social/pay/other | **Links & Actions › Social / Payments** |
| Privacy desk | **Settings › Privacy** (with link from Links) |
| Guest arrangement | **Links & Actions › Guest Page** |
| Connections inbox | **Audience › Connections** |
| Follow-up automations | **Audience › Automations** (config vs history tabs) |
| Preview + Share + Published/NFC | Global Preview + Share; publish/NFC in Settings or Share sheet |
| `/business-card/start` onboarding | Keep; align copy to Identity → Appearance → Links → Preview → Publish; never re-force published owners |

---

## 8. Regression-risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Remounting form per destination loses unsaved edits | **Critical** | Keep single `StudioForm` owner (context or shell); destinations are views |
| Autosave / publish semantics drift | **Critical** | Reuse `studioPayloadFromForm`, `useStudioAutosave`, baseline compare |
| Analytics fetch on every identity keystroke | Medium | Lazy-mount Insights only |
| Connection list performance | Medium | Keep pagination; detail drawer instead of all expanded |
| Jump-link / ribbon deep links break | Medium | Alias `#studio-activity` → Insights, etc. |
| Privacy PATCH vs plate Save confusion | Medium | Clear “Link privacy saved” vs “Card published” copy |
| Preview sheet loses scroll position | Medium | Remember desk + scroll; portal preview |
| Entitlement / trial CTAs misplaced | High | No new trial triggers; billing stays Settings |
| Bundle size | Medium | `dynamic()` already on analytics; extend to Audience/Design vault |
| Tests asserting `#studio-*` / jump order | Medium | Update digital-business-card studio tests in same PR as shell |

---

## 9. Phase plan (unchanged intent; gated)

| Phase | Deliverable | Gate |
|---|---|---|
| **1** | This audit | ✅ Complete — **await review** |
| **2** | Workspace shell: destinations, chrome (Save/Preview/Share), My Card overview, deep links | No business-logic migration |
| **3** | Move Identity / Design / Links into destinations (reuse components) | Visual QA of plate parity |
| **4** | Audience / Insights / Settings | API parity tests |
| **5** | Onboarding alignment + a11y/perf polish | Reduced-motion, focus, skeletons |
| **6** | Regression matrix + release review | **No deploy without explicit approval** |

---

## 10. Acceptance criteria (Phase 1 classification)

| Criterion | Result |
|---|---|
| Functionality inventory complete | **PASS** |
| Old→new map complete | **PASS** |
| Save-state documented | **PASS** |
| Navigation proposal documented | **PASS** |
| Regression risks listed | **PASS** |
| UI restructure implemented | **N/A** (blocked until Phase 1 review) |
| Deployed | **N/A** — must not deploy without approval |

---

## 11. Recommended next step (human gate)

1. Confirm destination names and whether **Share** is chrome-only (recommended) vs a seventh destination.  
2. Confirm deep-link query param (`?desk=`) vs path segments (`/dashboard/business-card/design`). Prefer **query/hash** first to avoid Next route explosion.  
3. Approve Phase 2 shell **without** moving Privacy/CRM yet (lowest risk proof of IA).  
4. Only then authorize Phase 3 component relocation.

---

## 12. Rollback strategy (for later phases)

- Feature flag or `?studio=classic` rendering current single-page client.  
- Keep `DigitalCardStudioClient` export stable; shell wraps rather than deletes.  
- Git revert of shell PR restores monolith; no schema migration required for Phase 2–3 if form/API untouched.
