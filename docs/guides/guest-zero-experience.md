# Guest Zero-Experience Mode (§63)

Design target: a guest who has **never** used Celeventic, digital invitations, RSVP, QR, Event Guide, seating, Memory Vault, or Event Day.

At every major point answer:

1. What is this?
2. What should I do?
3. Why do I need it?
4. What happens after I do it?

## First-time intro

On first open of an invitation:

- Compact card: “First time using Celeventic?”
- **Show Me Around** (~30–45s motion beats) or **Skip**
- Journey: Invitation → RSVP → QR → Event Guide → Seating → Event Day → Memory Vault
- Remembered in `localStorage` key `celeventic-guide:guest-intro:{invitationId}:{guestId|anon}`
- Does not repeat after skip/complete
- Replay from Guest help on `/guide` (“Replay Show Me Around”)
- Respects `prefers-reduced-motion` (manual Next, no auto-advance)

No fake MP4s. Motion/storyboard only until real video exists (**VIDEO PRODUCTION REQUIRED**).

## Contextual chips (stay on invitation)

| Topic | Chip |
|-------|------|
| RSVP | What does RSVP mean? |
| QR | How do I use this QR code? |
| Party | Who can come with me? |
| Seating | How do I find my table? |
| Event Guide | What is Event Guide? |
| Memory | How do I share photos? |
| Event Day | What happens after I enter? |

## Guest Success Test checklist

Assume the tester has only the invitation link and no host explanation.

- [ ] 1. Open invitation
- [ ] 2. Understand who invited them
- [ ] 3. RSVP
- [ ] 4. Understand permitted party size
- [ ] 5. Find admission QR
- [ ] 6. Understand how QR will be used
- [ ] 7. Open Event Guide
- [ ] 8. View programme
- [ ] 9. Find their table/seat
- [ ] 10. View menu
- [ ] 11. Find venue information
- [ ] 12. Understand Event Day access
- [ ] 13. Upload a memory
- [ ] 14. Leave a wish

## Acceptance Q&A

| Question | Where guests find the answer |
|----------|------------------------------|
| Where is my invitation? | The original link / Open My Invitation |
| Am I attending? | RSVP section + help chip |
| Who can come with me? | Party size near RSVP |
| What do I show at the entrance? | Your Pass / Show My QR |
| What time does the event start? | Invitation date/time |
| Where am I going? | Event Location / Directions |
| Where am I sitting? | Find My Seat |
| What is being served? | View Menu / Event Guide |
| How do I share photos? | Share Photos & Videos / Memory |
| What happens after admission? | Event Day help chip |
| Where do I get help? | Need Help / Guest troubleshooting guides |

## Catalog coverage

See `GUEST_VISUAL_GUIDE_SLUGS` and `GUEST_TROUBLESHOOTING_SLUGS` in `src/lib/celeventic-guide/guest-zero-experience.ts`.
