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

/**
 * Parse a pasted programme outline into structured items.
 * Accepts lines like:
 * - `2:00 PM — Ceremony — Exchange of vows`
 * - `2:00 PM | Ceremony`
 * - `Ceremony at 2:00 PM`
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
    const parts = line.split(/\s*(?:—|–|-|\||•)\s*/).map((p) => p.trim()).filter(Boolean);
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

    const leadingTime = line.match(/^(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)\s+(.+)$/i);
    if (leadingTime?.[1] && leadingTime[2]) {
      return {
        id: `prog-${index + 1}-${slugFragment(leadingTime[2])}`,
        time: leadingTime[1].replace(".", ":").toUpperCase(),
        title: leadingTime[2].trim(),
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
