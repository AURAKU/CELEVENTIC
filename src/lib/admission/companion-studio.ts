import type { WeddingBoardProgrammeItem } from "@/lib/invitation/wedding-board";
import type { GuestFeatureKey } from "@/lib/invitation-features/registry";

export type CompanionMenuConfig = {
  menuBody: string;
  menuUrl: string;
};

/** Guest feature keys owned by Event Companion studio (event-wide). */
export const COMPANION_STUDIO_FEATURE_KEYS = [
  "POST_ADMISSION_PORTAL",
  "SEATING_REVEAL",
  "LIVE_PROGRAMME",
  "EVENT_MENU",
  "GIFT_WALLET",
  "MEMORY_VAULT",
  "GUEST_HELP",
  "ANNOUNCEMENTS",
  "EVENT_SERVICES",
] as const satisfies readonly GuestFeatureKey[];

export type CompanionStudioFeatureKey = (typeof COMPANION_STUDIO_FEATURE_KEYS)[number];

export function readCompanionMenuConfig(raw: unknown): CompanionMenuConfig {
  const cfg =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    menuBody: typeof cfg.menuBody === "string" ? cfg.menuBody : "",
    menuUrl: typeof cfg.menuUrl === "string" ? cfg.menuUrl : "",
  };
}

/**
 * Overlay Event Companion studio keys onto a guest invitation's featureConfig
 * without clobbering place-card / entry-pass / other personalized keys.
 */
export function mergeCompanionFeatureConfig(
  target: unknown,
  companionSource: Record<string, unknown>
): Record<string, unknown> {
  const next =
    target && typeof target === "object"
      ? { ...(target as Record<string, unknown>) }
      : {};
  for (const key of COMPANION_STUDIO_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(companionSource, key)) {
      next[key] = companionSource[key];
    }
  }
  return next;
}

/** Prefer local menu config; fall back to canonical event companion source. */
export function resolveCompanionMenu(
  localConfig: unknown,
  canonicalConfig: unknown
): CompanionMenuConfig {
  const local = readCompanionMenuConfig(localConfig);
  if (local.menuBody.trim() || local.menuUrl.trim()) return local;
  return readCompanionMenuConfig(canonicalConfig);
}

/** A single clock reading: `2:00 PM`, `2pm`, `3.30pm`, `14:00`. */
const TIME_ATOM = String.raw`\d{1,2}(?:[:.]\d{2})?\s*[ap]\.?\s?m\.?|\d{1,2}[:.]\d{2}`;

/**
 * A leading time (or time range) and the rest of the line.
 *
 * The range arm exists so `1:00 PM – 2:00 PM Guest arrival` keeps both ends of
 * the range in `time` instead of reading the second one as the title.
 */
const LEADING_TIME = new RegExp(
  String.raw`^((?:${TIME_ATOM})(?:\s*(?:—|–|-|to)\s*(?:${TIME_ATOM}))?)` +
    String.raw`(?:\s*(?:—|–|\||•|:)\s*|\s*-\s*|\s+)(.+)$`,
  "i"
);

/**
 * Title/description separator.
 *
 * A bare hyphen only separates when whitespace sits on at least one side, so
 * `Father-daughter dance` and `Non-stop highlife` survive as written.
 */
const SEPARATOR = /\s*(?:—|–|\||•)\s*|\s+-\s*|\s*-\s+/;

/** `3.30pm` → `3:30 PM`, `1:00 PM-2:00 PM` → `1:00 PM – 2:00 PM`. */
function normalizeTimeLabel(value: string): string {
  return value
    .trim()
    .replace(/(\d)\s*\.\s*(\d)/g, "$1:$2")
    .replace(/(\d)\s*([ap])\.?\s?m\.?/gi, (_match, digit: string, marker: string) => {
      return `${digit} ${marker.toUpperCase()}M`;
    })
    .replace(/\s*(?:—|–|-)\s*|\s+to\s+/gi, " – ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a pasted programme outline into structured items.
 * Accepts lines like:
 * - `2:00 PM — Ceremony — Exchange of vows`
 * - `2:00 PM | Ceremony`
 * - `1:00 PM - Guest arrival`
 * - `1:00 PM – 2:00 PM Guest arrival`
 * - `Ceremony at 2:00 PM`
 * - `14:00 Ceremony`
 * - plain titles (time left blank)
 */
export function parseProgrammeOutline(text: string): WeddingBoardProgrammeItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•*-]+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .trim()
    )
    .filter(Boolean);

  return lines.map((line, index) => {
    const leading = line.match(LEADING_TIME);
    if (leading?.[1] && leading[2]) {
      const parts = leading[2].split(SEPARATOR).map((p) => p.trim()).filter(Boolean);
      const title = parts[0] ?? leading[2].trim();
      return {
        id: `prog-${index + 1}-${slugFragment(title)}`,
        time: normalizeTimeLabel(leading[1]),
        title,
        description: parts.slice(1).join(" — ") || undefined,
      };
    }

    // Times a clock regex will not own, such as `5 — Ceremony`.
    const parts = line.split(SEPARATOR).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && looksLikeTime(parts[0]!)) {
      return {
        id: `prog-${index + 1}-${slugFragment(parts[1]!)}`,
        time: parts[0]!,
        title: parts[1]!,
        description: parts.slice(2).join(" — ") || undefined,
      };
    }

    const atMatch = line.match(/^(.*?)\s+at\s+(.+)$/i);
    if (atMatch?.[1] && atMatch[2] && looksLikeTime(atMatch[2])) {
      return {
        id: `prog-${index + 1}-${slugFragment(atMatch[1])}`,
        time: atMatch[2].trim(),
        title: atMatch[1].trim(),
      };
    }

    return {
      id: `prog-${index + 1}-${slugFragment(line)}`,
      time: "",
      title: line,
    };
  });
}

export function programmeItemsToOutline(items: WeddingBoardProgrammeItem[]): string {
  return items
    .map((item) => {
      const bits = [item.time?.trim(), item.title?.trim(), item.description?.trim()].filter(Boolean);
      return bits.join(" — ");
    })
    .join("\n");
}

function looksLikeTime(value: string): boolean {
  return /^\d{1,2}([:.]?\d{2})?\s*(am|pm)?$/i.test(value.trim()) || /^\d{1,2}\s*(am|pm)$/i.test(value.trim());
}

function slugFragment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "item";
}
