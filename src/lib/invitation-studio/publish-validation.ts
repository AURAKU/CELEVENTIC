import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";
import { validateMusicSelection } from "@/lib/music/validate-selection";
import { heroUrlFromDesign } from "@/lib/invitation/studio-media-utils";
import {
  enabledTabsFromScenes,
  mergeScenesWithTabs,
} from "@/lib/invitation-studio/studio-scenes";
import {
  isStudioButtonActionMapped,
  STUDIO_BUTTON_ACTION_OPTIONS,
  studioButtonActionLabel,
} from "@/lib/experience-engine/action-registry";

export type PublishCheckSeverity = "error" | "warning" | "ok";

export interface PublishCheckItem {
  id: string;
  label: string;
  severity: PublishCheckSeverity;
  detail?: string;
}

export interface StudioPublishContext {
  design: InvitationDesignConfig;
  eventTitle?: string | null;
  eventDate?: string | Date | null;
  hostName?: string | null;
  galleryUrls?: string[];
  musicSelection?: MusicSelection | null;
  mapsLink?: string | null;
  venueName?: string | null;
}

/**
 * Pre-publish checklist for Invitation Studio.
 * Errors block navigation; warnings are advisory.
 */
export function buildPublishChecklist(ctx: StudioPublishContext): PublishCheckItem[] {
  const items: PublishCheckItem[] = [];
  const title = ctx.eventTitle?.trim();
  const host = ctx.hostName?.trim();
  const gallery = ctx.galleryUrls ?? [];
  const hero = heroUrlFromDesign(ctx.design);
  const experience = ctx.design.experience;
  const scenes = mergeScenesWithTabs(experience?.scenes, experience?.enabledTabs ?? DEFAULT_HUB_TABS);
  const tabs = experience?.scenes?.length
    ? enabledTabsFromScenes(scenes)
    : (experience?.enabledTabs ?? DEFAULT_HUB_TABS);
  const opening =
    experience?.openingExperience ??
    ctx.design.studio?.revealMode ??
    null;

  items.push({
    id: "title",
    label: "Event title",
    severity: title ? "ok" : "error",
    detail: title ? title : "Add an event title in Details before publishing.",
  });

  items.push({
    id: "host",
    label: "Host / couple names",
    severity: host ? "ok" : "warning",
    detail: host ? host : "Guests see the host name on the invite — worth filling in.",
  });

  items.push({
    id: "date",
    label: "Event date",
    severity: ctx.eventDate ? "ok" : "warning",
    detail: ctx.eventDate
      ? "Date set"
      : "Countdown and calendar work best with a date.",
  });

  const hasMedia = Boolean(hero) || gallery.length > 0;
  items.push({
    id: "media",
    label: "Cover or gallery photos",
    severity: hasMedia ? "ok" : "warning",
    detail: hasMedia
      ? hero
        ? "Cover media ready"
        : `${gallery.length} gallery photo${gallery.length === 1 ? "" : "s"}`
      : "Upload a cover or gallery photos for a richer invite.",
  });

  items.push({
    id: "sections",
    label: "Visible sections",
    severity: tabs.includes("invitation") ? "ok" : "error",
    detail: tabs.includes("invitation")
      ? `${tabs.length} section${tabs.length === 1 ? "" : "s"} visible`
      : "Keep at least the Hero / Invitation section visible.",
  });

  items.push({
    id: "opening",
    label: "Opening experience",
    severity: opening ? "ok" : "warning",
    detail: opening ? String(opening) : "Choose how guests open the invite.",
  });

  if (ctx.musicSelection?.url) {
    const musicErr = validateMusicSelection(ctx.musicSelection);
    items.push({
      id: "music",
      label: "Background music",
      severity: musicErr ? "error" : "ok",
      detail: musicErr ?? ctx.musicSelection.title ?? "Track ready",
    });
  } else {
    items.push({
      id: "music",
      label: "Background music",
      severity: "warning",
      detail: "Optional — library or upload makes the experience feel premium.",
    });
  }

  items.push({
    id: "template",
    label: "Template layout",
    severity: ctx.design.layout ? "ok" : "error",
    detail: ctx.design.layout ?? "Select a template layout.",
  });

  // Action Registry — every configured button slot must be a known mapped id
  const buttonActions = experience?.buttonActions;
  const slots: Array<{ key: "primary" | "secondary" | "tertiary"; value?: string }> = [
    { key: "primary", value: buttonActions?.primary ?? "rsvp" },
    { key: "secondary", value: buttonActions?.secondary ?? "calendar" },
    { key: "tertiary", value: buttonActions?.tertiary ?? "share" },
  ];
  const unmapped = slots.filter((s) => s.value && !isStudioButtonActionMapped(s.value));
  const primaryHidden = slots[0].value === "none";
  if (unmapped.length > 0) {
    items.push({
      id: "button-actions",
      label: "Button actions",
      severity: "error",
      detail: `Unmapped action(s): ${unmapped.map((u) => u.key).join(", ")}. Pick a registry action or Hidden.`,
    });
  } else if (primaryHidden) {
    items.push({
      id: "button-actions",
      label: "Button actions",
      severity: "error",
      detail: "Primary button cannot be Hidden — map it to RSVP, Save Date, or another Action Registry key.",
    });
  } else {
    const labels = slots
      .filter((s) => s.value && s.value !== "none")
      .map((s) => studioButtonActionLabel(s.value!));
    items.push({
      id: "button-actions",
      label: "Button actions",
      severity: "ok",
      detail: labels.length
        ? labels.join(" · ")
        : STUDIO_BUTTON_ACTION_OPTIONS[0].label,
    });
  }

  if (tabs.includes("venue")) {
    const hasVenue = Boolean(ctx.venueName?.trim() || ctx.mapsLink?.trim());
    items.push({
      id: "venue",
      label: "Venue / directions",
      severity: hasVenue ? "ok" : "warning",
      detail: hasVenue
        ? ctx.mapsLink
          ? "Venue section has directions"
          : "Venue name set — add a maps link for Directions"
        : "Venue section is on — add a venue name or maps link in Details.",
    });
  }

  if (tabs.includes("gallery") && gallery.length === 0 && !hero) {
    items.push({
      id: "gallery-section",
      label: "Gallery section",
      severity: "warning",
      detail: "Gallery is visible but empty — upload photos or hide the section.",
    });
  }

  return items;
}

export function publishChecklistBlocks(items: PublishCheckItem[]): boolean {
  return items.some((i) => i.severity === "error");
}

export function publishChecklistSummary(items: PublishCheckItem[]): {
  errors: number;
  warnings: number;
  ok: number;
} {
  return {
    errors: items.filter((i) => i.severity === "error").length,
    warnings: items.filter((i) => i.severity === "warning").length,
    ok: items.filter((i) => i.severity === "ok").length,
  };
}
