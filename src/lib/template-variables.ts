import type { TemplateRenderContext } from "@/types/template-engine";

const VAR_MAP: Record<string, keyof TemplateRenderContext> = {
  "{{guest_name}}": "guest_name",
  "{{event_title}}": "event_title",
  "{{event_date}}": "event_date",
  "{{event_time}}": "event_time",
  "{{venue}}": "venue",
  "{{landmark}}": "landmark",
  "{{host_name}}": "host_name",
  "{{dress_code}}": "dress_code",
  "{{qr_code}}": "qr_code",
  "{{rsvp_link}}": "rsvp_link",
  "{{ticket_type}}": "ticket_type",
};

export function personalizeText(template: string, ctx: TemplateRenderContext): string {
  let result = template;
  for (const [token, key] of Object.entries(VAR_MAP)) {
    const value = ctx[key];
    if (value) result = result.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "gi"), value);
  }
  return result;
}

export function buildRenderContextFromEvent(event: {
  title: string;
  hostName: string;
  startDate: Date | string;
  venueName?: string | null;
  landmark?: string | null;
  dressCode?: string | null;
  mapsLink?: string | null;
}, guest?: { name?: string; qrToken?: string }, inviteLink?: string): TemplateRenderContext {
  const d = typeof event.startDate === "string" ? new Date(event.startDate) : event.startDate;
  return {
    event_title: event.title,
    host_name: event.hostName,
    event_date: d.toLocaleDateString("en-GH", { dateStyle: "full" }),
    event_time: d.toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" }),
    venue: event.venueName ?? "",
    landmark: event.landmark ?? "",
    dress_code: event.dressCode ?? "",
    guest_name: guest?.name ?? "Guest",
    qr_code: guest?.qrToken ?? "",
    rsvp_link: inviteLink ?? "",
    maps_link: event.mapsLink ?? "",
  };
}
