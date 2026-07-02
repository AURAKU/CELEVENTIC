import type { OpeningExperienceId } from "@/lib/experience/experience-types";

export const CANVA_CONSENT_TEXT =
  "I confirm I own this design or have permission to use it as inspiration in Celeventic.";

export const CANVA_INSPIRATION_CATEGORIES = [
  { id: "luxury-wedding", label: "Luxury Wedding", outputType: "WEDDING" as const },
  { id: "floral-wedding", label: "Floral Wedding", outputType: "WEDDING" as const },
  { id: "passport-wedding", label: "Passport Wedding", outputType: "WEDDING" as const },
  { id: "traditional-wedding", label: "Traditional Wedding", outputType: "WEDDING" as const },
  { id: "funeral-memorial", label: "Funeral Memorial", outputType: "FUNERAL_MEMORIAL" as const },
  { id: "corporate-event", label: "Corporate Event", outputType: "CORPORATE" as const },
  { id: "birthday-party", label: "Birthday Party", outputType: "BIRTHDAY" as const },
  { id: "concert", label: "Concert", outputType: "CONCERT" as const },
  { id: "conference", label: "Conference", outputType: "CORPORATE" as const },
  { id: "baby-shower", label: "Baby Shower", outputType: "INVITATION" as const },
  { id: "thank-you", label: "Thank You", outputType: "THANK_YOU" as const },
  { id: "ticket-design", label: "Ticket Design", outputType: "TICKET" as const },
  { id: "save-the-date", label: "Save The Date", outputType: "INVITATION" as const },
] as const;

export type CanvaInspirationCategoryId = (typeof CANVA_INSPIRATION_CATEGORIES)[number]["id"];

/** Safe Canva export formats — user-owned assets only */
export const CANVA_EXPORT_ACCEPT = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
} as const;

export const CANVA_REVEAL_MAP: Record<string, OpeningExperienceId> = {
  luxury: "wax-seal-gold",
  floral: "flower-bloom",
  passport: "passport",
  traditional: "envelope-kente",
  funeral: "letter-unfold",
  corporate: "film-countdown",
  birthday: "confetti-burst",
  concert: "confetti-burst",
  minimal: "none",
  cinematic: "curtain-wedding",
};

export function isCanvaShareUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "canva.com" || host.endsWith(".canva.com");
  } catch {
    return false;
  }
}

export function mapCategoryToReveal(categoryId?: string): OpeningExperienceId {
  if (!categoryId) return "envelope-classic";
  if (categoryId.includes("luxury") || categoryId.includes("passport")) return "wax-seal-gold";
  if (categoryId.includes("floral")) return "flower-bloom";
  if (categoryId.includes("funeral")) return "letter-unfold";
  if (categoryId.includes("corporate") || categoryId.includes("conference")) return "film-countdown";
  if (categoryId.includes("birthday") || categoryId.includes("concert")) return "confetti-burst";
  if (categoryId.includes("traditional")) return "envelope-kente";
  if (categoryId.includes("save-the-date")) return "letter-unfold";
  return "envelope-classic";
}

export function mapCategoryToOutputType(categoryId?: string) {
  return CANVA_INSPIRATION_CATEGORIES.find((c) => c.id === categoryId)?.outputType ?? "INVITATION";
}
