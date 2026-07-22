/** Maximum upload file size (bytes) — library masters can be larger before trim */
export const MUSIC_UPLOAD_MAX_BYTES = 40 * 1024 * 1024;

const EXT_MAP: Record<string, { mime: string; ext: string }> = {
  ".mp3": { mime: "audio/mpeg", ext: ".mp3" },
  ".mpeg": { mime: "audio/mpeg", ext: ".mp3" },
  ".wav": { mime: "audio/wav", ext: ".wav" },
  ".wave": { mime: "audio/wav", ext: ".wav" },
  ".m4a": { mime: "audio/mp4", ext: ".m4a" },
  ".mp4": { mime: "audio/mp4", ext: ".m4a" },
  ".aac": { mime: "audio/aac", ext: ".aac" },
  ".ogg": { mime: "audio/ogg", ext: ".ogg" },
  ".oga": { mime: "audio/ogg", ext: ".ogg" },
  ".opus": { mime: "audio/opus", ext: ".opus" },
  ".webm": { mime: "audio/webm", ext: ".webm" },
  ".flac": { mime: "audio/flac", ext: ".flac" },
  ".aiff": { mime: "audio/aiff", ext: ".aiff" },
  ".aif": { mime: "audio/aiff", ext: ".aiff" },
  ".wma": { mime: "audio/x-ms-wma", ext: ".wma" },
  ".mid": { mime: "audio/midi", ext: ".mid" },
  ".midi": { mime: "audio/midi", ext: ".midi" },
  ".caf": { mime: "audio/x-caf", ext: ".caf" },
  ".amr": { mime: "audio/amr", ext: ".amr" },
  ".3gp": { mime: "audio/3gpp", ext: ".3gp" },
};

export const MUSIC_ALLOWED_TYPES: Record<string, { ext: string; max: number }> = {
  "audio/mpeg": { ext: ".mp3", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/mp3": { ext: ".mp3", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/wav": { ext: ".wav", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-wav": { ext: ".wav", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/wave": { ext: ".wav", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/mp4": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-m4a": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/m4a": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/aac": { ext: ".aac", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/ogg": { ext: ".ogg", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/opus": { ext: ".opus", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/webm": { ext: ".webm", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/flac": { ext: ".flac", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/aiff": { ext: ".aiff", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-aiff": { ext: ".aiff", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-ms-wma": { ext: ".wma", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/midi": { ext: ".mid", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-midi": { ext: ".mid", max: MUSIC_UPLOAD_MAX_BYTES },
  "application/ogg": { ext: ".ogg", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/x-caf": { ext: ".caf", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/amr": { ext: ".amr", max: MUSIC_UPLOAD_MAX_BYTES },
  "audio/3gpp": { ext: ".3gp", max: MUSIC_UPLOAD_MAX_BYTES },
  "video/mp4": { ext: ".m4a", max: MUSIC_UPLOAD_MAX_BYTES },
  "video/webm": { ext: ".webm", max: MUSIC_UPLOAD_MAX_BYTES },
};

/**
 * Resolve MIME + extension. Accepts any audio/* (and common media containers)
 * so admins can upload whatever the browser can decode, then trim to WAV.
 */
export function resolveMusicUpload(file: File): { ext: string; max: number } | null {
  if (file.size <= 0) return null;
  if (file.size > MUSIC_UPLOAD_MAX_BYTES) {
    return { ext: ".bin", max: MUSIC_UPLOAD_MAX_BYTES };
  }

  const byMime = MUSIC_ALLOWED_TYPES[file.type];
  if (byMime) return byMime;

  const name = file.name?.toLowerCase() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot !== -1) {
    const extKey = name.slice(dot);
    const mapped = EXT_MAP[extKey];
    if (mapped) return { ext: mapped.ext, max: MUSIC_UPLOAD_MAX_BYTES };
    // Unknown extension but claimed as audio — keep original extension
    if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
      return { ext: extKey.slice(0, 8) || ".audio", max: MUSIC_UPLOAD_MAX_BYTES };
    }
  }

  if (file.type.startsWith("audio/") || file.type.startsWith("video/") || file.type === "") {
    return { ext: ".audio", max: MUSIC_UPLOAD_MAX_BYTES };
  }

  return null;
}

/** Organizer studio clip window (playback trim on full library tracks) */
export const MUSIC_CLIP_MIN_SEC = 30;
export const MUSIC_CLIP_MAX_SEC = 180;

/** Admin library clip — free range after trim-to-file */
export const ADMIN_CLIP_MIN_SEC = 5;
export const ADMIN_CLIP_MAX_SEC = 600;

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
