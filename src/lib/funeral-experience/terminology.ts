/**
 * Editable Ghanaian funeral terminology — never hardcode a single tradition.
 */

export const FUNERAL_LABEL_PRESETS = {
  invitation: [
    "Funeral Invitation",
    "Funeral Announcement",
    "In Loving Memory",
    "Celebration of Life",
    "Final Funeral Rites",
  ],
  lifeDates: [
    "Sunrise — Sunset",
    "Born — Called Home",
    "Born — Transitioned",
    "Born — Called to Glory",
  ],
  programmeItems: [
    "Wake Keeping",
    "Laying in State",
    "Lying in State",
    "Burial Service",
    "Funeral Service",
    "Memorial Service",
    "Interment",
    "Final Funeral Rites",
    "Thanksgiving Service",
    "One Week Observance",
    "Family Gathering",
  ],
  relationships: [
    "Beloved Mother",
    "Beloved Father",
    "Grandmother",
    "Grandfather",
    "Sister",
    "Brother",
    "Son",
    "Daughter",
    "Husband",
    "Wife",
    "Friend",
    "Pastor",
    "Elder",
    "Mentor",
  ],
  titles: [
    "Nana",
    "Nii",
    "Naa",
    "Togbe",
    "Rev.",
    "Pastor",
    "Bishop",
    "Elder",
    "Deacon",
    "Deaconess",
    "Dr.",
    "Prof.",
    "Hon.",
    "Chief",
    "Queen Mother",
    "Esq",
  ],
} as const;

export type CulturalReligiousPreset =
  | "ghanaian-traditional"
  | "christian"
  | "catholic"
  | "presbyterian"
  | "methodist"
  | "pentecostal"
  | "charismatic"
  | "muslim"
  | "secular-celebration"
  | "contemporary"
  | "minimal"
  | "family-custom";

export const CULTURAL_RELIGIOUS_PRESETS: {
  id: CulturalReligiousPreset;
  label: string;
  suggestedTheme: string;
  allowCross?: boolean;
  allowCrescent?: boolean;
}[] = [
  { id: "ghanaian-traditional", label: "Ghanaian Traditional", suggestedTheme: "ghana-heritage" },
  { id: "christian", label: "Christian", suggestedTheme: "church-memorial", allowCross: true },
  { id: "catholic", label: "Catholic", suggestedTheme: "church-memorial", allowCross: true },
  { id: "presbyterian", label: "Presbyterian", suggestedTheme: "church-memorial", allowCross: true },
  { id: "methodist", label: "Methodist", suggestedTheme: "church-memorial", allowCross: true },
  { id: "pentecostal", label: "Pentecostal", suggestedTheme: "burgundy-honour", allowCross: true },
  { id: "charismatic", label: "Charismatic", suggestedTheme: "burgundy-honour", allowCross: true },
  { id: "muslim", label: "Muslim", suggestedTheme: "golden-legacy", allowCrescent: true },
  { id: "secular-celebration", label: "Secular Celebration of Life", suggestedTheme: "celebration-of-life" },
  { id: "contemporary", label: "Contemporary", suggestedTheme: "midnight-memorial" },
  { id: "minimal", label: "Minimal", suggestedTheme: "pure-white-farewell" },
  { id: "family-custom", label: "Family Custom", suggestedTheme: "eternal-rose" },
];

/** Tasteful Adinkra options — meaning required before use. */
export const ADINKRA_SYMBOLS = [
  {
    id: "gye-nyame",
    name: "Gye Nyame",
    meaning: "Except God — supremacy of God",
    usage: "Faith-centred memorials when the family affirms Christian or traditional devotion to God.",
  },
  {
    id: "sankofa",
    name: "Sankofa",
    meaning: "Return and fetch it — learn from the past",
    usage: "Legacy and life-story sections; never as decoration alone.",
  },
  {
    id: "dwennimmen",
    name: "Dwennimmen",
    meaning: "Ram's horns — humility and strength",
    usage: "When honouring resilience and character.",
  },
  {
    id: "fihankra",
    name: "Fihankra",
    meaning: "House / compound — security and community",
    usage: "Family announcement and gathering sections.",
  },
] as const;

export type LifeDateFormat = "years" | "full-dates" | "sunrise-sunset" | "born-called-home" | "born-transitioned";

export function formatLifeDates(opts: {
  dateOfBirth?: string | Date | null;
  dateOfPassing?: string | Date | null;
  format?: LifeDateFormat;
}): string {
  const format = opts.format ?? "sunrise-sunset";
  const birth = opts.dateOfBirth ? new Date(opts.dateOfBirth) : null;
  const passing = opts.dateOfPassing ? new Date(opts.dateOfPassing) : null;
  const y = (d: Date | null) => (d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : null);
  const full = (d: Date | null) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : null;

  const by = y(birth);
  const py = y(passing);
  const bf = full(birth);
  const pf = full(passing);

  switch (format) {
    case "years":
      return [by, py].filter(Boolean).join(" — ") || "";
    case "full-dates":
      return [bf, pf].filter(Boolean).join(" — ") || "";
    case "born-called-home":
      return by && py ? `Born ${by} — Called Home ${py}` : [bf, pf].filter(Boolean).join(" — ");
    case "born-transitioned":
      return by && py ? `Born ${by} — Transitioned ${py}` : [bf, pf].filter(Boolean).join(" — ");
    case "sunrise-sunset":
    default:
      return by && py ? `Sunrise ${by} · Sunset ${py}` : [bf, pf].filter(Boolean).join(" — ");
  }
}

export function computeAgeYears(
  dateOfBirth?: string | Date | null,
  dateOfPassing?: string | Date | null
): number | null {
  if (!dateOfBirth || !dateOfPassing) return null;
  const b = new Date(dateOfBirth);
  const p = new Date(dateOfPassing);
  if (Number.isNaN(b.getTime()) || Number.isNaN(p.getTime())) return null;
  let age = p.getFullYear() - b.getFullYear();
  const m = p.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && p.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
