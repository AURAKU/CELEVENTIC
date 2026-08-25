import type { StartHereJourney } from "./types";

/** Role-aware Start Here paths on /guide (§4). */
export const START_HERE_JOURNEYS: StartHereJourney[] = [
  {
    id: "guest",
    role: "GUEST",
    title: "Guest Start Here",
    summary: "Invitation → RSVP → QR pass → Event Guide → celebrate.",
    slugs: [
      "welcome-to-celeventic",
      "open-your-invitation",
      "rsvp",
      "your-qr-admission-pass",
      "event-guide-guest",
      "how-celeventic-works",
    ],
  },
  {
    id: "organizer",
    role: "ORGANIZER",
    title: "Organizer Start Here",
    summary: "Create the event, invite guests, seat them, then go live.",
    slugs: [
      "create-an-event",
      "build-an-invitation",
      "add-guests",
      "seating-organizer",
      "event-guide-organizer",
      "qr-admission-organizer",
    ],
  },
  {
    id: "vendor",
    role: "VENDOR",
    title: "Vendor Start Here",
    summary: "Understand your pass and how door staff scan your team.",
    slugs: ["vendor-pass", "vendor-team-pass"],
  },
  {
    id: "scanner",
    role: "SCANNER",
    title: "Scanner Start Here",
    summary: "Scan guests, groups, and vendors — online or offline.",
    slugs: ["scan-guest", "scan-group", "scan-vendor", "offline-scanning"],
  },
];

export function getJourney(id: string): StartHereJourney | null {
  return START_HERE_JOURNEYS.find((j) => j.id === id) ?? null;
}

export function journeysForPreferredRole(role?: string | null): StartHereJourney[] {
  if (!role) return START_HERE_JOURNEYS;
  const preferred = START_HERE_JOURNEYS.find((j) => j.role === role);
  if (!preferred) return START_HERE_JOURNEYS;
  return [preferred, ...START_HERE_JOURNEYS.filter((j) => j.id !== preferred.id)];
}
