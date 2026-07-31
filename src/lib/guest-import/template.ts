import { toCsv } from "./csv-safety";

/**
 * Downloadable import template.
 *
 * Headers are written in organiser language and still match `column-detect`
 * with high confidence. Sample rows teach the five shapes hosts ask about
 * most: name-only, seated individual, couple, plus-one, and family/group.
 */

/** Headers organisers see in Excel / Numbers / Google Sheets. */
export const TEMPLATE_HEADERS = [
  "Guest name",
  "Email",
  "Phone",
  "People admitted",
  "Invitation type",
  "Party member names",
  "Tags",
  "Group",
  "Table",
  "Seat",
  "Notes",
] as const;

/**
 * Sample rows double as documentation.
 * Leave cells blank when optional — a name alone is a valid invitation.
 */
const SAMPLE_ROWS: string[][] = [
  [
    "Ama Serwaa",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Minimum: name only — phone and email optional.",
  ],
  [
    "Kofi Mensah",
    "kofi@example.com",
    "0244123456",
    "1",
    "Individual",
    "",
    "Friends of groom",
    "Groom's side",
    "3",
    "3A",
    "Delete sample rows before uploading your list.",
  ],
  [
    "Mr & Mrs Boateng",
    "",
    "0201234567",
    "2",
    "Couple",
    "",
    "Family of bride",
    "Bride's side",
    "1",
    "",
    "Blank People admitted → auto-detect from the name.",
  ],
  [
    "Yaw Owusu",
    "yaw@example.com",
    "",
    "2",
    "Plus guest",
    "",
    "Friends of bride",
    "",
    "5",
    "",
    "People admitted = 2 means Yaw + one companion.",
  ],
  [
    "The Asante Family",
    "",
    "0541234567",
    "6",
    "Family",
    "Kwame Asante, Ama Asante, Yaa Asante",
    "Family of groom",
    "Family",
    "7",
    "",
    "Comma-separate party member names; remainder are plus-ones.",
  ],
  [
    "Sunrise Choir",
    "",
    "",
    "12",
    "Group",
    "",
    "Work colleagues of bride",
    "Choir",
    "10",
    "",
    "Tags are for organizers only — guests never see them.",
  ],
];

/** UTF-8 BOM so Excel on Windows opens Ghanaian names correctly. */
const CSV_BOM = "\uFEFF";

export function buildImportTemplateCsv(): string {
  return CSV_BOM + toCsv([[...TEMPLATE_HEADERS], ...SAMPLE_ROWS]);
}

export const TEMPLATE_FILENAME = "celeventic-guest-import-template.csv";

/** Short guide shown next to Download template in the wizard. */
export const TEMPLATE_COLUMN_GUIDE: Array<{ header: string; help: string; required?: boolean }> = [
  { header: "Guest name", help: "Required. Printed on the invitation and place card.", required: true },
  { header: "Email / Phone", help: "Optional. Used to share the invite link." },
  {
    header: "People admitted",
    help: "How many heads this invitation allows at the gate (includes plus-ones). Leave blank to auto-detect from the name.",
  },
  {
    header: "Invitation type",
    help: "Individual, Couple, Plus guest, Family, or Group — optional.",
  },
  {
    header: "Party member names",
    help: "Optional comma-separated names for people in the party besides the primary guest.",
  },
  {
    header: "Tags",
    help: "Optional CRM labels (e.g. Family of bride). Comma-separated. Guests never see these.",
  },
  { header: "Group", help: "Optional table-group / side label for planning." },
  {
    header: "Table / Seat",
    help: "Optional. Applied only when “Apply table & seat columns” is on.",
  },
  { header: "Notes", help: "Optional organiser notes." },
];
