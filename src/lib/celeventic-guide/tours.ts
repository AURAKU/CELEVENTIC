export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector preferred; falls back to centered coach mark. */
  targetSelector?: string;
}

export interface MiniTour {
  id: string;
  title: string;
  guideSlug: string;
  steps: TourStep[];
}

export const MINI_TOURS: MiniTour[] = [
  {
    id: "guest-list",
    title: "Guest List walkthrough",
    guideSlug: "add-guests",
    steps: [
      {
        id: "list",
        title: "Your guest list",
        body: "This is where every invitee lives — search, tag, and invite from here.",
        targetSelector: "[data-tour='guest-list']",
      },
      {
        id: "add",
        title: "Add guests",
        body: "Add one guest at a time, or import a CSV for bulk uploads.",
        targetSelector: "[data-tour='guest-add']",
      },
      {
        id: "invite",
        title: "Send invitations",
        body: "When your invitation is ready, send links from the list actions.",
        targetSelector: "[data-tour='guest-invite']",
      },
    ],
  },
  {
    id: "seating",
    title: "Seating walkthrough",
    guideSlug: "seating-organizer",
    steps: [
      {
        id: "plan",
        title: "Seating plan",
        body: "Create tables, set capacities, and keep VIP parties together.",
        targetSelector: "[data-tour='seating-plan']",
      },
      {
        id: "assign",
        title: "Assign seats",
        body: "Place guests manually or run smart auto seating, then adjust.",
        targetSelector: "[data-tour='seating-assign']",
      },
      {
        id: "publish",
        title: "Publish to Event Guide",
        body: "Guests look up their seat from Event Guide on the day.",
        targetSelector: "[data-tour='seating-publish']",
      },
    ],
  },
];

export function getMiniTour(id: string): MiniTour | null {
  return MINI_TOURS.find((t) => t.id === id) ?? null;
}
