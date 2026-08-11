# Celeventic Guide — content workflow

## Folder layout (`public/guides/`)

- `posters/` — lightweight SVG/WebP posters (safe to ship without video)
- `captions/` — WebVTT tracks (`{slug}.en.vtt`, optional `{slug}.fr.vtt`)
- `animations/` — optional Lottie/JSON motion assets (not required)

**Do not** commit placeholder MP4/WebM files. Keep `videoUrl` / voiceover URLs null until real recordings exist.

## Authoring flow

1. Add or edit an entry in `src/lib/celeventic-guide/catalog.ts` (or Admin → Guides).
2. Prefer steps + motion storyboards first; attach poster SVG under `public/guides/posters/`.
3. Add EN captions VTT when narration is ready; set `captionsFrUrl` when FR exists.
4. Voiceover: set `voiceoverEnUrl` / `voiceoverFrUrl` separately from video.
5. Seed via Admin “Seed catalog” or `seedCeleventicGuides({ forceUpdate: true })` in controlled environments.
6. Publish / schedule from `/admin/guides`. Use **New** badge + `newUntil` for launches.

## Capture Mode

`/guide/capture` is admin-only fixture tooling for future recordings. It is not public and must not claim media exists.
