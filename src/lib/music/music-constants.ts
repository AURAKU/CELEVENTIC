/** Minimum clip length for invitation music (seconds) */
export const MUSIC_CLIP_MIN_SEC = 60;
/** Maximum clip length for invitation music (seconds) */
export const MUSIC_CLIP_MAX_SEC = 120;
/** Max upload file size (bytes) — full track before trim */
export const MUSIC_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

export const MUSIC_ALLOWED_TYPES: Record<string, { ext: string; max: number }> = {
  "audio/mpeg": { ext: ".mp3", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/mp3": { ext: ".mp3", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/wav": { ext: ".wav", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-wav": { ext: ".wav", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/mp4": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-m4a": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/ogg": { ext: ".ogg", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/webm": { ext: ".webm", max: MUSIC_UPLOAD_MAX_BYTES },
};

export const MUSIC_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "wedding", label: "Wedding" },
  { value: "traditional", label: "Traditional" },
  { value: "celebration", label: "Celebration" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "funeral", label: "Funeral / Memorial" },
  { value: "christian", label: "Christian" },
  { value: "muslim", label: "Muslim" },
  { value: "church", label: "Church / Program" },
  { value: "african", label: "African" },
  { value: "piano", label: "Luxury Piano" },
  { value: "jazz", label: "Jazz" },
  { value: "strings", label: "Strings" },
  { value: "violin", label: "Violin" },
  { value: "gospel", label: "Gospel" },
  { value: "afrobeats", label: "Afrobeats" },
  { value: "instrumentals", label: "Instrumentals" },
] as const;
