# Celeventic Funeral Experience OS — Audit & Execution Status

**Branch:** `feature/funeral-experience-os`  
**Updated:** 2026-08-21  
**Principle:** Honour the deceased; reuse FuneralOS / invitation / Memory Vault / QR / payments. Do not deploy from this task.

## Phase 0 — Existing systems (reused)

| System | Status |
|--------|--------|
| FuneralOS Prisma models | EXISTS — profile, programme, tributes, candles, guestbook, timeline, livestream, family, media, legacy |
| `/memorial/[slug]` + `/api/memorial` | EXISTS — upgraded Experience shell |
| Invitation funeral SKUs (11) | EXISTS — catalogue + seals + memorial audio categories |
| Memory Vault | EXISTS — linked via CTA; not duplicated |
| Contributions | EXISTS — `/api/public/contribute` |
| QR / maps / RSVP (invitation) | EXISTS — shared infra; memorial hash anchors wired |
| Event Guide | PARTIAL — memorial signage only; full funeralisation still remaining |

## Implemented in Experience OS (this branch)

| Area | Status |
|------|--------|
| 12 theme token families | DONE |
| Theme CSS skins (rose / heritage / heavenly / etc.) | DONE (token + shell atmospheres) |
| Intros A–F (candle, heavenly, regal, floral, memory journey, minimal) | DONE (cinematic phases + reduced-motion) |
| Profile-driven theme / intro / motion | DONE via `theme`, `revealStyle`, `templateSlug`, experience blob |
| Experience config (AKA, title, dress, flower, announcement mode) | DONE — stored in `familyContacts.experience` (no destructive migration) |
| Portrait hero + frames + age + AKA | DONE |
| Programme timeline + day inference | DONE |
| Multi-venue cards + directions | DONE (config + burial/event fallback) |
| Dress code cards (editable in FuneralOS) | DONE |
| Calendar (Google + ICS) | DONE |
| Share (native / WhatsApp / copy / email) | DONE |
| OG / Twitter metadata | DONE on `/memorial/[slug]` |
| Memory Vault CTA | DONE |
| Symbolic flower tribute (opt-in) | DONE |
| Audio controller (opt-in, no forced autoplay) | DONE |
| Low-bandwidth detection | DONE (defers video + heavy audio) |
| Reduced motion | DONE |
| Hash anchors for QR (`#tributes`, `#memories`, `#livestream`, …) | DONE |
| API section aliases (`contribute`/`livestream`) | DONE |
| FuneralOS editor: theme, title, AKA, dress, announcement/flower | DONE |
| Terminology + cultural presets + Adinkra meanings | DONE |
| Unit tests (themes, intros, config, calendar, programme) | DONE |

## Still remaining / optional next commits

- First-class Prisma fields for multi-day programme day + venueId (currently inferred / JSON)
- Full Event Guide funeralisation
- Printable A4/A5/social render pipeline
- Dedicated social card image generator (beyond OG portrait)
- Photo-aware palette suggestions
- Playwright guest journey suite
- Marketplace funeral template moderation UI
- Funeral-specific RSVP on memorial page (invitation RSVP already adapts)
- Production deploy (explicitly out of scope for this task)

## Reference study

Studied refs in `docs/funeral-experience/refs/` (blush / heavenly / regal). Extracted hierarchy, multi-day programme, dress code, allied families, Sunrise/Sunset — rebuilt as Celeventic components without copying artwork, faces, or watermarks.

## Safe production deploy (when owner approves — do not run from this task)

```bash
# On VPS after merging to main — example only:
cd /path/to/CELEVENTIC && git pull && npm ci --include=dev \
  && npx prisma generate && npx prisma migrate deploy \
  && NODE_OPTIONS="--max-old-space-size=4096" CELEVENTIC_BUILD_COMMIT="$(git rev-parse HEAD)" npm run build \
  && pm2 restart celeventic
```

Never touch Spark & Drive. Never `prisma migrate reset` / `db push` against production.db.
