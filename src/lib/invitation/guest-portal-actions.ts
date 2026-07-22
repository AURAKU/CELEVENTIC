import type { HubTabId } from "@/lib/experience/experience-types";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { buildDirectionsUrl, hasLocationData } from "@/lib/invitation/maps-utils";

/** Central action keys — every invitation button must map to one of these. */
export const INVITATION_ACTION_KEYS = [
  "RSVP",
  "LOCATION",
  "SAVE_DATE",
  "SHARE",
  "COPY_LINK",
  "QR_PASS",
  "SEATING",
  "MENU",
  "GALLERY",
  "MEMORY_UPLOAD",
  "CONTRIBUTION",
  "CALL",
  "WHATSAPP",
  "EMAIL",
  "REPLAY",
  "AUDIO_TOGGLE",
  "COUNTDOWN",
] as const;

export type InvitationActionKey = (typeof INVITATION_ACTION_KEYS)[number];

/**
 * Experience Engine aliases (Phase 2). Prefer importing ACTION_ALIASES from
 * `@/lib/experience-engine` for validation; these stay here for discoverability.
 * ADD_TO_CALENDAR → SAVE_DATE, FIND_SEAT → SEATING, TICKET → QR_PASS.
 */
export const GUEST_ACTION_ALIASES = {
  ADD_TO_CALENDAR: "SAVE_DATE",
  FIND_SEAT: "SEATING",
  TICKET: "QR_PASS",
} as const satisfies Record<string, InvitationActionKey>;

export type GuestActionKind = "scroll" | "href" | "handler" | "menu" | "disabled";

export interface GuestPortalActionContext {
  isPreview: boolean;
  isEmbedded: boolean;
  showRsvp: boolean;
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  seatLookupUrl?: string | null;
  seatingEnabled: boolean;
  hasQrPass: boolean;
  qrPassUrl?: string | null;
  galleryCount: number;
  memoryVaultEnabled: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  menuUrl?: string | null;
  menuBody?: string | null;
  registryUrl?: string | null;
  eventId?: string;
  calendarEvent: CalendarEventInput;
  shareTitle: string;
  shareUrl: string;
  hubTabs: HubTabId[];
  hasCalendarDate: boolean;
  audioAvailable: boolean;
  audioMuted?: boolean;
}

export interface GuestPortalActionHandlers {
  scrollTo: (sectionId: string) => void;
  share: () => void | Promise<void>;
  copyLink: () => void | Promise<void>;
  setReminder?: () => void | Promise<void>;
  replay?: () => void;
  toggleAudio?: () => void;
}

export interface ResolvedGuestAction {
  key: InvitationActionKey;
  label: string;
  sublabel?: string;
  kind: GuestActionKind;
  href?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  visible: boolean;
  sectionId?: string;
  external?: boolean;
}

export const ACTION_SECTION_IDS: Partial<Record<InvitationActionKey, string>> = {
  RSVP: "rsvp",
  LOCATION: "venue-map",
  SAVE_DATE: "save-date",
  QR_PASS: "pass",
  SEATING: "pass",
  MENU: "menu",
  GALLERY: "gallery",
  MEMORY_UPLOAD: "memory",
  CONTRIBUTION: "gifts",
  COUNTDOWN: "countdown",
};

export const ACTION_LABELS: Record<InvitationActionKey, { label: string; sub?: string }> = {
  RSVP: { label: "RSVP" },
  LOCATION: { label: "Directions" },
  SAVE_DATE: { label: "Save Date" },
  SHARE: { label: "Share" },
  COPY_LINK: { label: "Copy Link" },
  QR_PASS: { label: "QR Pass" },
  SEATING: { label: "My Seat" },
  MENU: { label: "Menu" },
  GALLERY: { label: "Gallery" },
  MEMORY_UPLOAD: { label: "Album" },
  CONTRIBUTION: { label: "Gift" },
  CALL: { label: "Call" },
  WHATSAPP: { label: "WhatsApp" },
  EMAIL: { label: "Email" },
  REPLAY: { label: "Replay" },
  AUDIO_TOGGLE: { label: "Audio" },
  COUNTDOWN: { label: "Countdown" },
};

function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const num = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${num.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
}

export function buildEmailUrl(email: string, subject: string, body?: string): string {
  const url = new URL(`mailto:${email}`);
  url.searchParams.set("subject", subject);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

export function isPreviewInvitationId(id?: string): boolean {
  if (!id) return false;
  return (
    id.startsWith("preview") ||
    id === "studio-preview" ||
    id.includes("preview-") ||
    id.startsWith("demo-") ||
    id.startsWith("sample-") ||
    id.startsWith("catalog-") ||
    id.startsWith("thumb-")
  );
}

export function resolveGuestPortalActions(
  ctx: GuestPortalActionContext,
  handlers: GuestPortalActionHandlers
): ResolvedGuestAction[] {
  const directionsUrl = buildDirectionsUrl({
    mapsLink: ctx.mapsLink,
    venueName: ctx.venueName,
    landmark: ctx.landmark,
  });
  const locationAvailable = hasLocationData({
    mapsLink: ctx.mapsLink,
    venueName: ctx.venueName,
    landmark: ctx.landmark,
  });

  const actions: ResolvedGuestAction[] = [];

  if (ctx.showRsvp && ctx.hubTabs.includes("rsvp")) {
    actions.push({
      key: "RSVP",
      ...ACTION_LABELS.RSVP,
      kind: "scroll",
      sectionId: ACTION_SECTION_IDS.RSVP,
      onClick: () => handlers.scrollTo("rsvp"),
      visible: true,
      disabled: ctx.isEmbedded && ctx.isPreview,
      disabledReason: ctx.isPreview ? "RSVP submits on the published invitation link" : undefined,
    });
  }

  if (ctx.hubTabs.includes("invitation") || ctx.hubTabs.includes("venue")) {
    actions.push({
      key: "LOCATION",
      ...ACTION_LABELS.LOCATION,
      kind: locationAvailable ? (directionsUrl ? "href" : "scroll") : "disabled",
      href: directionsUrl ?? undefined,
      external: true,
      onClick: locationAvailable
        ? directionsUrl
          ? undefined
          : () => handlers.scrollTo("venue-map")
        : undefined,
      visible: true,
      disabled: !locationAvailable,
      disabledReason: !locationAvailable ? "Location not added yet" : undefined,
      sectionId: "venue-map",
    });
  }

  if (ctx.hasCalendarDate) {
    actions.push({
      key: "SAVE_DATE",
      ...ACTION_LABELS.SAVE_DATE,
      kind: handlers.setReminder ? "handler" : "scroll",
      onClick: handlers.setReminder ?? (() => handlers.scrollTo("save-date")),
      visible: true,
      sectionId: "save-date",
    });
  }

  actions.push({
    key: "SHARE",
    ...ACTION_LABELS.SHARE,
    kind: "handler",
    onClick: handlers.share,
    visible: !ctx.isEmbedded,
  });

  actions.push({
    key: "COPY_LINK",
    ...ACTION_LABELS.COPY_LINK,
    kind: "handler",
    onClick: handlers.copyLink,
    visible: !ctx.isEmbedded,
  });

  if (ctx.hasQrPass) {
    actions.push({
      key: "QR_PASS",
      ...ACTION_LABELS.QR_PASS,
      kind: ctx.qrPassUrl ? "href" : "scroll",
      href: ctx.qrPassUrl ?? undefined,
      external: Boolean(ctx.qrPassUrl),
      onClick: () => handlers.scrollTo("pass"),
      visible: ctx.hasQrPass,
      sectionId: "pass",
    });
  }

  if (ctx.hubTabs.includes("seating")) {
    actions.push({
      key: "SEATING",
      ...ACTION_LABELS.SEATING,
      kind: ctx.seatingEnabled && ctx.seatLookupUrl ? "href" : "disabled",
      href: ctx.seatLookupUrl ?? undefined,
      external: true,
      visible: true,
      disabled: !ctx.seatingEnabled || !ctx.seatLookupUrl,
      disabledReason: !ctx.seatingEnabled
        ? "Seating not available yet"
        : !ctx.seatLookupUrl
          ? "Confirm RSVP to unlock your seat"
          : undefined,
      sectionId: "pass",
    });
  }

  if (ctx.hubTabs.includes("menu") && (ctx.menuUrl || ctx.menuBody)) {
    actions.push({
      key: "MENU",
      ...ACTION_LABELS.MENU,
      kind: ctx.menuUrl ? "href" : "scroll",
      href: ctx.menuUrl ?? undefined,
      external: Boolean(ctx.menuUrl),
      onClick: () => handlers.scrollTo("menu"),
      visible: true,
      sectionId: "menu",
    });
  }

  if (ctx.galleryCount > 0 && ctx.hubTabs.includes("gallery")) {
    actions.push({
      key: "GALLERY",
      ...ACTION_LABELS.GALLERY,
      kind: "scroll",
      onClick: () => handlers.scrollTo("gallery"),
      visible: true,
      sectionId: "gallery",
    });
  }

  if ((ctx.memoryVaultEnabled || ctx.memoryUploadUrl) && ctx.hubTabs.includes("memory")) {
    actions.push({
      key: "MEMORY_UPLOAD",
      ...ACTION_LABELS.MEMORY_UPLOAD,
      kind: ctx.memoryUploadUrl ? "href" : "scroll",
      href: ctx.memoryUploadUrl ?? undefined,
      external: false,
      onClick: () => handlers.scrollTo("memory"),
      visible: true,
      sectionId: "memory",
    });
  }

  if (ctx.hubTabs.includes("gifts") || ctx.registryUrl) {
    actions.push({
      key: "CONTRIBUTION",
      ...ACTION_LABELS.CONTRIBUTION,
      kind: ctx.registryUrl ? "href" : "scroll",
      href: ctx.registryUrl ?? undefined,
      external: Boolean(ctx.registryUrl),
      onClick: () => handlers.scrollTo("gifts"),
      visible: true,
      sectionId: "gifts",
    });
  }

  if (ctx.contactPhone) {
    actions.push({
      key: "CALL",
      ...ACTION_LABELS.CALL,
      kind: "href",
      href: `tel:${ctx.contactPhone}`,
      visible: true,
      external: true,
    });
    actions.push({
      key: "WHATSAPP",
      ...ACTION_LABELS.WHATSAPP,
      kind: "href",
      href: buildWhatsAppUrl(ctx.contactPhone, `Hi! I received your invitation for ${ctx.shareTitle}.`),
      visible: true,
      external: true,
    });
  }

  if (ctx.contactEmail) {
    actions.push({
      key: "EMAIL",
      ...ACTION_LABELS.EMAIL,
      kind: "href",
      href: buildEmailUrl(ctx.contactEmail, `Regarding: ${ctx.shareTitle}`),
      visible: true,
      external: true,
    });
  }

  if (handlers.replay) {
    actions.push({
      key: "REPLAY",
      ...ACTION_LABELS.REPLAY,
      kind: "handler",
      onClick: handlers.replay,
      visible: true,
    });
  }

  if (ctx.audioAvailable && handlers.toggleAudio) {
    actions.push({
      key: "AUDIO_TOGGLE",
      label: ctx.audioMuted ? "Unmute" : "Mute",
      sublabel: "Audio",
      kind: "handler",
      onClick: handlers.toggleAudio,
      visible: true,
    });
  }

  if (ctx.hubTabs.includes("countdown") && ctx.hasCalendarDate) {
    actions.push({
      key: "COUNTDOWN",
      ...ACTION_LABELS.COUNTDOWN,
      kind: "scroll",
      onClick: () => handlers.scrollTo("countdown"),
      visible: true,
      sectionId: "countdown",
    });
  }

  return actions.filter((a) => a.visible);
}

/** Primary quick-action keys shown in dock / chips / cinematic bar */
export const PRIMARY_QUICK_ACTION_KEYS: InvitationActionKey[] = [
  "RSVP",
  "LOCATION",
  "SAVE_DATE",
  "COUNTDOWN",
  "SEATING",
  "SHARE",
  "GALLERY",
  "QR_PASS",
];

export function pickPrimaryActions(actions: ResolvedGuestAction[]): ResolvedGuestAction[] {
  const map = new Map(actions.map((a) => [a.key, a]));
  return PRIMARY_QUICK_ACTION_KEYS.map((k) => map.get(k)).filter(Boolean) as ResolvedGuestAction[];
}
