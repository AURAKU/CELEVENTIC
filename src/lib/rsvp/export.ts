import { toCsv } from "@/lib/guest-import/csv-safety";

export interface RsvpExportRow {
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  plusOnes: number;
  latestResponse: string | null;
  latestMessage: string | null;
  respondedAt: string | null;
  invitationName: string | null;
}

export function buildRsvpExportCsv(rows: RsvpExportRow[]): string {
  return toCsv([
    [
      "Name",
      "Email",
      "Phone",
      "Guest status",
      "Plus ones",
      "Latest RSVP",
      "Message",
      "Responded at",
      "Invitation",
    ],
    ...rows.map((row) => [
      row.name,
      row.email,
      row.phone,
      row.status,
      row.plusOnes,
      row.latestResponse,
      row.latestMessage,
      row.respondedAt,
      row.invitationName,
    ]),
  ]);
}
