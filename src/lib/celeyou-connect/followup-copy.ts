import type { CeleYouShareSnapshot } from "@/lib/celeyou-connect/snapshots";

export const CELEYOU_FOLLOWUP_DELAYS = ["IMMEDIATE", "HOUR", "DAY", "CUSTOM"] as const;
export type CeleYouFollowupDelay = (typeof CELEYOU_FOLLOWUP_DELAYS)[number];

export const CELEYOU_FOLLOWUP_MIN_CUSTOM_MINUTES = 5;
export const CELEYOU_FOLLOWUP_MAX_CUSTOM_MINUTES = 10_080;

export const DEFAULT_CELEYOU_FOLLOWUP_SUBJECT = "Great connecting with you";

export function defaultCeleYouFollowupBody(owner: Pick<CeleYouShareSnapshot, "displayName" | "profileUrl">, guestFirst: string) {
  const hello = guestFirst.trim() || "there";
  return [
    `Hello ${hello},`,
    "",
    "Thank you for connecting with me through CeleYou.",
    "",
    "It was a pleasure meeting you.",
    "",
    "You can view my digital business card and contact information anytime using the link below.",
    "",
    `Best regards,`,
    owner.displayName,
    "",
    `View my CeleYou: ${owner.profileUrl}`,
  ].join("\n");
}

export function celeYouGuestFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] || "";
  return first.slice(0, 80);
}

export function celeYouFollowupDelayMinutes(
  delay: CeleYouFollowupDelay,
  customMinutes?: number | null
): number {
  if (delay === "HOUR") return 60;
  if (delay === "DAY") return 1_440;
  if (delay === "CUSTOM") {
    const value = Number(customMinutes);
    if (!Number.isFinite(value)) return 60;
    return Math.min(
      CELEYOU_FOLLOWUP_MAX_CUSTOM_MINUTES,
      Math.max(CELEYOU_FOLLOWUP_MIN_CUSTOM_MINUTES, Math.round(value))
    );
  }
  return 0;
}

export function renderCeleYouFollowupTemplate(
  template: string,
  vars: { guestName: string; ownerName: string; profileUrl: string }
): string {
  return template
    .replaceAll("{{guestName}}", vars.guestName)
    .replaceAll("{{ownerName}}", vars.ownerName)
    .replaceAll("{{profileUrl}}", vars.profileUrl);
}
