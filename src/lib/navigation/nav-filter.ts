import type { AccountType } from "@prisma/client";
import type { NavSection } from "@/lib/navigation/dashboard-nav";
import { ORGANIZER_NAV, VENDOR_NAV, FUNERAL_NAV } from "@/lib/navigation/dashboard-nav";
import type { WorkspaceId } from "@/lib/navigation/dashboard-nav";

const EVENT_OWNER_HIDDEN = new Set([
  "dashboard.nav_find_organizer",
  "dashboard.nav_ai_planner",
]);

const ORGANIZATION_EXTRA = new Set([
  "dashboard.nav_organization",
  "dashboard.nav_team",
  "dashboard.nav_permissions",
]);

/** Progressive disclosure: show only sections relevant to account type and workspace. */
export function getFilteredNavSections(
  workspace: WorkspaceId,
  accountType?: AccountType | null
): NavSection[] {
  if (workspace === "vendor" || accountType === "VENDOR") return VENDOR_NAV;
  if (workspace === "funeral") return FUNERAL_NAV;

  let sections = ORGANIZER_NAV.filter((section) => section.id !== "funeralos");

  if (accountType === "EVENT_OWNER") {
    sections = sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !EVENT_OWNER_HIDDEN.has(item.labelKey)),
      }))
      .filter((section) => section.items.length > 0);
  }

  if (accountType !== "ORGANIZATION") {
    sections = sections.map((section) => {
      if (section.id !== "settings") return section;
      return {
        ...section,
        items: section.items.filter((item) => !ORGANIZATION_EXTRA.has(item.labelKey)),
      };
    });
  }

  return sections;
}
