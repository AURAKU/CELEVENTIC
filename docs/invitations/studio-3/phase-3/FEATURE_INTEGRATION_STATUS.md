# Experience 3.0 — Feature Integration Status (Phase 3)

**Branch:** `feat/invitation-studio-3`  
**Scope:** Native `ix3-*` layouts only (not protected catalogue)

## Classification legend

| Status | Meaning |
|---|---|
| Fully functional | Wired to existing production modules with real data paths |
| Functional with limitations | Works in preview / demo; production path depends on entitlements or guest token |
| UI-only | Presentational; not connected to a live backend feature |
| Not implemented | Missing on Experience 3.0 shell |
| Not applicable | Category-inappropriate |

## Matrix — three reference experiences

| Capability | Editorial Wedding | Brand Launch | Memorial | Notes |
|---|---|---|---|---|
| Guest personalization | Functional with limitations | Functional with limitations | Functional with limitations | Uses `guestName` from invite/demo props |
| RSVP | Fully functional | Fully functional | Fully functional | Reuses `InvitationRsvpPanel` |
| Venue maps / directions | Functional with limitations | Functional with limitations | Functional with limitations | Via `InvitationActions` when venue data present |
| Calendar integration | Functional with limitations | Functional with limitations | Functional with limitations | Via `InvitationActions` |
| Countdown | Fully functional | Fully functional | Not applicable | Soft module; memorial omits celebratory countdown |
| Event schedule | UI-only / Functional with limitations | UI-only / Functional with limitations | UI-only / Functional with limitations | Essentials timeline from event fields; not LIVE_PROGRAMME |
| Dress code | Fully functional | Fully functional | Fully functional | From `event.dressCode` |
| QR admission | Functional with limitations | Functional with limitations | Functional with limitations | Shows when `qrDataUrl` provided; no new QR system |
| Guest wishes | Not implemented | Not implemented | Not implemented | Deferred to Phase 4 |
| Memory Vault | Not implemented | Not implemented | Not implemented | Deferred; reuse platform module later |
| Media gallery | Not implemented | Not implemented | Not implemented | Cover/portrait only today |
| Thank-you experience | Not implemented | Not implemented | Not implemented | Engine DNA outro exists; shell not yet rendering dedicated outro |
| Social sharing | Not implemented | Not implemented | Not implemented | Deferred to Phase 4 |
| Opening transitions | Fully functional | Fully functional | Fully functional | Skip + reduced-motion; no audio autoplay |
| Entry pass | Functional with limitations | Functional with limitations | Functional with limitations | Suppressed inline QR when `entryPass` present |

## Expanded families (Phase 3)

Heritage marriage, birthday, corporate gala, concert, graduation, and baby shower share the same shell/module stack as the references. Capability status matches the table above, with category-appropriate countdown / tone / composition differences only.

## Honesty rules applied

- Demo gallery `/invitations/experience3` uses demo guest data only.
- No duplicate RSVP, payment, QR, or guest-management systems were created.
- UI timeline beats derived from event fields are **not** claimed as LIVE_PROGRAMME.
