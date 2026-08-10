import type { GuideRole, GuideStatus } from "./types";

export interface GuideVisibilityInput {
  status: GuideStatus | string;
  adminOnly: boolean;
  /** Viewer is platform admin (ADMIN / SUPER_ADMIN). */
  viewerIsAdmin?: boolean;
  /** When true, include drafts (admin manager). */
  includeDrafts?: boolean;
  /** When true, include archived (admin manager). */
  includeArchived?: boolean;
}

/** Public surfaces must never expose admin-only or unpublished guides. */
export function isGuidePubliclyVisible(input: GuideVisibilityInput): boolean {
  if (input.adminOnly) return false;
  if (input.status === "ARCHIVED") return false;
  if (input.status !== "PUBLISHED") return false;
  return true;
}

export function canViewerAccessGuide(input: GuideVisibilityInput): boolean {
  if (input.viewerIsAdmin && (input.includeDrafts || input.includeArchived || input.adminOnly)) {
    if (input.status === "ARCHIVED" && !input.includeArchived && !input.viewerIsAdmin) return false;
    return true;
  }
  if (input.viewerIsAdmin && input.adminOnly) return true;
  if (input.viewerIsAdmin && input.status === "DRAFT" && input.includeDrafts) return true;
  if (input.viewerIsAdmin && input.status === "ARCHIVED" && input.includeArchived) return true;
  return isGuidePubliclyVisible(input);
}

export function roleFromUserRole(role: string | null | undefined): GuideRole | null {
  switch (role) {
    case "ORGANIZER":
    case "AGENCY":
    case "VENUE_OWNER":
      return "ORGANIZER";
    case "VENDOR":
      return "VENDOR";
    case "STAFF":
      return "SCANNER";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "ADMIN";
    case "GUEST":
      return "GUEST";
    default:
      return null;
  }
}

export function filterPublicGuides<T extends { status: string; adminOnly: boolean }>(guides: T[]): T[] {
  return guides.filter((g) =>
    isGuidePubliclyVisible({ status: g.status as GuideStatus, adminOnly: g.adminOnly })
  );
}
