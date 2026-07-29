/**
 * Default wedding-side relationship labels for Guest CRM.
 * Organizer/admin only — never rendered on guest invitations or passes.
 */

export interface GuestTagPreset {
  slug: string;
  label: string;
  sortOrder: number;
}

export const WEDDING_GUEST_TAG_PRESETS: readonly GuestTagPreset[] = [
  { slug: "family-of-bride", label: "Family of bride", sortOrder: 10 },
  { slug: "family-of-groom", label: "Family of groom", sortOrder: 20 },
  { slug: "friends-of-bride", label: "Friends of bride", sortOrder: 30 },
  { slug: "friends-of-groom", label: "Friends of groom", sortOrder: 40 },
  { slug: "work-colleagues-of-bride", label: "Work colleagues of bride", sortOrder: 50 },
  { slug: "work-colleagues-of-groom", label: "Work colleagues of groom", sortOrder: 60 },
  { slug: "school-mates-of-bride", label: "School mates of bride", sortOrder: 70 },
  { slug: "school-mates-of-groom", label: "School mates of groom", sortOrder: 80 },
] as const;

/** Normalize a custom label into a stable event-scoped slug. */
export function slugifyGuestTagLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "custom-tag";
}
