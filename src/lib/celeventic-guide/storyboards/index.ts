import { CELEVENTIC_GUIDE_CATALOG } from "../catalog";

export interface StoryboardBeat {
  id: string;
  title: string;
  narration: string;
  motionKey: string;
  durationMs: number;
  captionEn: string;
  captionFr?: string;
}

export interface GuideStoryboard {
  key: string;
  title: string;
  aspect: "9:16" | "16:9" | "1:1";
  /** Media may be null until recorded — motion beats still work. */
  videoUrl: string | null;
  posterUrl: string | null;
  captionsEnUrl: string | null;
  captionsFrUrl: string | null;
  beats: StoryboardBeat[];
  notes?: string;
}

export const HOW_CELEVENTIC_WORKS_STORYBOARD: GuideStoryboard = {
  key: "how-celeventic-works",
  title: "How Celeventic Works",
  aspect: "9:16",
  videoUrl: null,
  posterUrl: "/guides/posters/how-celeventic-works.svg",
  captionsEnUrl: "/guides/captions/how-celeventic-works.en.vtt",
  captionsFrUrl: null,
  notes: "Flagship motion tutorial. Ship interactive beats before MP4 exists.",
  beats: [
    {
      id: "invite",
      title: "Invite",
      narration: "A cinematic invitation opens the guest journey.",
      motionKey: "invite",
      durationMs: 3200,
      captionEn: "Invite — open your digital invitation",
      captionFr: "Inviter — ouvrez votre invitation numérique",
    },
    {
      id: "rsvp",
      title: "RSVP",
      narration: "Guests confirm attendance in a few taps.",
      motionKey: "rsvp",
      durationMs: 2800,
      captionEn: "RSVP — confirm your attendance",
      captionFr: "RSVP — confirmez votre présence",
    },
    {
      id: "admit",
      title: "Admit",
      narration: "QR admission makes entry fast and secure.",
      motionKey: "admit",
      durationMs: 2800,
      captionEn: "Admit — present your QR pass",
      captionFr: "Admettre — présentez votre pass QR",
    },
    {
      id: "guide",
      title: "Guide",
      narration: "Event Guide keeps programme, seating, and menu close.",
      motionKey: "guide",
      durationMs: 3000,
      captionEn: "Guide — programme, seating, and menu",
      captionFr: "Guide — programme, placement et menu",
    },
    {
      id: "celebrate",
      title: "Celebrate",
      narration: "Less friction, more celebration.",
      motionKey: "celebrate",
      durationMs: 2600,
      captionEn: "Celebrate — enjoy the day",
      captionFr: "Célébrer — profitez du jour",
    },
    {
      id: "remember",
      title: "Remember",
      narration: "Memory Vault preserves the moments that matter.",
      motionKey: "remember",
      durationMs: 3000,
      captionEn: "Remember — revisit in Memory Vault",
      captionFr: "Se souvenir — revivez dans Memory Vault",
    },
  ],
};

export const MICRO_STORYBOARDS: GuideStoryboard[] = [
  {
    key: "add-guests",
    title: "Add Guests",
    aspect: "9:16",
    videoUrl: null,
    posterUrl: "/guides/posters/add-guests.svg",
    captionsEnUrl: null,
    captionsFrUrl: null,
    beats: [
      {
        id: "open",
        title: "Open guest list",
        narration: "From your event, open Guests.",
        motionKey: "open-list",
        durationMs: 2200,
        captionEn: "Open Guests from your event",
      },
      {
        id: "add",
        title: "Add a guest",
        narration: "Enter name and details, then save.",
        motionKey: "add-row",
        durationMs: 2600,
        captionEn: "Add name, contacts, and tags",
      },
      {
        id: "invite",
        title: "Invite",
        narration: "Send the invitation when ready.",
        motionKey: "send",
        durationMs: 2200,
        captionEn: "Send invitation links",
      },
    ],
  },
  {
    key: "seating-organizer",
    title: "Seating",
    aspect: "9:16",
    videoUrl: null,
    posterUrl: "/guides/posters/seating-org.svg",
    captionsEnUrl: null,
    captionsFrUrl: null,
    beats: [
      {
        id: "tables",
        title: "Create tables",
        narration: "Define tables and capacities.",
        motionKey: "tables",
        durationMs: 2400,
        captionEn: "Create tables",
      },
      {
        id: "assign",
        title: "Assign",
        narration: "Place guests into seats.",
        motionKey: "assign",
        durationMs: 2600,
        captionEn: "Assign guests to seats",
      },
      {
        id: "publish",
        title: "Publish",
        narration: "Guests look up seats in Event Guide.",
        motionKey: "publish",
        durationMs: 2200,
        captionEn: "Publish seating to Event Guide",
      },
    ],
  },
];



function aspectForRole(role: string): GuideStoryboard["aspect"] {
  if (role === "ORGANIZER" || role === "ADMIN") return "16:9";
  if (role === "SCANNER") return "1:1";
  return "9:16";
}

/** Expand flagship beats already defined above; micros for remaining catalog slugs. */
export function storyboardFromCatalogEntry(entry: {
  slug: string;
  title: string;
  role: string;
  posterUrl?: string | null;
  captionsEnUrl?: string | null;
  captionsFrUrl?: string | null;
  steps: Array<{ title: string; body: string; motionKey?: string; durationMs?: number }>;
}): GuideStoryboard {
  return {
    key: entry.slug,
    title: entry.title,
    aspect: aspectForRole(entry.role),
    videoUrl: null,
    posterUrl: entry.posterUrl ?? null,
    captionsEnUrl: entry.captionsEnUrl ?? null,
    captionsFrUrl: entry.captionsFrUrl ?? null,
    notes: "Auto-generated micro storyboard from guide steps (no MP4 claimed).",
    beats: entry.steps.map((step, i) => ({
      id: `beat-${i + 1}`,
      title: step.title,
      narration: step.body,
      motionKey: step.motionKey || `step-${i + 1}`,
      durationMs: step.durationMs ?? 2400,
      captionEn: step.title,
    })),
  };
}

const HAND_TUNED = new Map<string, GuideStoryboard>([
  [HOW_CELEVENTIC_WORKS_STORYBOARD.key, HOW_CELEVENTIC_WORKS_STORYBOARD],
  ...MICRO_STORYBOARDS.map((s) => [s.key, s] as const),
]);

const GENERATED = new Map<string, GuideStoryboard>();

for (const entry of CELEVENTIC_GUIDE_CATALOG) {
  const key = entry.storyboardKey ?? entry.slug;
  if (HAND_TUNED.has(key) || GENERATED.has(key)) continue;
  if (entry.adminOnly) continue;
  GENERATED.set(
    key,
    storyboardFromCatalogEntry({
      slug: key,
      title: entry.title,
      role: entry.role,
      posterUrl: entry.posterUrl,
      captionsEnUrl: entry.captionsEnUrl,
      captionsFrUrl: entry.captionsFrUrl,
      steps: entry.steps,
    })
  );
}

const ALL = [...HAND_TUNED.values(), ...GENERATED.values()];

export function getStoryboard(key: string | null | undefined): GuideStoryboard | null {
  if (!key) return null;
  return HAND_TUNED.get(key) ?? GENERATED.get(key) ?? null;
}

export function listStoryboards(): GuideStoryboard[] {
  return ALL;
}

export function storyboardAspectCss(aspect: GuideStoryboard["aspect"]): string {
  if (aspect === "16:9") return "aspect-video";
  if (aspect === "1:1") return "aspect-square";
  return "aspect-[9/16]";
}
