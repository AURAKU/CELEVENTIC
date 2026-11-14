# CeleYou Advanced Digital Card Studio

**Date:** 14 November 2026  
**Tree:** `CELEVENTIC-main`  
**Owner route:** `/dashboard/business-card`  
**Status:** Implemented in local source. Not committed. Not deployed.

This upgrade stays inside the existing CeleYou editor. It does not rebuild the public profile, payment stack, or the 14 November profile-audit remediation.

## Safety

- No production Prisma push, VPS deploy, git commit, or entitlement change.
- Prepaid catalog is unchanged (Monthly GH₵49, Quarterly GH₵129, Half-yearly GH₵239, Yearly GH₵399). Concierge GH₵800 remains separate.
- Premium theme badges stay visual. Looks are not newly locked behind a plan.
- Private links, access codes, and guest payloads still hide protected destinations server-side.
- Draft autosave never sends `isPublished`. A live guest card cannot be replaced by a local draft.
- Public profile files from the 20-issue remediation were not rewritten.

## What already existed and was reused

| Area | Existing surface |
| --- | --- |
| Live plate | `DigitalCardFace` with ID-1 ratio and QR lead |
| Design tokens | `CeleCardDesign` in `socials.design` (composition, lettering, ink, accent, grain, QR finish, paper) |
| Image pipeline | `/api/digital-business-cards/avatar` plus `ImageUploadCropper` (crop, aspect, replace, remove, Sharp WebP, AVIF ingest) |
| Privacy | Public, private, code-protected, disabled reach with hashed codes |
| Content | Identity, Reach catalog, meetings, payments, other pages, enable/hide via empty fields and visibility |
| Rollback | Design Vault versions |

No reverse card face was invented. QR placement stays `faceLead` (`photo` / `name` / `code`), not freeform x/y. Font size and weight stay house tokens (`nameScale`, `lettering`) so type cannot be set to an unreadable custom CSS size.

## What changed

### Real-time editor

- Device frames: phone, tablet, desktop.
- Portrait and landscape previews on phone and tablet.
- Card vs guest-page surface. Guest page shows the same plate plus published taps.
- Color, type, photo, logo, paper, QR lead, alignment, and layout still update locally with no request per tweak.
- Compact preview sticks under the header on phones so editing stays usable on a small screen.

### Design customization

- Switching a look can keep lettering, colors, QR lead, and paper (`keepFinish`, default on).
- Name, contacts, and logo never change with a look.
- Paper always survives a look change.
- Design Vault now stores the full `CeleCardDesign` plus portrait frame. Restore writes only `themeId` and look JSON. Identity, slug, and token stay put.

### Templates

Industry shelves wrap the existing 64 themes. No new theme IDs.

Personal, Professional, Corporate, Entrepreneur, Creator, Automotive, Real Estate, Hospitality, Events.

The library pages 12 looks at a time with Load more.

### Drafts and publishing

- Local draft in `localStorage` (`celeyou-studio-draft:{cardId}`, 14-day TTL).
- Server autosave only when the card is not published on the server.
- Explicit Save still sends `isPublished`.
- Unsaved indicator, beforeunload guard, and Publish changes when a live card has local edits.
- Restored local drafts cannot flip a live card public or private by themselves.

### Content and privacy

- Reach order now supports HTML5 drag-and-drop. Up/down buttons remain for phones.
- Privacy desk, public/private/code/disabled links, and server-side withholding are unchanged and still tested.

### Performance

- Analytics panel is dynamically imported.
- Template grid is paginated.
- Design Vault listing already pages 12.
- Visual tweaks stay on the client until draft autosave or Save.

## Acceptance

| Check | Result |
| --- | --- |
| Editing and saving | Save still PATCHes the existing card API. Name required. |
| Draft vs published | Autosave omits `isPublished`. Live cards wait for Save. |
| Image uploads | Existing cropper + Sharp pipeline. AVIF called out in picker copy. |
| Template switching | Identity preserved. Paper kept. Finish optional. |
| Privacy | Existing unit tests still pass. No public API change. |
| Long names | Existing plate fit from the profile audit remains. |
| QR readability | ID-1 preview copy and `faceLead` constraints remain. No reverse face. |
| Mobile | Sticky compact preview plus existing studio controls. |
| Existing cards | Same Prisma model and `socials` JSON. No migration. |
| `npm run test:celeyou` | **287/287 pass** (was 279; eight new studio tests). |
| Browser | Local owner studio at `http://127.0.0.1:3012/dashboard/business-card` (Kojo Mensah). Phone/Tablet/Desktop and Card/Guest page frames update the ID-1 preview live. Typing the name showed **Unsaved. Save to publish.** and **Publish changes** without a server publish. Name was restored to Kojo Mensah. Design shelves show Personal through Events plus Keep finish. |
| Playwright e2e | Not run. Chromium download is still stalled. |
| Deploy | Not done. |

## Files

- `src/lib/digital-business-card/design.ts` (`designAfterThemeChange`)
- `src/lib/digital-business-card/template-collections.ts`
- `src/lib/digital-business-card/studio-draft.ts`
- `src/lib/digital-business-card/design-vault.ts`
- `src/services/digital-business-card/design-vault.service.ts`
- `src/hooks/use-studio-autosave.ts`
- `src/components/digital-business-card/digital-card-studio-client.tsx`
- `src/components/digital-business-card/digital-card-studio-preview.tsx`
- `src/components/digital-business-card/digital-card-theme-picker.tsx`
- `src/components/digital-business-card/digital-card-design-desk.tsx`
- `src/components/digital-business-card/digital-card-reach-order.tsx`
- `src/app/globals.css`
- `src/lib/digital-business-card/__tests__/studio-advanced.test.ts`

## Out of scope on purpose

- Subscription limits and premium-template paywalls.
- A physical card back.
- Freeform QR x/y that could cover the name.
- Overwriting `docs/celeyou/PROFILE_AUDIT_REMEDIATION_2026-11-14.md` or `PROFILE_AUDIT_PRODUCTION_READINESS_2026-11-14.md`.
- Production deploy.
