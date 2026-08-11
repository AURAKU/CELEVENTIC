# Video Production Package (§53)

> **No MP4s are claimed complete.** Interactive motion tutorials, posters, EN captions, and FR caption structures ship now. Each title below is marked **VIDEO PRODUCTION REQUIRED** until a real recording is uploaded.

Target media root: `public/guides/`  
Captions: `public/guides/captions/`  
Storyboard SVGs: `public/guides/storyboards/`  
Posters: `public/guides/posters/`  
Future MP4/WebM: `public/guides/videos/{slug}.mp4` (+ optional `.webm`, `-mobile.mp4`)

Demo fixture notes (shared):
- Use a non-production staging event with synthetic guest names (`Alex Guest`, `Jordan Plus`).
- Never show real admission codes, payment cards, private invite tokens, or guest phone numbers on camera.
- Record 9:16 vertical, 30–60 fps, soft UI chrome.
- Final captions come from WebVTT (do not hard-burn unless requested).

---

## Priority 8 titles

| # | Title | Slug | Duration | Target MP4 | Poster | Storyboard SVG | Captions EN | Captions FR | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | How Celeventic Works | `how-celeventic-works` | 45–60s | `public/guides/videos/how-celeventic-works.mp4` | `posters/how-celeventic-works.svg` | `storyboards/how-celeventic-works.svg` | `captions/how-celeventic-works.en.vtt` | `captions/how-celeventic-works.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 2 | Open Your Invitation | `open-your-invitation` | 15–30s | `public/guides/videos/open-your-invitation.mp4` | `posters/invitation.svg` | `storyboards/open-your-invitation.svg` | `captions/open-your-invitation.en.vtt` | `captions/open-your-invitation.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 3 | RSVP | `rsvp` | 15–30s | `public/guides/videos/rsvp.mp4` | `posters/rsvp.svg` | `storyboards/rsvp.svg` | `captions/rsvp.en.vtt` | `captions/rsvp.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 4 | Use Your Admission QR | `your-qr-admission-pass` | 15–30s | `public/guides/videos/your-qr-admission-pass.mp4` | `posters/qr-pass.svg` | `storyboards/your-qr-admission-pass.svg` | `captions/your-qr-admission-pass.en.vtt` | `captions/your-qr-admission-pass.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 5 | Find Your Seat | `find-your-seat` | 15–30s | `public/guides/videos/find-your-seat.mp4` | `posters/seating.svg` | `storyboards/find-your-seat.svg` | `captions/find-your-seat.en.vtt` | `captions/find-your-seat.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 6 | Use Event Guide | `event-guide-guest` | 20–40s | `public/guides/videos/event-guide-guest.mp4` | `posters/event-guide.svg` | `storyboards/event-guide-guest.svg` | `captions/event-guide-guest.en.vtt` | `captions/event-guide-guest.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 7 | Share to Memory Vault | `memory-vault-guest` | 20–40s | `public/guides/videos/memory-vault-guest.mp4` | `posters/memory.svg` | `storyboards/memory-vault-guest.svg` | `captions/memory-vault-guest.en.vtt` | `captions/memory-vault-guest.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |
| 8 | Organizer Quick Start | `organizer-quick-start` | 45–60s | `public/guides/videos/organizer-quick-start.mp4` | `posters/create-event.svg` | `storyboards/organizer-quick-start.svg` | `captions/organizer-quick-start.en.vtt` | `captions/organizer-quick-start.fr.vtt` | **VIDEO PRODUCTION REQUIRED** |

### Shared production notes

**Shot list pattern:** open product surface → primary action → success state → end card linking related guides.

**Motion spec:** Prefer UI screen recordings with subtle zooms; no fake MP4 placeholders.

**Narration / transcript:** Catalog `narrationScript` / `transcript` fields (seeded for priority titles).

**Screen-recording script:** Desktop Chrome + iPhone Safari on staging fixtures only.

**Upload checklist:** Place files under `public/guides/videos/` (or CDN). Admin edit → set `mp4Url` / `mobileVideoUrl` / `webmUrl`. `videoProductionRequired` clears when a real URL is saved. Prefer mobile-optimized source; player selects mobile first on narrow viewports.

**Analytics privacy:** Do not capture private invite URLs, admission codes, QR tokens, guest names, or payment UI details in public Guide recordings.
