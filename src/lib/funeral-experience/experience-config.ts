/**
 * Funeral Experience config — stored inside FuneralProfile.familyContacts
 * as `{ contacts, experience }` so we stay SQLite-safe without a hard migration.
 * Legacy array/object contacts remain readable.
 */

import type { FuneralIntroId, FuneralMotionLevel, FuneralThemeId } from "./themes";

export type DressCodeDay = {
  day: string;
  label: string;
  colors: string[];
  note?: string;
};
import { FUNERAL_THEME_BY_ID, resolveFuneralTheme } from "./themes";
import type { LifeDateFormat } from "./terminology";
import { FUNERAL_TEMPLATE_COLLECTIONS } from "@/lib/funeral/funeral-constants";
import { resolveIntroForTheme, suggestThemeFromSku } from "./experience-resolver";

export type MemorialVenueView = {
  id?: string;
  name: string;
  role?: string | null;
  town?: string | null;
  address?: string | null;
  landmark?: string | null;
  mapsLink?: string | null;
  notes?: string | null;
  phone?: string | null;
};

export type FamilyContactView = {
  name: string;
  role?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type FuneralExperienceConfig = {
  v: 1;
  aka?: string;
  honorificTitle?: string;
  relationshipLabel?: string;
  lifeDateFormat?: LifeDateFormat;
  introId?: FuneralIntroId;
  introPolicy?: "always" | "once" | "disabled";
  motionLevel?: FuneralMotionLevel;
  frameShape?: "oval" | "circle" | "rect";
  dressCode?: DressCodeDay[];
  venues?: MemorialVenueView[];
  closingLine?: string;
  farewellLine?: string;
  enableFlowerTribute?: boolean;
  showCandleCount?: boolean;
  /** Arrangements not final yet */
  announcementMode?: boolean;
  culturalPreset?: string;
};

export type ParsedFamilyContacts = {
  contacts: FamilyContactView[];
  experience: FuneralExperienceConfig;
};

const DEFAULT_EXPERIENCE: FuneralExperienceConfig = {
  v: 1,
  introPolicy: "once",
  motionLevel: "ceremonial",
  frameShape: "oval",
  lifeDateFormat: "sunrise-sunset",
  showCandleCount: true,
  enableFlowerTribute: false,
  announcementMode: false,
  dressCode: [
    { day: "Friday", label: "All Black", colors: ["black"] },
    { day: "Saturday", label: "Black & Red", colors: ["black", "red"] },
    { day: "Sunday", label: "Black & White", colors: ["black", "white"] },
  ],
};

/** Legacy theme strings → Experience theme ids */
const LEGACY_THEME_MAP: Record<string, FuneralThemeId> = {
  "midnight-ivory": "golden-legacy",
  "golden-legacy": "golden-legacy",
  "eternal-rose": "eternal-rose",
  "heavenly-peace": "heavenly-peace",
  "ghana-heritage": "ghana-heritage",
  "burgundy-honour": "burgundy-honour",
  "royal-purple": "royal-purple",
  "peaceful-garden": "peaceful-garden",
  "midnight-memorial": "midnight-memorial",
  "pure-white-farewell": "pure-white-farewell",
  "celebration-of-life": "celebration-of-life",
  "black-red-tradition": "black-red-tradition",
  "church-memorial": "church-memorial",
};

export function mapLegacyThemeToExperience(theme: string | null | undefined): FuneralThemeId {
  if (!theme) return "eternal-rose";
  const key = theme.trim().toLowerCase();
  if (key in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[key]!;
  if (key in FUNERAL_THEME_BY_ID) return key as FuneralThemeId;
  return "eternal-rose";
}

export function parseFamilyContactsBlob(raw: unknown): ParsedFamilyContacts {
  if (!raw) {
    return { contacts: [], experience: { ...DEFAULT_EXPERIENCE } };
  }

  if (Array.isArray(raw)) {
    return {
      contacts: normalizeContacts(raw),
      experience: { ...DEFAULT_EXPERIENCE },
    };
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if ("experience" in obj || "contacts" in obj) {
      const experience = {
        ...DEFAULT_EXPERIENCE,
        ...(typeof obj.experience === "object" && obj.experience
          ? (obj.experience as FuneralExperienceConfig)
          : {}),
        v: 1 as const,
      };
      return {
        contacts: normalizeContacts(obj.contacts ?? obj.familyContacts ?? []),
        experience,
      };
    }
    // Legacy single-object contact map
    if ("name" in obj || "phone" in obj) {
      return {
        contacts: normalizeContacts([obj]),
        experience: { ...DEFAULT_EXPERIENCE },
      };
    }
  }

  return { contacts: [], experience: { ...DEFAULT_EXPERIENCE } };
}

function normalizeContacts(raw: unknown): FamilyContactView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const row = c as Record<string, unknown>;
      const name = String(row.name ?? row.label ?? "").trim();
      if (!name) return null;
      return {
        name,
        role: row.role ? String(row.role) : null,
        phone: row.phone ? String(row.phone) : null,
        whatsapp: row.whatsapp ? String(row.whatsapp) : row.phone ? String(row.phone) : null,
      } satisfies FamilyContactView;
    })
    .filter(Boolean) as FamilyContactView[];
}

export function serializeFamilyContactsBlob(
  contacts: FamilyContactView[],
  experience: FuneralExperienceConfig
): { contacts: FamilyContactView[]; experience: FuneralExperienceConfig } {
  return {
    contacts,
    experience: { ...DEFAULT_EXPERIENCE, ...experience, v: 1 },
  };
}

export function resolveMemorialExperience(input: {
  theme?: string | null;
  templateSlug?: string | null;
  revealStyle?: string | null;
  familyContacts?: unknown;
}) {
  const { contacts, experience } = parseFamilyContactsBlob(input.familyContacts);

  let themeId = mapLegacyThemeToExperience(input.theme);
  if (input.templateSlug) {
    const fromCollection = FUNERAL_TEMPLATE_COLLECTIONS.find((c) => c.slug === input.templateSlug);
    if (fromCollection?.experienceTheme) {
      themeId = fromCollection.experienceTheme as FuneralThemeId;
    } else {
      themeId = suggestThemeFromSku(input.templateSlug);
    }
  }
  // Explicit experience theme stored in profile.theme wins when it is a known Experience id
  if (input.theme && input.theme in FUNERAL_THEME_BY_ID) {
    themeId = input.theme as FuneralThemeId;
  }

  const theme = resolveFuneralTheme(themeId);
  const introId = resolveIntroForTheme(themeId, input.revealStyle, experience.introId ?? null);

  return {
    contacts,
    experience,
    theme,
    themeId,
    introId,
    introPolicy: experience.introPolicy ?? "once",
    motionPreferred: experience.motionLevel ?? theme.motionDefault,
    frameShape: experience.frameShape ?? "oval",
    dressCode: experience.dressCode ?? DEFAULT_EXPERIENCE.dressCode!,
    venues: experience.venues ?? [],
  };
}

export { DEFAULT_EXPERIENCE };
