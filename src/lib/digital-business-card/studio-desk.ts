/** CeleYou Studio 2.0 destinations. Form state stays owned by the studio client. */

export const STUDIO_DESK_IDS = [
  "card",
  "design",
  "links",
  "audience",
  "insights",
  "settings",
] as const;

export type StudioDeskId = (typeof STUDIO_DESK_IDS)[number];

export type StudioDeskDefinition = {
  id: StudioDeskId;
  label: string;
  shortLabel: string;
  hint: string;
};

export const STUDIO_DESKS: StudioDeskDefinition[] = [
  {
    id: "card",
    label: "My Card",
    shortLabel: "Card",
    hint: "Portrait, name, and identity",
  },
  {
    id: "design",
    label: "Design",
    shortLabel: "Design",
    hint: "Looks, layout, and vault",
  },
  {
    id: "links",
    label: "Links & Actions",
    shortLabel: "Links",
    hint: "Contact, social, pay, booking",
  },
  {
    id: "audience",
    label: "Audience",
    shortLabel: "Audience",
    hint: "Connections and follow-ups",
  },
  {
    id: "insights",
    label: "Insights",
    shortLabel: "Insights",
    hint: "Views and engagement",
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    hint: "Privacy, activation, billing",
  },
];

export const DEFAULT_STUDIO_DESK: StudioDeskId = "card";

/** Legacy in-page anchors from Studio 1.0 jump chips. */
export const STUDIO_HASH_TO_DESK: Record<string, StudioDeskId> = {
  "studio-activity": "insights",
  "studio-activation": "settings",
  "studio-identity": "card",
  "studio-look": "design",
  "studio-contact": "links",
  "studio-reach": "links",
  "studio-arrange": "links",
  "studio-inbox": "audience",
  "studio-connect": "audience",
  "studio-preview": "card",
  "studio-live": "settings",
  "celecard-design-vault": "design",
};

export function isStudioDeskId(value: string | null | undefined): value is StudioDeskId {
  return Boolean(value && (STUDIO_DESK_IDS as readonly string[]).includes(value));
}

export function parseStudioDesk(raw: string | null | undefined): StudioDeskId {
  if (isStudioDeskId(raw)) return raw;
  return DEFAULT_STUDIO_DESK;
}

/** `studio=classic` restores the single long page. `studio=1` stays the onboarding bypass. */
export function isClassicStudioMode(params: URLSearchParams | { get(name: string): string | null }): boolean {
  return params.get("studio") === "classic";
}

export function studioDeskFromHash(hash: string): StudioDeskId | null {
  const id = hash.replace(/^#/, "").split("?")[0]?.trim();
  if (!id) return null;
  return STUDIO_HASH_TO_DESK[id] ?? null;
}

export function studioDeskShows(
  desk: StudioDeskId,
  classic: boolean,
  target: StudioDeskId | "preview" | "share"
): boolean {
  if (classic) return true;
  if (target === "preview" || target === "share") {
    return desk === "card" || desk === "design" || desk === "links" || desk === "settings";
  }
  return desk === target;
}

export function readStudioDeskFromLocation(
  search = typeof window !== "undefined" ? window.location.search : "",
  hash = typeof window !== "undefined" ? window.location.hash : ""
): { classic: boolean; desk: StudioDeskId } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const classic = isClassicStudioMode(params);
  if (classic) return { classic: true, desk: DEFAULT_STUDIO_DESK };
  const fromQuery = parseStudioDesk(params.get("desk"));
  const fromHash = studioDeskFromHash(hash);
  return { classic: false, desk: fromHash ?? fromQuery };
}

export function writeStudioDeskToUrl(desk: StudioDeskId, classic = false) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (classic) {
    url.searchParams.set("studio", "classic");
    url.searchParams.delete("desk");
  } else {
    if (url.searchParams.get("studio") === "classic") url.searchParams.delete("studio");
    if (desk === DEFAULT_STUDIO_DESK) url.searchParams.delete("desk");
    else url.searchParams.set("desk", desk);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
