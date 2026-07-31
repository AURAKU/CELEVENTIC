import type { InvitationDesignConfig } from "@/types/invitation-design";
import { resolveFeatureThemeTokens } from "@/lib/invitation-features/adapters";
import type { SeatingRevealMode, StudioSettings } from "@/lib/seating/studio-types";

export type SeatingVisibilityReason =
  | "visible"
  | "draft_unpublished"
  | "awaiting_rsvp"
  | "awaiting_admission"
  | "awaiting_window"
  | "manual_hold"
  | "portal_only";

export function resolveSeatingTheme(design: InvitationDesignConfig) {
  const tokens = resolveFeatureThemeTokens(design);
  return {
    primary: tokens.primary,
    secondary: tokens.secondary,
    background: tokens.background,
    foreground: tokens.text,
    border: tokens.border,
    radius: tokens.radius,
    fontHeading: tokens.fontHeading,
    fontBody: tokens.fontBody,
    motion: tokens.motion,
  };
}

export function evaluateSeatingReveal(input: {
  settings: StudioSettings;
  planStatus?: "draft" | "published";
  guestStatus?: string | null;
  admittedCount?: number;
  eventStartDate?: Date | string | null;
  isPortal?: boolean;
}): { visible: boolean; reason: SeatingVisibilityReason } {
  if (input.planStatus === "draft") {
    return { visible: false, reason: "draft_unpublished" };
  }

  const mode: SeatingRevealMode = input.settings.revealMode;
  const admitted = (input.admittedCount ?? 0) > 0 || input.guestStatus === "CHECKED_IN";
  const rsvpOk = ["ACCEPTED", "MAYBE", "CHECKED_IN", "OPENED"].includes(input.guestStatus ?? "");

  switch (mode) {
    case "immediate":
      return { visible: true, reason: "visible" };
    case "after_rsvp":
      return rsvpOk
        ? { visible: true, reason: "visible" }
        : { visible: false, reason: "awaiting_rsvp" };
    case "after_admission":
      return admitted
        ? { visible: true, reason: "visible" }
        : { visible: false, reason: "awaiting_admission" };
    case "portal_only":
      return input.isPortal && admitted
        ? { visible: true, reason: "visible" }
        : { visible: false, reason: input.isPortal ? "awaiting_admission" : "portal_only" };
    case "manual":
      return { visible: false, reason: "manual_hold" };
    case "hours_before": {
      if (!input.eventStartDate) return { visible: false, reason: "awaiting_window" };
      const start = new Date(input.eventStartDate).getTime();
      const hours = input.settings.revealHoursBefore ?? 24;
      const openAt = start - hours * 60 * 60 * 1000;
      return Date.now() >= openAt
        ? { visible: true, reason: "visible" }
        : { visible: false, reason: "awaiting_window" };
    }
    default:
      return { visible: true, reason: "visible" };
  }
}

export function seatingHoldMessage(reason: SeatingVisibilityReason): string {
  switch (reason) {
    case "draft_unpublished":
      return "Your seating details will appear once the host publishes the plan.";
    case "awaiting_rsvp":
      return "Your seating details will become available after you respond to the invitation.";
    case "awaiting_admission":
      return "Your seating details will become available after your arrival is confirmed.";
    case "awaiting_window":
      return "Your seating details will be released closer to the event.";
    case "manual_hold":
      return "Your seating details will be shared by the host shortly.";
    case "portal_only":
      return "Your seating details unlock in the event companion after admission.";
    default:
      return "Your seating details will appear here soon.";
  }
}
