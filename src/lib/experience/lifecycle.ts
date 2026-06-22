/** Temporal phase of the guest experience relative to the event date */
export type EventLifecyclePhase = "pre-event" | "event-day" | "post-event";

/** Steps shown on the lifecycle progress rail */
export type LifecycleStepId =
  | "intro"
  | "loading"
  | "reveal"
  | "journey"
  | "rsvp"
  | "seating"
  | "gallery"
  | "memory"
  | "event-day"
  | "post-event";

export interface LifecycleStep {
  id: LifecycleStepId;
  label: string;
  sectionId?: string;
}

export const LIFECYCLE_STEPS: LifecycleStep[] = [
  { id: "intro", label: "Intro" },
  { id: "loading", label: "Loading" },
  { id: "reveal", label: "Reveal" },
  { id: "journey", label: "Journey", sectionId: "welcome" },
  { id: "rsvp", label: "RSVP", sectionId: "rsvp" },
  { id: "seating", label: "Seating", sectionId: "pass" },
  { id: "gallery", label: "Gallery", sectionId: "gallery" },
  { id: "memory", label: "Memory", sectionId: "memory" },
  { id: "event-day", label: "Event Day", sectionId: "event-day" },
  { id: "post-event", label: "Memories", sectionId: "post-event" },
];

/** Portal-visible steps (after opening ceremony completes) */
export const PORTAL_LIFECYCLE_STEPS = LIFECYCLE_STEPS.filter(
  (s) => !["intro", "loading", "reveal"].includes(s.id)
);

export function resolveEventLifecycle(eventDateRaw?: string | null): EventLifecyclePhase {
  if (!eventDateRaw) return "pre-event";

  const eventStart = new Date(eventDateRaw);
  if (Number.isNaN(eventStart.getTime())) return "pre-event";

  const now = new Date();
  const dayStart = new Date(eventStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (now >= dayEnd) return "post-event";
  if (now >= dayStart) return "event-day";
  return "pre-event";
}

export function getActiveLifecycleStep(
  lifecyclePhase: EventLifecyclePhase,
  openingComplete: boolean
): LifecycleStepId {
  if (!openingComplete) return "intro";
  if (lifecyclePhase === "post-event") return "post-event";
  if (lifecyclePhase === "event-day") return "event-day";
  return "journey";
}
