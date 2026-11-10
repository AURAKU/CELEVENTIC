import {
  brandReachLabel,
  contactKindLabel,
  defaultReachSurface,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";

export const REACH_VISIBILITY = ["PUBLIC", "CODE_PROTECTED", "REQUEST_ACCESS"] as const;
export type ReachVisibility = (typeof REACH_VISIBILITY)[number];

const VISIBILITY_SET = new Set<string>(REACH_VISIBILITY);

export function normalizeReachVisibility(raw: unknown): ReachVisibility {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return VISIBILITY_SET.has(value) ? (value as ReachVisibility) : "PUBLIC";
}

export function readReachVisibilityMap(raw: unknown): Record<string, ReachVisibility> {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? ((raw as { reachVisibility?: unknown }).reachVisibility ?? raw)
      : {};
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const out: Record<string, ReachVisibility> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const id = key.trim();
    if (!id || id.length > 80) continue;
    const visibility = normalizeReachVisibility(value);
    if (visibility !== "PUBLIC") out[id] = visibility;
  }
  return out;
}

export function visibilityForItem(
  itemId: string,
  map: Record<string, ReachVisibility> | undefined
): ReachVisibility {
  return map?.[itemId] && map[itemId] !== "PUBLIC" ? map[itemId] : "PUBLIC";
}

export function lockedReachPlaceholder(
  item: DigitalCardReachItem,
  mode: ReachVisibility
): DigitalCardReachItem {
  const kind = contactKindLabel(item.kindTag);
  const brand = brandReachLabel(item.brand);
  return {
    id: item.id,
    brand: item.brand,
    title: kind ? `${kind} ${brand}` : brand,
    subtitle: mode === "CODE_PROTECTED" ? "Tap to view" : "Request access",
    href: "",
    locked: true,
    visibility: mode,
    surface: item.surface || defaultReachSurface(item.brand),
    kindTag: item.kindTag,
    linkKind: item.linkKind,
  };
}

/** Studio live preview of what guests see when details are hidden. */
export function applyReachVisibilityPreview(
  items: DigitalCardReachItem[],
  visibility: Record<string, ReachVisibility> | undefined
): DigitalCardReachItem[] {
  return items.map((item) => {
    const mode = visibilityForItem(item.id, visibility);
    return mode === "PUBLIC" ? item : lockedReachPlaceholder(item, mode);
  });
}
