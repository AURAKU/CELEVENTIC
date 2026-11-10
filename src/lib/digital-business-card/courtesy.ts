import { normalizeSocials } from "@/lib/digital-business-card/socials";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import type { DigitalCardPublicPayload, DigitalCardPresentationMode } from "@/lib/digital-business-card/types";

export const COURTESY_COPY = {
  heading: "Your connection is just one step away.",
  description:
    "This CeleYou’s full profile is temporarily unavailable. You can contact the cardholder directly or send a discreet request to let them know you’d like to connect.",
  primary: "Request to Connect",
  secondary: "Close",
  footerBrand: "Powered by CeleYou",
  footerLine: "One Identity. Infinite Connections.",
  footer: "Powered by CeleYou • One Identity. Infinite Connections.",
  confirmHeading: "Your request has been sent.",
  confirmBody:
    "We’ve let the cardholder know that someone would like to reconnect. Thank you for reaching out.",
  consent:
    "If you share a name or contact method, we use it only to tell the cardholder who asked to reconnect. You can send an anonymous request instead.",
  anonymous: "Send without contact details",
  reopen: "Request to Connect",
  suspendedHeading: "This CeleYou is unavailable.",
  suspendedBody: "This identity is not available right now.",
  draftHeading: "This CeleYou is unavailable.",
  draftBody: "This identity is not available right now.",
} as const;

const BILLING_LEAK =
  /subscription expired|payment failed|has not paid|account delinquent|renew now to view|unpaid membership|billing problem|offline until .*paid/i;

export function courtesyCopyLeaksBilling(text: string): boolean {
  return BILLING_LEAK.test(text);
}

export function courtesyGivenName(displayName: string): string {
  const token = displayName.trim().split(/\s+/).filter(Boolean)[0];
  return token || "CeleYou";
}

export function courtesyPreviewTitle(title?: string | null): string | null {
  const value = title?.trim();
  if (!value) return null;
  return value.slice(0, 80);
}

export function courtesyPreviewCompany(company?: string | null): string | null {
  const value = company?.trim();
  if (!value) return null;
  return value.slice(0, 80);
}

export function emptyCourtesyReach() {
  return normalizeSocials({});
}

export function courtesyGuestPayload(input: {
  slug: string;
  themeId?: string | null;
  displayName?: string | null;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
}): DigitalCardPublicPayload {
  return {
    id: "",
    slug: input.slug,
    publicToken: "",
    displayName: (input.displayName ?? "").trim(),
    title: courtesyPreviewTitle(input.title),
    company: courtesyPreviewCompany(input.company),
    bio: null,
    email: null,
    phone: null,
    website: null,
    socials: emptyCourtesyReach(),
    themeId: resolveDigitalCardTheme(input.themeId).id,
    avatarUrl: input.avatarUrl || null,
    pronouns: null,
    nfcEnabled: false,
    connectBackEnabled: true,
    defaultMode: "professional",
    isLive: false,
    presentationMode: "courtesy",
    guestReach: [],
  };
}

export function unavailableGuestPayload(
  slug: string,
  themeId?: string | null,
  mode: Exclude<DigitalCardPresentationMode, "live" | "courtesy"> = "unavailable"
): DigitalCardPublicPayload {
  return {
    id: "",
    slug,
    publicToken: "",
    displayName: "",
    title: null,
    company: null,
    bio: null,
    email: null,
    phone: null,
    website: null,
    socials: emptyCourtesyReach(),
    themeId: resolveDigitalCardTheme(themeId).id,
    avatarUrl: null,
    pronouns: null,
    nfcEnabled: false,
    connectBackEnabled: false,
    defaultMode: "professional",
    isLive: false,
    presentationMode: mode,
    guestReach: [],
  };
}

export function courtesyPayloadExposesPrivateReach(payload: DigitalCardPublicPayload): boolean {
  const socialKeys = Object.keys(payload.socials || {}).filter(
    (key) => key !== "stackOrder" && key !== "dockOrder"
  );
  return Boolean(
    payload.email ||
      payload.phone ||
      payload.website ||
      payload.bio ||
      payload.publicToken ||
      (payload.guestReach && payload.guestReach.length) ||
      socialKeys.length
  );
}

export function courtesyMetadataDescription(): string {
  return "This CeleYou’s full profile is temporarily unavailable.";
}
