import { toCsv } from "./csv-safety";

/**
 * Downloadable import template.
 *
 * Headers match what `column-detect` recognises with 100% confidence, and the
 * sample rows double as documentation: they show a name-only guest (the
 * minimum), a couple, a plus-one, a family with a confirmed allowance, and a
 * seated guest — the five shapes organisers ask about most.
 */

export const TEMPLATE_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Party size",
  "Type",
  "Group",
  "Table",
  "Seat",
  "Notes",
] as const;

const SAMPLE_ROWS: string[][] = [
  ["Ama Serwaa", "", "", "", "", "", "", "", "Name only — everything else is optional"],
  ["Kofi Mensah", "kofi@example.com", "0244123456", "1", "Individual", "Groom's side", "3", "3A", ""],
  ["Mr & Mrs Boateng", "", "0201234567", "2", "Couple", "Bride's side", "1", "", ""],
  ["Yaw Owusu +1", "yaw@example.com", "", "2", "Plus one", "", "5", "", ""],
  ["The Asante Family", "", "233541234567", "6", "Family", "Family", "7", "", "Confirm allowance before sending"],
  ["Sunrise Choir", "", "", "12", "Group", "Choir", "10", "", "Group allowance must be confirmed"],
];

export function buildImportTemplateCsv(): string {
  return toCsv([[...TEMPLATE_HEADERS], ...SAMPLE_ROWS]);
}

export const TEMPLATE_FILENAME = "celeventic-guest-import-template.csv";
